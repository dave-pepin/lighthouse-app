"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { sendAgentEmail } from "@/lib/notify";

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

// Mints a one-time signed upload URL for a pending document request. Goes
// through the admin client rather than a direct authenticated upload
// because the "documents" Storage bucket's access rules are configured in
// the Supabase dashboard and untracked in this repo — verifying ownership
// here and minting a scoped, one-time URL sidesteps that unknown entirely.
export async function getClientDocumentUploadUrl(requestId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: request } = await supabase
    .from("document_requests")
    .select("id, journey_id, label, status, journeys!inner(client_user_id)")
    .eq("id", requestId)
    .eq("journeys.client_user_id", user.id)
    .maybeSingle();
  if (!request) {
    throw new Error("Couldn't find that request.");
  }
  if (request.status !== "pending") {
    throw new Error("This request has already been fulfilled.");
  }

  const path = `${request.journey_id}/${Date.now()}-${request.label.replace(/[^a-z0-9.\-_]+/gi, "_")}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(path);
  if (error) {
    throw new Error(error.message);
  }

  return { path, token: data.token };
}

// Records the file the client just uploaded to the signed URL above,
// marks the request fulfilled, and lets the agent know. Ownership is
// re-verified here (not just trusted from getClientDocumentUploadUrl)
// since this is a separate call the client's browser makes after the
// actual upload succeeds.
export async function fulfillDocumentRequest(requestId, fileName, storagePath) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: request } = await supabase
    .from("document_requests")
    .select("id, journey_id, status, journeys!inner(client_user_id, agent_id)")
    .eq("id", requestId)
    .eq("journeys.client_user_id", user.id)
    .maybeSingle();
  if (!request || request.status !== "pending") return;

  const admin = createAdminClient();

  const { data: doc, error: docError } = await admin
    .from("documents")
    .insert({ journey_id: request.journey_id, name: fileName, storage_path: storagePath, uploaded_by: "client" })
    .select()
    .single();
  if (docError) {
    throw new Error(docError.message);
  }

  await admin
    .from("document_requests")
    .update({ status: "fulfilled", document_id: doc.id, fulfilled_at: new Date().toISOString() })
    .eq("id", requestId);

  const { data: agent } = await admin.from("users").select("email").eq("id", request.journeys.agent_id).single();
  if (agent?.email) {
    try {
      await sendAgentEmail({
        to: agent.email,
        subject: "New document uploaded for one of your clients",
        message: "Your client has uploaded a document you requested. Check the Journey page to view it.",
      });
    } catch (err) {
      // Don't let a notification failure stop the upload from counting as
      // fulfilled.
      Sentry.captureException(err);
    }
  }

  revalidatePath("/client/portal");
}
