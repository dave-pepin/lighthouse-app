-- Run this in the Supabase SQL Editor.
-- Lets an agent schedule a weekly update to send at a future date/time,
-- instead of only "Approve & Send" right now. A cron-style job (see
-- app/api/cron/send-scheduled-updates/route.js) polls for rows past
-- their scheduled_for time and actually sends them.
alter table weekly_updates add column if not exists scheduled_for timestamptz;

-- The existing status check constraint only allowed 'draft' / 'held' /
-- 'sent' — widen it to include the new 'scheduled' state.
alter table weekly_updates drop constraint if exists weekly_updates_status_check;
alter table weekly_updates add constraint weekly_updates_status_check
  check (status in ('draft', 'held', 'sent', 'scheduled'));
