-- Run this in the Supabase SQL Editor.
-- Lets an agent keep a milestone private: it stays in their Captain's Log
-- but never shows in the client's portal, even once it has a due date.
-- Enforced in the client SELECT policy itself (same as the due-date rule
-- in fix-milestones-due-date-policy-migration.sql), not just the app query.

alter table milestones add column if not exists client_hidden boolean not null default false;

drop policy if exists "clients can view their own milestones" on milestones;

create policy "clients can view their own milestones" on milestones for select using (journey_id in (select id from journeys where client_user_id = auth.uid()) and due_date is not null and not client_hidden);
