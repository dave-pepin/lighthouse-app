-- Run this in the Supabase SQL Editor.
-- Corrects the agent-facing SELECT policy on document_requests to match
-- the convention every other agency-scoped table actually uses
-- (documents, milestones, weekly_updates, property_photos): scope by
-- journeys.agency_id directly, not by joining through agent_id to the
-- agent's own users row. The original version (written without visibility
-- into the real dashboard-configured policies) was functionally
-- equivalent today, but this keeps document_requests consistent with the
-- rest of the schema instead of depending on an agent's agency_id always
-- matching their own journeys' agency_id.
drop policy if exists "agents can view their agency's document requests" on document_requests;

create policy "agents can view their agency's document requests"
  on document_requests for select
  using (
    journey_id in (
      select journeys.id from journeys
      where journeys.agency_id = (select users.agency_id from users where users.id = auth.uid())
    )
  );
