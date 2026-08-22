-- Run this in the Supabase SQL Editor.
-- Tracks the last time a client watched a milestone's video, so the agent
-- can see it on the Journey page.

alter table milestones add column if not exists video_watched_at timestamptz;
