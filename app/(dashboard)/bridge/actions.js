"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Persists a full drag-and-drop reorder of the Bridge's Journey list —
// same sequential-index pattern as reorderMilestones/reorderPropertyPhotos
// in journey/[id]/actions.js.
export async function reorderJourneys(orderedIds) {
  const supabase = await createClient();

  for (let index = 0; index < orderedIds.length; index++) {
    await supabase.from("journeys").update({ bridge_sort_order: index }).eq("id", orderedIds[index]);
  }

  revalidatePath("/bridge");
}
