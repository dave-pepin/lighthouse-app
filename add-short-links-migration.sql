-- Run this in the Supabase SQL Editor.
-- Backs short, brandable invite links (lighthouse.davepepin.com/i/xxxxxxx)
-- that redirect to the real (long) Supabase invite/magic link. Only ever
-- read or written using the service-role admin client, so RLS is left
-- enabled with no policies — this locks it out for both anonymous and
-- authenticated non-admin access entirely.

create table if not exists short_links (
  code text primary key,
  target_url text not null,
  created_at timestamptz not null default now()
);

alter table short_links enable row level security;
