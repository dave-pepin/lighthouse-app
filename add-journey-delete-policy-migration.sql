-- Run this in the Supabase SQL Editor.
-- Agents could already delete a Journey's milestones, documents, and
-- photos, but there was never a permission rule allowing an agent to
-- delete the journeys row itself — so the new "Delete this Journey"
-- feature silently did nothing instead of erroring. This adds that rule.

drop policy if exists "agents can delete their own journeys" on journeys;

create policy "agents can delete their own journeys"
  on journeys for delete
  using (agent_id = auth.uid());
