-- Run this in the Supabase SQL Editor to enable the client-facing portal.

-- Links a Journey to the client's own login account (set when you invite them).
alter table journeys add column if not exists client_user_id uuid references auth.users(id);

-- Clients only ever see their OWN journey and its related records — these
-- policies are intentionally separate from the agency-wide agent policies,
-- scoped strictly by client_user_id = auth.uid().

create policy "clients can view their own journey"
  on journeys for select
  using (client_user_id = auth.uid());

create policy "clients can view their own milestones"
  on milestones for select
  using (journey_id in (select id from journeys where client_user_id = auth.uid()));

create policy "clients can view their own documents"
  on documents for select
  using (journey_id in (select id from journeys where client_user_id = auth.uid()));

-- Clients only ever see updates that have actually been sent — never
-- drafts or held updates, and only the most recent one (enforced in the
-- app query, not here, since RLS can't limit rows).
create policy "clients can view their own sent updates"
  on weekly_updates for select
  using (
    journey_id in (select id from journeys where client_user_id = auth.uid())
    and status = 'sent'
  );
