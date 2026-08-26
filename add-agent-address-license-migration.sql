-- Run this in the Supabase SQL Editor.
-- City/state/zip to go with the existing office_address (see
-- add-agent-contact-details-migration.sql), plus one or more real estate
-- license numbers per agent. All independently optional, purely for
-- display on the client portal branding footer.
alter table users add column if not exists office_city text;
alter table users add column if not exists office_state text;
alter table users add column if not exists office_zip text;
alter table users add column if not exists license_numbers text[] not null default '{}';
