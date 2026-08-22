-- Run this in the Supabase SQL Editor.
-- Lets an agent assign one of their library videos to a specific
-- milestone (by role, stage, and label) once in Settings, so every new
-- Buying or Selling client automatically gets that video attached to the
-- matching milestone from day one — no per-client upload needed.
-- Applies going forward to newly created Journeys; existing Journeys'
-- milestones aren't retroactively updated.

create table if not exists milestone_video_defaults (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  role text not null,
  stage text not null,
  label text not null,
  video_id uuid not null references videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agency_id, role, stage, label)
);

alter table milestone_video_defaults enable row level security;

create policy "agents can view their agency's milestone video defaults"
  on milestone_video_defaults for select
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can insert their agency's milestone video defaults"
  on milestone_video_defaults for insert
  with check (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can update their agency's milestone video defaults"
  on milestone_video_defaults for update
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can delete their agency's milestone video defaults"
  on milestone_video_defaults for delete
  using (agency_id = (select agency_id from users where id = auth.uid()));
