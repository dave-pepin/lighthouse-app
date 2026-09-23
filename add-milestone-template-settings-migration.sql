-- Run this in the Supabase SQL Editor.
-- Lets an agency turn individual default milestones on/off, and reorder
-- them within their existing stage, per role (Buying/Selling) — instead
-- of every agency using the same fixed checklist from lib/milestoneTemplates.js.
-- Only overrides are stored here (no row = "use the stock template as-is").
-- Applies going forward to newly created Journeys; existing Journeys'
-- milestones aren't retroactively updated.

create table if not exists milestone_template_settings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  role text not null,
  stage text not null,
  label text not null,
  enabled boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  unique (agency_id, role, stage, label)
);

alter table milestone_template_settings enable row level security;

create policy "agents can view their agency's milestone template settings"
  on milestone_template_settings for select
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can insert their agency's milestone template settings"
  on milestone_template_settings for insert
  with check (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can update their agency's milestone template settings"
  on milestone_template_settings for update
  using (agency_id = (select agency_id from users where id = auth.uid()));

create policy "agents can delete their agency's milestone template settings"
  on milestone_template_settings for delete
  using (agency_id = (select agency_id from users where id = auth.uid()));
