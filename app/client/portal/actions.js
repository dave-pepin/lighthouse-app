"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Marks that this client has seen the one-time Harbor arrival experience,
// so future visits show the permanent (non-animated) version instead.
export async function markHarborSeen(journeyId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Confirm this Journey actually belongs to the logged-in client before
  // touching it with the admin client — this check is what stands between
  // "mark my own Harbor as seen" and "mark anyone's."
  const { data: journey } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journeyId)
    .eq("client_user_id", user.id)
    .maybeSingle();

  if (!journey) return;

  const admin = createAdminClient();
  await admin
    .from("journeys")
    .update({ harbor_seen_at: new Date().toISOString() })
    .eq("id", journeyId);

  revalidatePath("/client/portal");
}

// Lets an agent see the last time their client actually pressed play on a
// milestone's video. Fires from the client portal's video element on play.
export async function recordVideoWatched(journeyId, milestoneId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Same ownership check as markHarborSeen — confirm this Journey actually
  // belongs to the logged-in client via the regular RLS-scoped client
  // before touching a milestone with the admin client (clients don't have
  // general read access to the milestones table, so this can't be
  // self-verified the same way the journeys check above is).
  const { data: journey } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journeyId)
    .eq("client_user_id", user.id)
    .maybeSingle();

  if (!journey) return;

  const admin = createAdminClient();
  await admin
    .from("milestones")
    .update({ video_watched_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .eq("journey_id", journeyId);

  revalidatePath("/client/portal");
}

// Same idea as recordVideoWatched, but for documents — lets an agent see
// whether a client ever actually opened something that was uploaded.
export async function recordDocumentViewed(journeyId, documentId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: journey } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journeyId)
    .eq("client_user_id", user.id)
    .maybeSingle();

  if (!journey) return;

  const admin = createAdminClient();
  await admin
    .from("documents")
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("journey_id", journeyId);

  revalidatePath("/client/portal");
}
