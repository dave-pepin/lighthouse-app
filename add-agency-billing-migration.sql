-- Run this in the Supabase SQL Editor.
-- Ties each agency to its Stripe subscription, so payment status can gate
-- access for every agent in that agency.

alter table agencies add column if not exists stripe_customer_id text;
alter table agencies add column if not exists stripe_subscription_id text;
-- Mirrors Stripe's own subscription status ("active", "trialing", "past_due",
-- "canceled", "unpaid", etc.) so the app can check access without calling
-- Stripe's API on every request — kept in sync by the webhook.
alter table agencies add column if not exists subscription_status text;

create unique index if not exists agencies_stripe_customer_id_idx
  on agencies (stripe_customer_id)
  where stripe_customer_id is not null;
