-- Run this in the Supabase SQL Editor.
-- Lets each agent send client-facing SMS from their own dedicated Twilio
-- number (self-serve provisioned under Lighthouse's shared 10DLC
-- campaign, so no per-agent compliance registration is needed) and put
-- their own address in Reply-To on client emails, instead of every agent
-- sharing one platform-wide number/sender.
alter table users add column if not exists sms_phone_number text;
alter table users add column if not exists reply_to_email text;
-- The Twilio resource SID for sms_phone_number, needed to detach/release
-- the number via the API later (on request, or when a subscription is
-- canceled) — Twilio's release call takes the SID, not the number itself.
alter table users add column if not exists twilio_phone_number_sid text;
