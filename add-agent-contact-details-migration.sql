-- Run this in the Supabase SQL Editor.
-- Additional contact details an agent can show on their client portal
-- branding footer (see add-agent-branding-migration.sql) — all
-- independently optional, purely for display. Distinct from
-- sms_phone_number, which is the actual Twilio number texts are sent
-- from — these four are never used for sending anything.
alter table users add column if not exists office_address text;
alter table users add column if not exists cell_phone text;
alter table users add column if not exists office_phone text;
alter table users add column if not exists fax_number text;
