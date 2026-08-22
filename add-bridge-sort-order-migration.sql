-- Run this in the Supabase SQL Editor.
-- Lets an agent manually reorder Journeys on the Bridge instead of always
-- seeing them sorted by last activity.

alter table journeys add column if not exists bridge_sort_order integer;

-- Backfill so the manual order starts out matching today's default
-- (most recently active first), scoped per agency so agencies don't
-- share the same numbering.
with ranked as (
  select id, row_number() over (
    partition by agency_id
    order by last_activity_at desc nulls last, created_at desc
  ) as rn
  from journeys
)
update journeys set bridge_sort_order = ranked.rn
from ranked
where journeys.id = ranked.id;
