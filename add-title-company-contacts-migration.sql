-- Run this in the Supabase SQL Editor.
-- Lets an agent optionally give a title/escrow company its own portal login,
-- scoped to uploading/downloading documents on one Journey only — no
-- milestones, updates, or anything else. Up to two per Journey (split
-- closings in this market often have a buyer's-side and seller's-side title
-- company). Each contact is invited independently and explicitly by the
-- agent — never automatically — same "opt-in, not automatic" rule as the
-- client invite (see CLAUDE.md).
--
-- Kept deliberately flat (short single-line statements, no quoted policy
-- names) after repeated copy/paste corruption when running earlier drafts
-- of this file through the SQL Editor.

create table title_company_contacts (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys(id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  user_id uuid references auth.users(id),
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create index title_company_contacts_journey_id_idx on title_company_contacts (journey_id);

alter table title_company_contacts enable row level security;

create policy agents_select_title_company_contacts on title_company_contacts for select using (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid()) or is_active_agency_delegate(agency_id)));

create policy agents_insert_title_company_contacts on title_company_contacts for insert with check (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid()) or is_active_agency_delegate(agency_id)));

create policy agents_update_title_company_contacts on title_company_contacts for update using (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid()) or is_active_agency_delegate(agency_id)));

create policy agents_delete_title_company_contacts on title_company_contacts for delete using (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid()) or is_active_agency_delegate(agency_id)));

create policy title_company_contacts_select_own_row on title_company_contacts for select using (user_id = auth.uid());

create policy title_company_select_journey_documents on documents for select using (journey_id in (select journey_id from title_company_contacts where user_id = auth.uid()));

-- security definer, deliberately: this is called from the journeys
-- policy just below, and title_company_contacts' own agent policies
-- (above) query journeys right back — a plain subquery here creates a
-- two-table RLS cycle ("infinite recursion detected in policy for
-- relation journeys"), which is exactly what happened running this
-- migration the first time. Running as the function owner bypasses RLS
-- on this one lookup, breaking the cycle. Same idea as
-- is_active_agency_delegate, just needed here because that one is a
-- one-way reference (nothing reads back into agency_delegates) and this
-- one isn't.
create or replace function is_title_company_contact_for_journey(target_journey_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select exists (select 1 from title_company_contacts where journey_id = target_journey_id and user_id = auth.uid()) $$;

create policy title_company_select_own_journeys on journeys for select using (is_title_company_contact_for_journey(id));

alter table documents drop constraint if exists documents_uploaded_by_check;

alter table documents add constraint documents_uploaded_by_check check (uploaded_by in ('agent', 'client', 'title_company'));
