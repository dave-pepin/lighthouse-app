-- Run this in the Supabase SQL Editor.
-- Upgrades the old on/off "needs_guidance" flag into a three-level status
-- (On Course / Needs Correction / In Danger) so the sailboat badge on the
-- agent's side can actually show three colors instead of two.

alter table journeys add column if not exists status_level text not null default 'on_course';

alter table journeys
  add constraint journeys_status_level_check
  check (status_level in ('on_course', 'caution', 'danger'));

-- Carry forward anything already flagged under the old system as "caution"
-- rather than silently losing that signal.
update journeys set status_level = 'caution' where needs_guidance = true and status_level = 'on_course';
