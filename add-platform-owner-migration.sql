-- Run this in the Supabase SQL Editor.
-- Marks the one account allowed to see /admin, the cross-agency
-- platform-owner console. Every other agent is scoped to their own
-- agency by RLS and app-level checks — this flag is the one deliberate
-- exception, and should only ever be true for the product's own owner.
alter table users add column if not exists is_platform_owner boolean not null default false;
update users set is_platform_owner = true where email = 'dave@davepepin.com';
