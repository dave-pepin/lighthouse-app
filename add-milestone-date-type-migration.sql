-- Run this in the Supabase SQL Editor.
-- Adds a date_type to milestones so the agent can tell the client whether a
-- due date is a rough estimate or a firm scheduled appointment. Milestones
-- with no due_date at all remain hidden from the client portal regardless.
alter table milestones add column if not exists date_type text default 'estimated';
alter table milestones add constraint milestones_date_type_check
  check (date_type in ('estimated', 'scheduled'));
