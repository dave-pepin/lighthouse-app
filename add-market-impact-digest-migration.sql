-- Run this in the Supabase SQL Editor.
-- Agent-configurable "Market Impact Report" digest — a recurring
-- reminder listing every closed client whose anniversary (relative to
-- their Journey's actual closing date) is due, at whatever cadence the
-- agent picks. See lib/marketImpactDigest.js.
alter table users add column if not exists market_impact_report_frequency text
  check (market_impact_report_frequency in ('quarterly', 'semiannual', 'annual'));

-- Per-Journey, not per-agent, since each Journey's own anniversary
-- schedule is independent (unlike the overdue-milestone digest's
-- per-agent throttle, this can't be bundled into one "sent today or not"
-- flag — an agent can have several Journeys due on different days).
alter table journeys add column if not exists last_market_impact_notified_at timestamptz;
