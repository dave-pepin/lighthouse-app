-- Run this in the Supabase SQL Editor.
-- Closes a gap found in a storage audit: every bucket's INSERT policy
-- checked only bucket_id, with no scoping by agency/journey/user at all
-- — any authenticated agent (from any agency) could upload into another
-- agency's or Journey's folder in any of these five buckets, since the
-- app relies entirely on the folder path (agency id / journey id / user
-- id as the first path segment) for organization, not on RLS enforcing
-- it. Reads were never affected (no SELECT policy exists on
-- storage.objects at all — every read already goes through a
-- server-side signed URL), and neither were deletes (no DELETE policy
-- exists either — removal always goes through the admin client). This
-- only tightens INSERT.
--
-- storage.foldername(name) splits an object's path on "/" — [1] is the
-- first segment, which is exactly the agency id / journey id / user id
-- every upload path in this app is prefixed with (see
-- AgentBrandingForm.js, JourneyDetailClient.js, Sidebar.js,
-- SettingsForm.js/ResourceItemsList.js, MilestoneVideoDefaults.js).

-- documents, property-photos: journey-scoped uploads. Includes an active
-- agency delegate covering that Journey's agency (see
-- add-agency-delegates-migration.sql), matching the existing table-level
-- delegate INSERT policies on documents/property_photos — otherwise this
-- fix would silently break uploads for a delegate mid-coverage.
drop policy if exists "Authenticated users can upload documents" on storage.objects;

create policy "agents can upload their agency's documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1])::uuid in (
      select id from journeys
      where agency_id = (select agency_id from users where id = auth.uid())
         or is_active_agency_delegate(agency_id)
    )
  );

drop policy if exists "Authenticated users can upload property photos" on storage.objects;

create policy "agents can upload their agency's property photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and ((storage.foldername(name))[1])::uuid in (
      select id from journeys
      where agency_id = (select agency_id from users where id = auth.uid())
         or is_active_agency_delegate(agency_id)
    )
  );

-- harbor-resources, milestone-videos: agency-scoped uploads (the first
-- path segment is the agency id directly, not a Journey id) — Settings
-- content, not something a delegate manages, so no delegate clause here.
drop policy if exists "authenticated users can upload harbor resource images" on storage.objects;

create policy "agents can upload their agency's harbor resource files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'harbor-resources'
    and ((storage.foldername(name))[1])::uuid = (select agency_id from users where id = auth.uid())
  );

drop policy if exists "authenticated users can upload milestone videos" on storage.objects;

create policy "agents can upload their agency's milestone videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'milestone-videos'
    and ((storage.foldername(name))[1])::uuid = (select agency_id from users where id = auth.uid())
  );

-- agent-branding: personal to each agent (first path segment is their
-- own user id, see AgentBrandingForm.js's BrandingImageSlot) — no agency
-- or delegate scoping, just "this is genuinely you."
drop policy if exists "Authenticated users can upload agent branding" on storage.objects;

create policy "agents can upload their own branding files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'agent-branding'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
