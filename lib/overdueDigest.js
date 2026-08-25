// Pure logic for the overdue-milestone agent digest — no Supabase/network
// calls here, so this is directly unit-testable. See
// app/api/cron/send-overdue-digest/route.js for the thin I/O shell that
// fetches the raw rows and calls into this module.

const DIGEST_THROTTLE_HOURS = 20;

// Matches today's pre-existing hard-coded behavior (due_date < today,
// i.e. daysOverdue >= 1) — used only if an agent row somehow lacks the
// column (e.g. a stale cached object), since the DB column itself
// defaults to 1 for every real row.
const DEFAULT_THRESHOLD_DAYS = 1;

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

// Groups due-or-overdue milestones by agent, filtering each one against
// that agent's own overdue_digest_threshold_days (null = digest off
// entirely for them), then filtering the resulting agents to those who
// actually have something to report, have an email on file, and are past
// their throttle window. Returns [{ agentId, email, fullName, items: [{
// journey, milestone }] }] — everything the route needs to send emails
// and mark them sent.
//
// candidateMilestones is broader than "overdue" — it includes anything
// due today or earlier (see the route's .lte query), since a due-today
// milestone is only eligible once an agent's threshold is 0.
export function findOverdueDigestRecipients({ journeys, candidateMilestones, agents, now = new Date() }) {
  const journeyById = Object.fromEntries((journeys || []).map((j) => [j.id, j]));
  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));

  const byAgent = {};
  for (const m of candidateMilestones || []) {
    const journey = journeyById[m.journey_id];
    if (!journey) continue;
    const agent = agentById[journey.agent_id];
    if (!agent) continue;

    const threshold =
      agent.overdue_digest_threshold_days === undefined
        ? DEFAULT_THRESHOLD_DAYS
        : agent.overdue_digest_threshold_days;
    if (threshold === null) continue; // digest off for this agent
    if (daysOverdue(m.due_date, now) < threshold) continue;

    (byAgent[journey.agent_id] ||= []).push({ journey, milestone: m });
  }

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
      const overdueLabel = overdue <= 0 ? "due today" : `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
      return `  - ${m.label} — due ${m.due_date} (${overdueLabel})`;
    });
    return `${journey.client_name}\n${lines.join("\n")}\n  ${origin}/journey/${journey.id}`;
  });

  const greeting = recipient.fullName ? `Hi ${recipient.fullName.split(" ")[0]},` : "Hi,";
  const count = recipient.items.length;

  return `${greeting}\n\nYou have ${count} milestone${count === 1 ? "" : "s"} that ${count === 1 ? "needs" : "need"} attention and ${count === 1 ? "is" : "are"} still marked not done:\n\n${sections.join("\n\n")}\n\nMark them done once complete, or update the due date if it's changed.`;
}
