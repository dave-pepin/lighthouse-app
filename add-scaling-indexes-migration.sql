-- Run this in the Supabase SQL Editor.
-- Confirms/adds indexes on the two columns almost every dashboard query
-- and RLS check filters by. Safe to run regardless of current state —
-- IF NOT EXISTS makes this a no-op if they're already there.

create index if not exists idx_journeys_agency_id on journeys(agency_id);
create index if not exists idx_milestones_journey_id on milestones(journey_id);
