// The Bridge's "weekly call made" checkbox resets every Monday at 12:00 PM
// (local time) — a call counts as this week's only if it was logged on or
// after the most recent Monday noon, so it clears itself without a cron job.
export function startOfCallWeek(now = new Date()) {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  // Monday morning before noon still belongs to last week's window.
  if (start > now) start.setDate(start.getDate() - 7);
  return start;
}

export function calledThisWeek(weeklyCallMadeAt, now = new Date()) {
  if (!weeklyCallMadeAt) return false;
  return new Date(weeklyCallMadeAt) >= startOfCallWeek(now);
}
