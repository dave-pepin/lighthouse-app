-- Run this in the Supabase SQL Editor.
-- Lets an agent hide their name from the client portal branding footer
-- — useful when their logo already includes their name. Defaults to
-- true so nothing changes for anyone until they explicitly turn it off.
alter table users add column if not exists show_footer_name boolean not null default true;
