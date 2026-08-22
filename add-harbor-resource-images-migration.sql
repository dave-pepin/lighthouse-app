-- Run this in the Supabase SQL Editor.
-- Lets an agent attach an image (an old postcard, a printed guide, etc.)
-- to three of the Harbor resource cards, instead of — or alongside —
-- plain text.

alter table agencies add column if not exists trusted_contractors_image text;
alter table agencies add column if not exists maintenance_image text;
alter table agencies add column if not exists property_tax_image text;

insert into storage.buckets (id, name, public)
values ('harbor-resources', 'harbor-resources', false)
on conflict (id) do nothing;

create policy "authenticated users can upload harbor resource images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'harbor-resources');
