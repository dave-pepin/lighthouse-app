-- Run this in the Supabase SQL Editor.
-- Lets each agent choose when they want to hear about an overdue
-- milestone: the day it's due, N days after, or never. NULL means the
-- digest is off for that agent. Default of 1 preserves every existing
-- agent's current behavior exactly (today's hard-coded due_date < today
-- cutoff is equivalent to threshold 1).
alter table users add column if not exists overdue_digest_threshold_days integer default 1
  check (overdue_digest_threshold_days is null or overdue_digest_threshold_days between 0 and 3);
