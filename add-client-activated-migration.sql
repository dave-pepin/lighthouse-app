-- Run this in the Supabase SQL Editor.
-- Set the first (and only) time a client successfully finishes setting up
-- their portal password, so the agent can be notified and see it on the
-- Journey page instead of just guessing whether the invite was used.

alter table journeys add column if not exists client_activated_at timestamptz;
