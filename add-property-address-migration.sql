-- Run this in the Supabase SQL Editor.
-- Adds a single property address field to each Journey.

alter table journeys add column if not exists property_address text;
