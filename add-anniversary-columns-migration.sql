-- Run this in the Supabase SQL Editor.
-- Lets an agent track a client's closing date once they reach the Harbor,
-- and opt in to an on-page reminder as their closing anniversary approaches.

alter table journeys add column if not exists closed_at date;
alter table journeys add column if not exists anniversary_reminder_enabled boolean not null default false;
