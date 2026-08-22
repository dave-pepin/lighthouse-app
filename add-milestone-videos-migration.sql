-- Run this in the Supabase SQL Editor.
-- Backs a reusable video library per agency, and lets any milestone point
-- at one of those videos so clients can watch a short explainer when they
-- expand it.

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  title text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table videos enable row level security;

create policy "agents can view their agency's videos"
  on videos for select
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can insert their agency's videos"
  on videos for insert
  with check (agency_id = (select agency_id from users where id = auth.uid()));

alter table milestones add column if not exists video_id uuid references videos(id) on delete set null;

-- Storage bucket for the actual video files. Private, same as documents
-- and property-photos — playback links are always short-lived signed
-- URLs generated server-side, never a public bucket URL.
insert into storage.buckets (id, name, public)
values ('milestone-videos', 'milestone-videos', false)
on conflict (id) do nothing;

create policy "authenticated users can upload milestone videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'milestone-videos');
