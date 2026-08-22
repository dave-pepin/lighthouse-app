-- Run this in the Supabase SQL Editor to add notes to milestones.
alter table milestones add column if not exists notes text;
