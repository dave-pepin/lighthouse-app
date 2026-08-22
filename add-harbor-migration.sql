-- Run this in the Supabase SQL Editor.
-- Backs the one-time "arrival at the Harbor" experience for clients, plus
-- the homeowner resources content agents can customize per agency.

alter table journeys add column if not exists harbor_seen_at timestamptz;

alter table agencies add column if not exists maintenance_note text;
alter table agencies add column if not exists property_tax_note text;
alter table agencies add column if not exists trusted_contractors text;
alter table agencies add column if not exists referral_note text;
alter table agencies add column if not exists home_value_note text;

alter table agencies enable row level security;

create policy "agents can view their own agency"
  on agencies for select
  using (id = (select agency_id from users where id = auth.uid()));

create policy "agents can update their own agency"
  on agencies for update
  using (id = (select agency_id from users where id = auth.uid()))
  with check (id = (select agency_id from users where id = auth.uid()));
