// Pure logic for the Market Impact Report digest — an agent-configurable
// reminder, sent quarterly/every 6 months/annually, listing every closed
// client whose "anniversary" (relative to their own Journey's actual
// closing date) has arrived. No Supabase/network calls here, so this is
// directly unit-testable — see
// app/api/cron/send-market-impact-digest/route.js for the thin I/O shell.
//
// Deliberately anchored to journeys.closed_at (only ever set once a
// Journey reaches Harbor — see JourneyDetailClient.js), not the
// custom-milestone-based "Closing" date the Bridge's sort uses. That
// milestone workaround exists only because active Journeys never have
// closed_at set yet; a Harbor Journey always does.

const INTERVAL_MONTHS = { quarterly: 3, semiannual: 6, annual: 12 };

// "Add N months," clamped to the target month's actual last day instead
// of rolling into the month after (the naive JS Date.setMonth behavior)
// — so e.g. Jan 31 + 1 month lands on Feb 28/29, matching what people
// mean by "anniversary," not Mar 2/3.
function addMonthsClamped(date, months) {
  const targetMonthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), daysInTargetMonth);
  return new Date(Date.UTC(year, month, day));
}

// Finds the earliest not-yet-notified anniversary (closedAt plus some
// whole multiple of the frequency's interval) that has already arrived,
// or null if none is due yet. lastNotifiedAt anchors "already handled" —
// candidates on or before it are skipped — but every candidate is still
// computed from the true closedAt, so the schedule never drifts even if
// a particular send happens a few hours or days late.
export function nextDueMarketImpactDate(closedAt, frequency, lastNotifiedAt, now = new Date()) {
  const intervalMonths = INTERVAL_MONTHS[frequency];
  if (!intervalMonths || !closedAt) return null;

  const closingDate = new Date(`${closedAt}`.slice(0, 10) + "T00:00:00Z");
  const anchor = lastNotifiedAt ? new Date(lastNotifiedAt) : closingDate;

  // 400 quarters is 100 years — far more than any real Journey will ever
  // need, just a sane upper bound so this can never loop forever.
  for (let k = 1; k <= 400; k++) {
    const candidate = addMonthsClamped(closingDate, k * intervalMonths);
    if (candidate <= anchor) continue;
    if (candidate > now) return null;
    return candidate;
  }
  return null;
}

// Groups due Market Impact Reports by agent, based on each agent's own
// market_impact_report_frequency (null = off entirely). Returns
// [{ agentId, email, fullName, items: [{ journey, dueDate }] }].
export function findMarketImpactDigestRecipients({ journeys, agents, now = new Date() }) {
  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));

  const byAgent = {};
  for (const journey of journeys || []) {
    if (!journey.closed_at) continue;
    const agent = agentById[journey.agent_id];
    if (!agent) continue;
    if (!agent.market_impact_report_frequency) continue;

    const dueDate = nextDueMarketImpactDate(
      journey.closed_at,
      agent.market_impact_report_frequency,
      journey.last_market_impact_notified_at,
      now
    );
    if (!dueDate) continue;

    (byAgent[journey.agent_id] ||= []).push({ journey, dueDate });
  }

  const recipients = [];
  for (const [agentId, items] of Object.entries(byAgent)) {
    const agent = agentById[agentId];
    if (!agent?.email) continue;
    recipients.push({ agentId, email: agent.email, fullName: agent.full_name, items });
  }
  return recipients;
}

// Builds the plain-text email body for one recipient.
export function buildMarketImpactDigestMessage(recipient, origin) {
  const lines = recipient.items.map(
    ({ journey }) => `  - ${journey.client_name} — closed ${journey.closed_at}\n    ${origin}/journey/${journey.id}`
  );

  const greeting = recipient.fullName ? `Hi ${recipient.fullName.split(" ")[0]},` : "Hi,";
  const count = recipient.items.length;
  const isAre = count === 1 ? "is" : "are";
  const clientWord = count === 1 ? "client" : "clients";

  return `${greeting}\n\n${count} ${clientWord} ${isAre} due for a Market Impact Report:\n\n${lines.join(
    "\n\n"
  )}\n\nA great time to reach out with an update on their home's value and the local market.`;
}
