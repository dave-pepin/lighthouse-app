-- Run this in the Supabase SQL Editor.
-- Lets an agent describe their preferred voice/tone once, agency-wide,
-- for the new "Suggest a message" AI feature on weekly updates.

alter table agencies add column if not exists update_tone_notes text;
