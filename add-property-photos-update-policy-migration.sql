-- Run this in the Supabase SQL Editor.
-- Fixes a real gap found while documenting the app's RLS policies:
-- property_photos has DELETE/INSERT/SELECT policies for agents but no
-- UPDATE policy. reorderPropertyPhotos's .update({ sort_order }) calls
-- (drag-and-drop property photo reordering,
-- app/(dashboard)/journey/[id]/actions.js) go through the regular
-- RLS-scoped client — with no UPDATE policy, RLS silently blocks the
-- write (matches zero rows, no error), so the reordered sort_order has
-- likely never actually persisted in production. Matches the exact
-- style of this table's existing DELETE/INSERT policies.
create policy "agents can update their agency's property photos"
  on property_photos for update
  using (
    journey_id in (
      select journeys.id from journeys
      where journeys.agency_id = (select users.agency_id from users where users.id = auth.uid())
    )
  );
