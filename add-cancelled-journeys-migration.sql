-- Run this in the Supabase SQL Editor.
-- Lets an agent cancel a Journey (e.g. a client pausing until a later
-- season) without deleting it — it drops off the Bridge but stays
-- reachable from a new "Cancelled Journeys" list for future reference.
-- Orthogonal to `stage`, which is left untouched at whatever it was when
-- cancelled, so reactivating (unchecking) just picks back up where it
-- left off.
alter table journeys add column if not exists cancelled boolean not null default false;
