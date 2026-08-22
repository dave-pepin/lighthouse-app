-- Run this in the Supabase SQL Editor.
-- Lets a document optionally be tied to a specific milestone, instead of
-- only ever being a general journey-level file.
alter table documents add column if not exists milestone_id uuid references milestones(id) on delete set null;
