-- Run this in the Supabase SQL Editor.
-- A small per-section repository of extra items an agent can attach to
-- each of the four Harbor resource sections (trusted contractors,
-- seasonal maintenance, property tax info, home value info) — on top of
-- the existing single note + single postcard image on `agencies`. Each
-- item is either an uploaded file (video/photo/document/other, stored in
-- the existing harbor-resources bucket) or a plain website link.
create table if not exists harbor_resource_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  section text not null check (section in ('trusted_contractors', 'maintenance', 'property_tax', 'home_value')),
  kind text not null check (kind in ('file', 'link')),
  file_type text check (file_type in ('video', 'photo', 'document', 'other')),
  storage_path text,
  url text,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (
    (kind = 'file' and storage_path is not null and url is null and file_type is not null)
    or
    (kind = 'link' and url is not null and storage_path is null and file_type is null)
  )
);

create index if not exists harbor_resource_items_agency_section_idx on harbor_resource_items (agency_id, section);

alter table harbor_resource_items enable row level security;

create policy "agency members can view their agency's resource items"
  on harbor_resource_items for select
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agency members can add their agency's resource items"
  on harbor_resource_items for insert
  with check (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agency members can delete their agency's resource items"
  on harbor_resource_items for delete
  using (agency_id = (select agency_id from users where id = auth.uid()));
