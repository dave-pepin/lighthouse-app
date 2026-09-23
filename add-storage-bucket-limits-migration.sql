-- Run this in the Supabase SQL Editor.
-- Sets file size and MIME type limits on the three Storage buckets that
-- have never had one enforced (documents and property-photos already
-- have limits set via the dashboard — this fills the remaining gap).
-- Without this, one oversized upload from any agent has no backstop and
-- can inflate storage cost with nothing stopping it.

update storage.buckets
set file_size_limit = 209715200, -- 200MB, matches the caption already shown in Settings
    allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm']
where id = 'milestone-videos';

update storage.buckets
set file_size_limit = 26214400, -- 25MB, mirrors the documents bucket's existing set
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif']
where id = 'harbor-resources';

update storage.buckets
set file_size_limit = 5242880, -- 5MB — logo/profile photo only
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'agent-branding';
