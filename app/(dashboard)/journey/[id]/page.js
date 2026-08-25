import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JourneyDetailClient from "./JourneyDetailClient";
import { notFound } from "next/navigation";

export default async function JourneyDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: journey } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", id)
    .single();

  if (!journey) notFound();

  const [{ data: milestones }, { data: documents }, { data: weeklyUpdates }, { data: videoLibrary }, { data: documentRequests }] =
    await Promise.all([
      supabase
        .from("milestones")
        .select("*")
        .eq("journey_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("documents")
        .select("*")
        .eq("journey_id", id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("weekly_updates")
        .select("*")
        .eq("journey_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      // The agency's whole reusable video library (RLS scopes this to the
      // agent's own agency) — used to populate the "choose an existing
      // video" picker on each milestone.
      supabase
        .from("videos")
        .select("id, title, storage_path")
        .order("created_at", { ascending: false }),
      supabase
        .from("document_requests")
        .select("id, label, status, requested_at")
        .eq("journey_id", id)
        .order("requested_at", { ascending: false }),
    ]);

  const latestUpdate = weeklyUpdates?.[0] || null;

  // Generate short-lived signed download links for each document, using
  // the admin client since the storage bucket is private (same approach
  // as the client portal). Property photos are no longer fetched here —
  // they now live in the global Sidebar, which pulls them itself via
  // /api/property-photos/[journeyId].
  const admin = createAdminClient();

  let documentsWithLinks = [];
  if (documents && documents.length > 0) {
    documentsWithLinks = await Promise.all(
      documents.map(async (d) => {
        const { data } = await admin.storage
          .from("documents")
          .createSignedUrl(d.storage_path, 60 * 60);
        return { ...d, url: data?.signedUrl || null };
      })
    );
  }

  // Only sign playback links for videos actually attached to one of this
  // Journey's milestones — the rest of the library just needs id/title
  // for the picker dropdown, not a URL.
  const attachedVideoIds = new Set((milestones || []).map((m) => m.video_id).filter(Boolean));
  const videoUrlById = {};
  if (videoLibrary && attachedVideoIds.size > 0) {
    await Promise.all(
      videoLibrary
        .filter((v) => attachedVideoIds.has(v.id))
        .map(async (v) => {
          const { data } = await admin.storage
            .from("milestone-videos")
            .createSignedUrl(v.storage_path, 60 * 60);
          videoUrlById[v.id] = data?.signedUrl || null;
        })
    );
  }

  const milestonesWithVideo = (milestones || []).map((m) => ({
    ...m,
    video_url: m.video_id ? videoUrlById[m.video_id] || null : null,
  }));

  // Whether the client's portal login is currently blocked — shown next
  // to the delete control so an agent can revoke access without wiping
  // out the Journey's history. Also pulls last_sign_in_at straight from
  // Supabase Auth (it already tracks this natively) to show when the
  // client last actually logged in, not just whether they've ever
  // activated their account.
  let clientAccess = { hasLogin: false, revoked: false, lastSignInAt: null };
  if (journey.client_user_id) {
    const { data } = await admin.auth.admin.getUserById(journey.client_user_id);
    const bannedUntil = data?.user?.banned_until;
    clientAccess = {
      hasLogin: true,
      revoked: !!bannedUntil && new Date(bannedUntil).getTime() > Date.now(),
      lastSignInAt: data?.user?.last_sign_in_at || null,
    };
  }

  return (
    <JourneyDetailClient
      journey={journey}
      milestones={milestonesWithVideo}
      documents={documentsWithLinks}
      latestUpdate={latestUpdate}
      videoLibrary={videoLibrary || []}
      clientAccess={clientAccess}
      documentRequests={documentRequests || []}
    />
  );
}
