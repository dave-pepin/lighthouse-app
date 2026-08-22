-- Run this in the Supabase SQL Editor.
-- Tracks the last time a client actually opened a document, so the agent
-- can see it on the Journey page.

alter table documents add column if not exists last_viewed_at timestamptz;
