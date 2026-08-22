-- Run this in the Supabase SQL Editor to track whether a Journey is a
-- cash or financed transaction, which determines which Financing-stage
-- milestones get auto-generated.
alter table journeys add column if not exists financing_type text
  check (financing_type in ('cash', 'financed'));
