-- Run this in the Supabase SQL Editor.
-- Lets a Journey have a second email and phone on file (e.g. a spouse or
-- co-buyer/co-seller) that also receives weekly updates and invites.
-- The client's portal login is still tied to the primary client_email
-- only — Supabase Auth requires exactly one email per account.

alter table journeys add column if not exists client_email_2 text;
alter table journeys add column if not exists client_phone_2 text;
