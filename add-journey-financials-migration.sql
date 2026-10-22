-- Run this in the Supabase SQL Editor.
-- Per-Journey sale price and commission terms for the Bridge's Business
-- Tracker. Deliberately its own table, not columns on journeys: clients and
-- title company contacts can SELECT their own journeys row (see
-- add-client-portal-migration.sql and add-title-company-contacts-migration.sql),
-- so anything stored there is readable from their session. These policies
-- only admit agents of the Journey's own agency — not clients, not title
-- companies, and not delegates covering the agency.
--
-- commission_percent / referral_percent are whole percentages (3 = 3%).
-- referral_percent is a share of the gross commission, paid out to the
-- referring agent. Kept flat (one-line statements) for the same SQL Editor
-- copy/paste reasons noted in add-title-company-contacts-migration.sql.

create table journey_financials (
  journey_id uuid primary key references journeys(id) on delete cascade,
  sale_price numeric check (sale_price >= 0),
  commission_type text not null default 'percent' check (commission_type in ('percent', 'flat')),
  commission_percent numeric check (commission_percent >= 0 and commission_percent <= 100),
  commission_flat numeric check (commission_flat >= 0),
  referral_percent numeric check (referral_percent >= 0 and referral_percent <= 100),
  updated_at timestamptz not null default now()
);

alter table journey_financials enable row level security;

create policy agents_select_journey_financials on journey_financials for select using (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid())));

create policy agents_insert_journey_financials on journey_financials for insert with check (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid())));

create policy agents_update_journey_financials on journey_financials for update using (journey_id in (select id from journeys where agency_id = (select agency_id from users where id = auth.uid())));
