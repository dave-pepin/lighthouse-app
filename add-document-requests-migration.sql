-- Run this in the Supabase SQL Editor.
-- Lets an agent ask a client for a specific document (e.g. "Proof of
-- funds") and tracks that request through to fulfillment.

create table if not exists document_requests (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys(id) on delete cascade,
  label text not null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  requested_at timestamptz not null default now(),
  requested_by uuid references users(id),
  document_id uuid references documents(id) on delete set null,
  fulfilled_at timestamptz
);

create index if not exists document_requests_journey_id_idx on document_requests (journey_id);

alter table document_requests enable row level security;

-- Same shape as every other client-facing SELECT policy (see
-- add-client-portal-migration.sql).
create policy "clients can view their own document requests"
  on document_requests for select
  using (journey_id in (select id from journeys where client_user_id = auth.uid()));

-- ASSUMPTION TO VERIFY: the agent-facing policy on documents/milestones is
-- dashboard-configured and untracked, so its exact wording is unknown. This
-- assumes agents can see every Journey in their own agency (matching the
-- documented data model), not only Journeys they personally own. If your
-- actual policy on `documents` is scoped to agent_id = auth.uid() only,
-- narrow this to match before running it.
create policy "agents can view their agency's document requests"
  on document_requests for select
  using (
    journey_id in (
      select j.id from journeys j
      join users u on u.id = j.agent_id
      where u.agency_id = (select agency_id from users where id = auth.uid())
    )
  );

-- Records who actually uploaded a document — previously always implicitly
-- "the agent." Existing rows backfill to 'agent' automatically (Postgres
-- applies a column default to pre-existing rows on ALTER TABLE), which is
-- also the semantically correct value for every one of them.
alter table documents add column if not exists uploaded_by text not null default 'agent' check (uploaded_by in ('agent', 'client'));
