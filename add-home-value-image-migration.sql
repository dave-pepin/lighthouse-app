-- Run this in the Supabase SQL Editor.
-- Adds image support to the Home Value info resource card, same as the
-- other three (trusted contractors, seasonal maintenance, property tax).
-- Reuses the existing 'harbor-resources' storage bucket and its policy —
-- no new bucket or policy needed here.

alter table agencies add column if not exists home_value_image text;
