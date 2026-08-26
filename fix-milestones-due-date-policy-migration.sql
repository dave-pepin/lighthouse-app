-- Run this in the Supabase SQL Editor.
-- Closes a gap found in an RLS audit: the client-facing SELECT policy on
-- milestones (add-client-portal-migration.sql) scoped correctly by
-- journey ownership but never enforced the "not visible until an agent
-- sets a due date" rule (see CLAUDE.md/loadPortalData.js) at the
-- database level — only the app's own query filter did. Matches the
-- equivalent, already-correct pattern on weekly_updates, whose client
-- policy enforces status = 'sent' in the policy itself, not just in the
-- app query.
drop policy if exists "clients can view their own milestones" on milestones;

create policy "clients can view their own milestones"
  on milestones for select
  using (
    journey_id in (select id from journeys where client_user_id = auth.uid())
    and due_date is not null
  );
