-- Run this in the Supabase SQL Editor.
-- Lets an agent pause the overdue-milestone digest for one specific
-- Journey (e.g. a listing temporarily off the market) without deleting
-- it or affecting the digest for any other Journey. See
-- lib/overdueDigest.js / add-overdue-digest-threshold-migration.sql,
-- which this sits alongside — that column controls an agent's own
-- global preference, this one is per-Journey.
alter table journeys add column if not exists overdue_digest_paused boolean not null default false;
