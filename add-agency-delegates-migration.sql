-- Run this in the Supabase SQL Editor (staging first, then production).
--
-- Lets an agent grant a colleague from a DIFFERENT agency time-boxed
-- access to view and partially edit their agency's Journeys (e.g.
-- covering the business while away) — without changing that colleague's
-- own agency membership. Access is read/write on milestones, documents,
-- and property photos, but deliberately read-only on weekly_updates and
-- document_requests, since creating either of those sends a client-facing
-- message (see lib/agencyAccess.js for the additional app-level guard on
-- the three actions that always send messages regardless of RLS).
create table if not exists agency_delegates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  delegate_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists agency_delegates_delegate_idx on agency_delegates (delegate_user_id);
create index if not exists agency_delegates_agency_idx on agency_delegates (agency_id);

alter table agency_delegates enable row level security;

create policy "agency members can view their agency's delegate grants"
  on agency_delegates for select
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "delegates can view their own grants"
  on agency_delegates for select
  using (delegate_user_id = auth.uid());

create policy "agency members can create delegate grants for their agency"
  on agency_delegates for insert
  with check (
    agency_id = (select agency_id from users where id = auth.uid())
    and granted_by = auth.uid()
  );

create policy "agency members can revoke their agency's delegate grants"
  on agency_delegates for delete
  using (agency_id = (select agency_id from users where id = auth.uid()));

-- Used inside the RLS policies below (and in future ones) — not
-- security definer, since the "delegates can view their own grants"
-- policy above already lets auth.uid() see the rows this needs.
create or replace function is_active_agency_delegate(target_agency_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from agency_delegates
    where agency_id = target_agency_id
      and delegate_user_id = auth.uid()
      and now() between starts_at and ends_at
  );
$$;

-- Additive policies on existing tables — alongside the existing agent
-- policies, never replacing them. agencies: just enough to show the
-- covered agency's name in the switcher/banner.
create policy "delegates can view their covered agency's name"
  on agencies for select
  using (is_active_agency_delegate(id));

-- journeys: view + edit, no create/delete.
create policy "delegates can view their covered agency's journeys"
  on journeys for select
  using (is_active_agency_delegate(agency_id));

create policy "delegates can edit their covered agency's journeys"
  on journeys for update
  using (is_active_agency_delegate(agency_id))
  with check (is_active_agency_delegate(agency_id));

-- milestones: full view/upload/edit within the covered agency's Journeys.
create policy "delegates can manage their covered agency's milestones"
  on milestones for all
  using (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)))
  with check (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)));

-- documents: same — covers upload/download/edit.
create policy "delegates can manage their covered agency's documents"
  on documents for all
  using (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)))
  with check (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)));

-- property_photos: same.
create policy "delegates can manage their covered agency's property photos"
  on property_photos for all
  using (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)))
  with check (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)));

-- weekly_updates: view-only — deliberately no insert/update policy, so
-- drafting or sending a client update is impossible at the database
-- level for a delegate, not just hidden in the UI.
create policy "delegates can view their covered agency's weekly updates"
  on weekly_updates for select
  using (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)));

-- document_requests: view-only, matching this table's existing design
-- (all writes already go through the admin client with an app-level
-- check, never RLS — see requestDocument in journey/[id]/actions.js).
create policy "delegates can view their covered agency's document requests"
  on document_requests for select
  using (journey_id in (select id from journeys where is_active_agency_delegate(agency_id)));
