import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailBatch, buildAgentEmail } from "@/lib/notify";
import { findMarketImpactDigestRecipients, buildMarketImpactDigestMessage } from "@/lib/marketImpactDigest";
import { runWithConcurrencyLimit } from "@/lib/concurrency";

// Same shape as send-overdue-digest's limiter — see that route for why.
const CONCURRENCY_LIMIT = 10;

// Meant to be polled once a day (a third cron-job.org job, alongside
// send-scheduled-updates and send-overdue-digest — precise timing
// doesn't matter, so no reason to poll more often). Finds every Harbor
// Journey whose closing anniversary is due, at whatever cadence
// (quarterly/semiannual/annual) each agent has chosen, and emails each
// affected agent one digest bundling everyone due. Each included
// Journey's own last_market_impact_notified_at is what prevents
// re-notifying the same anniversary again tomorrow — see
// findMarketImpactDigestRecipients.
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
    .select("id, agent_id, client_name, closed_at, last_market_impact_notified_at")
    .eq("stage", "Harbor")
    .not("closed_at", "is", null);
  if (journeysError) {
    return NextResponse.json({ error: journeysError.message }, { status: 500 });
  }

  const agentIds = [...new Set((journeys || []).map((j) => j.agent_id))];
  const { data: agents, error: agentsError } = await admin
    .from("users")
    .select("id, email, full_name, market_impact_report_frequency")
    .in("id", agentIds);
  if (agentsError) {
    return NextResponse.json({ error: agentsError.message }, { status: 500 });
  }

  const recipients = findMarketImpactDigestRecipients({ journeys, agents });

  // One batched Resend call (chunked internally) for every recipient's
  // digest — see sendEmailBatch.
  const emails = recipients.map((recipient) =>
    buildAgentEmail({
      to: recipient.email,
      subject: `${recipient.items.length} client${recipient.items.length === 1 ? "" : "s"} due for a Market Impact Report`,
      message: buildMarketImpactDigestMessage(recipient, origin),
    })
  );
  const emailResults = await sendEmailBatch(emails);

  let sent = 0;
  let failed = 0;
  const details = [];

  await runWithConcurrencyLimit(recipients, CONCURRENCY_LIMIT, async (recipient, i) => {
    const result = emailResults[i];
    if (result.ok) {
      await admin
        .from("journeys")
        .update({ last_market_impact_notified_at: new Date().toISOString() })
        .in("id", recipient.items.map((item) => item.journey.id));
      sent++;
    } else {
      failed++;
      details.push({ agentId: recipient.agentId, error: result.error });
      Sentry.captureException(new Error(result.error));
    }
  });

  return NextResponse.json({ agentsChecked: agentIds.length, eligible: recipients.length, sent, failed, details });
}
