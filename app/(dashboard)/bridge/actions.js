"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Manually reorders a Journey up or down in the Bridge list — swaps
// bridge_sort_order with whichever neighboring Journey is adjacent in
// that direction, in the same currently-visible (non-Harbor) list the
// Bridge itself shows.
export async function moveJourney(journeyId, direction) {
  const supabase = await createClient();

  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, bridge_sort_order")
    .neq("stage", "Harbor")
    .order("bridge_sort_order", { ascending: true, nullsFirst: false })
    .order("last_activity_at", { ascending: false });

  if (!journeys) return;

  const index = journeys.findIndex((j) => j.id === journeyId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= journeys.length) return;

  const current = journeys[index];
  const neighbor = journeys[swapIndex];

  // Journeys created before this feature shipped (or otherwise missing a
  // value) fall back to their current position — this self-heals as soon
  // as they're involved in a swap, rather than needing a backfill.
  const currentOrder = current.bridge_sort_order ?? index + 1;
  const neighborOrder = neighbor.bridge_sort_order ?? swapIndex + 1;

  await supabase.from("journeys").update({ bridge_sort_order: neighborOrder }).eq("id", current.id);
  await supabase.from("journeys").update({ bridge_sort_order: currentOrder }).eq("id", neighbor.id);

  revalidatePath("/bridge");
}
