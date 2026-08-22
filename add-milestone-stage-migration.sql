-- Run this in the Supabase SQL Editor to associate milestones with stages,
-- which is what powers auto-advancing the course-line progress bar.
alter table milestones add column if not exists stage text;
