-- Run this in the Supabase SQL Editor.
-- A second, client-visible comment field per milestone — separate from
-- the existing `notes` column, which stays private to the agent.
alter table milestones add column if not exists client_notes text;
