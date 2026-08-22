-- Run this in the Supabase SQL Editor.
-- Stores 3-5 property photos per Journey, shown as a gallery to the client.

create table if not exists property_photos (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now()
);

alter table property_photos enable row level security;

-- Agents can manage photos for any Journey in their own agency, mirroring
-- the existing agency-wide policies on the journeys table.
create policy "agents can view their agency's property photos"
  on property_photos for select
  using (
    journey_id in (
      select id from journeys
      where agency_id = (select agency_id from users where id = auth.uid())
    )
  );

create policy "agents can insert their agency's property photos"
  on property_photos for insert
  with check (
    journey_id in (
      select id from journeys
      where agency_id = (select agency_id from users where id = auth.uid())
    )
  );

create policy "agents can delete their agency's property photos"
  on property_photos for delete
  using (
    journey_id in (
      select id from journeys
      where agency_id = (select agency_id from users where id = auth.uid())
    )
  );

-- Clients only ever see their own Journey's photos.
create policy "clients can view their own property photos"
  on property_photos for select
  using (
    journey_id in (select id from journeys where client_user_id = auth.uid())
  );
