import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWeeklyUpdate } from "@/lib/weeklyUpdateSend";
import { sendAgentEmail } from "@/lib/notify";

// Hit on a schedule by an external pinger (e.g. cron-job.org) every few
// minutes — not by Vercel's own Cron Jobs feature, since that's capped
// at once/day on the Hobby plan, too coarse for a chosen send time.
// Finds every weekly update whose scheduled_for has passed and actually
// sends it, the same way the interactive "Approve & Send" button does.
//
// This runs completely unattended — nobody's watching the response the
// way an agent watches the "Approve & Send" button for an error. So on
// any failure it (a) reverts the update to a plain draft rather than
// leaving it silently stuck "scheduled" with a past due time, (b) emails
// the affected agent directly so they know to check it, and (c) emails
// the platform owner a summary if anything in the batch failed, so a
// systemic issue (e.g. Twilio/Resend outage, an expired credential)
// doesn't go unnoticed for days.
export async function GET(request) {
  const providedSecret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: dueUpdates, error } = await admin
    .from("weekly_updates")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const details = [];

  // Best-effort — a notification failing should never mask or block the
  // actual revert-to-draft, which is what protects the agent's data.
  async function notifyAgentOfFailure(agentEmail, clientName, errorMessage) {
    if (!agentEmail) return;
    try {
      await sendAgentEmail({
        to: agentEmail,
        subject: `Your scheduled update to ${clientName} didn't go out`,
        message: `Your update for ${clientName} was scheduled to send automatically, but it failed:\n\n${errorMessage}\n\nIt's been put back in draft so nothing was lost — review it on the Journey page and try Approve & Send again when you're ready.`,
      });
    } catch {
      // Nothing more useful to do here than let the platform-owner alert
      // (sent once, after the whole batch) carry the signal instead.
    }
  }

  for (const update of dueUpdates || []) {
    const { data: journey } = await admin
      .from("journeys")
      .select("*, users:agent_id (full_name, email, sms_phone_number, reply_to_email)")
      .eq("id", update.journey_id)
      .single();

    // Client access could have been revoked (or the Journey deleted)
    // between scheduling and now — don't send into the void, and don't
    // leave this silently stuck "scheduled" with a past due time either.
    if (!journey || !journey.client_user_id) {
      await admin.from("weekly_updates").update({ status: "draft", scheduled_for: null }).eq("id", update.id);
      failed++;
      const errorMessage = "Journey or client access no longer valid";
      details.push({ id: update.id, error: errorMessage });
      Sentry.captureMessage(`Scheduled update ${update.id} failed: ${errorMessage}`, "warning");
      await notifyAgentOfFailure(journey?.users?.email, journey?.client_name || "your client", errorMessage);
      continue;
    }

    const dispatchErrors = await dispatchWeeklyUpdate(update, journey);
    if (dispatchErrors.length > 0) {
      // Revert to a plain draft rather than leaving it stuck — the agent
      // will see it's unsent next time they open the Journey and can
      // retry manually via Approve & Send.
      await admin.from("weekly_updates").update({ status: "draft", scheduled_for: null }).eq("id", update.id);
      failed++;
      const errorMessage = dispatchErrors.join(" ");
      details.push({ id: update.id, error: errorMessage });
      Sentry.captureMessage(`Scheduled update ${update.id} failed to dispatch: ${errorMessage}`, "error");
      await notifyAgentOfFailure(journey.users?.email, journey.client_name, errorMessage);
      continue;
    }

    await admin
      .from("weekly_updates")
      .update({ status: "sent", sent_via: journey.update_preference, sent_at: new Date().toISOString() })
      .eq("id", update.id);
    sent++;
  }

  if (failed > 0) {
    try {
      const { data: owner } = await admin
        .from("users")
        .select("email")
        .eq("is_platform_owner", true)
        .maybeSingle();

      if (owner?.email) {
        await sendAgentEmail({
          to: owner.email,
          subject: `[Lighthouse Alert] ${failed} scheduled update${failed === 1 ? "" : "s"} failed to send`,
          message:
            `${failed} of ${(dueUpdates || []).length} scheduled updates failed in this run and were reverted to draft.\n\n` +
            details.map((d) => `- ${d.id}: ${d.error}`).join("\n"),
        });
      }
    } catch (err) {
      // The affected agents already got their own notice above — this
      // owner-level rollup is a nice-to-have on top of that, not load-bearing.
      Sentry.captureException(err);
    }
  }

  return NextResponse.json({ checked: (dueUpdates || []).length, sent, failed, details });
}
