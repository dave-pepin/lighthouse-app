-- Run this in the Supabase SQL Editor.
-- Backs code-level rate limiting on public routes that run real server
-- work per request (signup checkout creation, short-link redemption).
-- See lib/rateLimit.js.

create table if not exists rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

-- Only ever touched via the admin (service-role) client, which bypasses
-- RLS entirely — this just makes sure the anon/authenticated keys used
-- by regular clients have no path to this table at all, direct or via
-- the RPC below.
alter table rate_limit_hits enable row level security;

create or replace function check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limit_hits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = rate_limit_hits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup — keeps the table from growing unbounded
  -- without needing a separate cron job.
  delete from rate_limit_hits where window_start < now() - interval '1 hour';

  return v_count <= p_limit;
end;
$$;

-- security definer functions are granted to PUBLIC by default — revoke
-- that so only the service-role (admin) client this app actually uses
-- can call it, not every anon/authenticated visitor over the API.
revoke execute on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
