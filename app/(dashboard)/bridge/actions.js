"use server";

import { withActionErrors } from "@/lib/actionErrors";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Persists a full drag-and-drop reorder of the Bridge's Journey list —
// same sequential-index pattern as reorderMilestones/reorderPropertyPhotos
// in journey/[id]/actions.js.
export const reorderJourneys = withActionErrors(async function reorderJourneys(orderedIds) {
  const supabase = await createClient();

  for (let index = 0; index < orderedIds.length; index++) {
    await supabase.from("journeys").update({ bridge_sort_order: index }).eq("id", orderedIds[index]);
  }

  revalidatePath("/bridge");
});

// Ticks/unticks the Bridge's "weekly update phone call made" checkbox.
// Stored as a timestamp so it resets on its own each week (lib/weeklyCall.js),
// along with who ticked it — the agent or a teammate covering for them.
export const setWeeklyCallMade = withActionErrors(async function setWeeklyCallMade(journeyId, made) {
  const supabase = await createClient();

  let madeBy = null;
  let madeByName = null;
  if (made) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("full_name").eq("id", user.id).maybeSingle();
    madeBy = user.id;
    madeByName = profile?.full_name || user.email;
  }

  const { error } = await supabase
    .from("journeys")
    .update({
      weekly_call_made_at: made ? new Date().toISOString() : null,
      weekly_call_made_by: madeBy,
      weekly_call_made_by_name: madeByName,
    })
    .eq("id", journeyId);
  if (error) throw new Error(error.message);

  revalidatePath("/bridge");
  return { weeklyCallMadeByName: madeByName };
});
