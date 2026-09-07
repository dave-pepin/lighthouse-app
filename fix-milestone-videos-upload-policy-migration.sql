-- Run this in the Supabase SQL Editor.
-- Fixes a regression from fix-storage-bucket-upload-policies-migration.sql:
-- that migration scoped milestone-videos' INSERT policy assuming every
-- upload path is prefixed with an agency id (true for the reusable video
-- library in Settings — MilestoneVideoDefaults.js), but missed that
-- JourneyDetailClient.js's "attach a video directly to this milestone"
-- flow uploads to a path prefixed with the Journey id instead
-- (`${journey.id}/...`) — a real, different, pre-existing upload
-- convention this bucket has always had. That mismatch made every such
-- upload fail with "new row violates row-level security policy" the
-- moment the tightened policy went live. This accepts either shape.
drop policy if exists "agents can upload their agency's milestone videos" on storage.objects;

create policy "agents can upload their agency's milestone videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'milestone-videos'
    and (
      ((storage.foldername(name))[1])::uuid = (select agency_id from users where id = auth.uid())
      or
      ((storage.foldername(name))[1])::uuid in (
        select id from journeys
        where agency_id = (select agency_id from users where id = auth.uid())
      )
    )
  );
