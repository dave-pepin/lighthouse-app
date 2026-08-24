-- Run this in the Supabase SQL Editor.
-- Tracks when an agent last received the "overdue milestones" digest
-- email (see app/api/cron/send-overdue-digest/route.js) so the cron job
-- sends at most one digest per agent per day even if it's ever polled
-- more than once in a day.
alter table users add column if not exists last_overdue_digest_sent_at timestamptz;
