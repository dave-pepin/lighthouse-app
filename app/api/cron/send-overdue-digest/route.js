import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAgentEmail } from "@/lib/notify";
import { findOverdueDigestRecipients, buildDigestMessage } from "@/lib/overdueDigest";

// Meant to be polled once a day (a second cron-job.org job alongside the
// one for send-scheduled-updates — precise timing doesn't matter here,
// so there's no reason to poll every few minutes the way that one does).
// Finds every not-done milestone due today or earlier, on any non-Harbor
// Journey, and emails each affected agent one digest listing whatever
// meets their own overdue_digest_threshold_days preference (off, the day
// it's due, or 1-3 days after) — at most once per agent per day, enforced
// by users.last_overdue_digest_sent_at (see findOverdueDigestRecipients).
export async function GET(request) {
  const providedSecret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const origin = `https://${request.headers.get("host")}`;

  const { data: journeys, error: journeysError } = await admin
    .from("journeys")
    .select("id, agent_id, client_name")
    .neq("stage", "Harbor");
  if (journeysError) {
    return NextResponse.json({ error: journeysError.message }, { status: 500 });
  }

  // .lte, not .lt — a milestone due today is now a candidate too, since an
  // agent can choose to be notified starting the day it's due (threshold
  // 0). findOverdueDigestRecipients does the actual per-agent cutoff.
  const { data: candidateMilestones, error: milestonesError } = await admin
    .from("milestones")
    .select("id, journey_id, label, due_date")
    .eq("done", false)
    .not("due_date", "is", null)
    .lte("due_date", new Date().toISOString().slice(0, 10))
    .in("journey_id", (journeys || []).map((j) => j.id));
  if (milestonesError) {
    return NextResponse.json({ error: milestonesError.message }, { status: 500 });
  }

  const agentIds = [...new Set((journeys || []).map((j) => j.agent_id))];
  const { data: agents, error: agentsError } = await admin
    .from("users")
    .select("id, email, full_name, last_overdue_digest_sent_at, overdue_digest_threshold_days")
    .in("id", agentIds);
  if (agentsError) {
    return NextResponse.json({ error: agentsError.message }, { status: 500 });
  }

  const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents });

  let sent = 0;
  let failed = 0;
  const details = [];

  for (const recipient of recipients) {
    try {
      await sendAgentEmail({
        to: recipient.email,
        subject: `You have ${recipient.items.length} milestone${recipient.items.length === 1 ? "" : "s"} needing attention across your Journeys`,
        message: buildDigestMessage(recipient, origin),
      });
      await admin
        .from("users")
        .update({ last_overdue_digest_sent_at: new Date().toISOString() })
        .eq("id", recipient.agentId);
      sent++;
    } catch (err) {
      failed++;
      details.push({ agentId: recipient.agentId, error: err.message });
      Sentry.captureException(err);
    }
  }

  return NextResponse.json({ agentsChecked: agentIds.length, eligible: recipients.length, sent, failed, details });
}
