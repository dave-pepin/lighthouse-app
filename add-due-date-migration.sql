-- Run this in the Supabase SQL Editor to add due dates to milestones.
alter table milestones add column if not exists due_date date;
