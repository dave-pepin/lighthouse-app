-- Run this in the Supabase SQL Editor.
-- Lets each agent optionally set their own photo, logo, and brand color,
-- shown as a small footer on their clients' portal. All three
-- independently nullable — an agent can set none, some, or all of them.
alter table users add column if not exists profile_photo_path text;
alter table users add column if not exists logo_path text;
alter table users add column if not exists brand_color text
  check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
