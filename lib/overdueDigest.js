// Pure logic for the overdue-milestone agent digest — no Supabase/network
// calls here, so this is directly unit-testable. See
// app/api/cron/send-overdue-digest/route.js for the thin I/O shell that
// fetches the raw rows and calls into this module.

const DIGEST_THROTTLE_HOURS = 20;

// An interval check, not a calendar-day comparison — a same-day gate would
// be a coin flip near midnight given any polling jitter, whereas a fixed
// hour window guarantees genuine once-per-day spacing regardless of where
// the UTC day boundary falls.
export function isEligibleForDigest(lastSentAt, now = new Date()) {
  if (!lastSentAt) return true;
  return now - new Date(lastSentAt) > DIGEST_THROTTLE_HOURS * 60 * 60 * 1000;
}

// due_date is a plain SQL date (no time) — treat it as UTC midnight for a
// deterministic day count.
export function daysOverdue(dueDate, now = new Date()) {
  const due = new Date(`${dueDate}T00:00:00Z`);
  return Math.floor((now - due) / 86400000);
}

// Groups overdue milestones by agent, filtering to agents who actually
// have something to report, have an email on file, and are past their
// throttle window. Returns [{ agentId, email, fullName, items: [{
// journey, milestone }] }] — everything the route needs to send emails
// and mark them sent.
export function findOverdueDigestRecipients({ journeys, overdueMilestones, agents, now = new Date() }) {
  const journeyById = Object.fromEntries((journeys || []).map((j) => [j.id, j]));

  const byAgent = {};
  for (const m of overdueMilestones || []) {
    const journey = journeyById[m.journey_id];
    if (!journey) continue;
    (byAgent[journey.agent_id] ||= []).push({ journey, milestone: m });
  }

  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));

  const recipients = [];
  for (const [agentId, items] of Object.entries(byAgent)) {
    const agent = agentById[agentId];
    if (!agent?.email) continue;
    if (!isEligibleForDigest(agent.last_overdue_digest_sent_at, now)) continue;
    recipients.push({ agentId, email: agent.email, fullName: agent.full_name, items });
  }
  return recipients;
}

// Builds the plain-text email body for one recipient, grouped by Journey.
export function buildDigestMessage(recipient, origin, now = new Date()) {
  const byJourney = {};
  for (const { journey, milestone } of recipient.items) {
    (byJourney[journey.id] ||= { journey, milestones: [] }).milestones.push(milestone);
  }

  const sections = Object.values(byJourney).map(({ journey, milestones }) => {
    const lines = milestones.map((m) => {
      const overdue = daysOverdue(m.due_date, now);
      return `  - ${m.label} — due ${m.due_date} (${overdue} day${overdue === 1 ? "" : "s"} overdue)`;
    });
    return `${journey.client_name}\n${lines.join("\n")}\n  ${origin}/journey/${journey.id}`;
  });

  const greeting = recipient.fullName ? `Hi ${recipient.fullName.split(" ")[0]},` : "Hi,";
  const count = recipient.items.length;

  return `${greeting}\n\nYou have ${count} milestone${count === 1 ? "" : "s"} that ${count === 1 ? "is" : "are"} overdue and still marked not done:\n\n${sections.join("\n\n")}\n\nMark them done once complete, or update the due date if it's changed.`;
}
