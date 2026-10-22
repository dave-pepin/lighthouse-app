-- Run this in the Supabase SQL Editor (after add-journey-financials-migration.sql).
-- Adds the agent's brokerage split to each Journey's commission terms: the
-- percentage of the commission that goes to the office (40 = the agent keeps
-- 60%). It comes off after the referral fee — see lib/commission.js.
-- Covered by journey_financials' existing policies.

alter table journey_financials add column if not exists office_split_percent numeric check (office_split_percent >= 0 and office_split_percent <= 100);
