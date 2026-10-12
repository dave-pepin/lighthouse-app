-- Run this in the Supabase SQL Editor.
-- Lets an agent (or a teammate) tick off "weekly update phone call made" per
-- Journey on the Bridge. Stored as a timestamp rather than a boolean so the
-- checkbox resets itself each week — it only shows as checked when this falls
-- after the most recent Monday 12 PM (see lib/weeklyCall.js). Covered by the
-- existing journeys UPDATE policies (agency members and delegates).
--
-- weekly_call_made_by_name is a snapshot of the caller's name at tick time,
-- not a join: a delegate covering from another agency can't SELECT that
-- agency's users rows, so the name has to travel with the Journey itself.

alter table journeys add column if not exists weekly_call_made_at timestamptz;
alter table journeys add column if not exists weekly_call_made_by uuid references auth.users(id) on delete set null;
alter table journeys add column if not exists weekly_call_made_by_name text;
