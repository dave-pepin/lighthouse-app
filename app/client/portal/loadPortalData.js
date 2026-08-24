// Shared data-loading for the client portal view — used both by the real
// client-facing page (app/client/portal/page.js) and by the agent-facing
// preview (app/journey-preview/[id]/page.js), so the two can never drift
// apart and show different things.
//
// Takes an already-resolved, already-authorized `journey` row (the caller
// is responsible for confirming the requester is allowed to see it,
// whether that's "this is the client's own Journey" or "this agent owns
// this Journey") plus the caller's own RLS-scoped Supabase client and an
// admin client for the private-storage signed URLs.
export async function loadPortalData(supabase, admin, journey, { previewMode = false } = {}) {
  const [{ data: milestones }, { data: documents }, { data: updates }, { data: propertyPhotos }] =
    await Promise.all([
      supabase
        .from("milestones")
        .select("id, label, done, due_date, date_type, video_id, client_notes")
        .eq("journey_id", journey.id)
        // A milestone only becomes visible to the client once the agent has
        // deliberately set a due date for it — that's the whole point of
        // this field, so it's filtered at the query level, not just hidden
        // in the UI. Kept in preview mode too, since the point of preview
        // is to see exactly what the client sees.
        .not("due_date", "is", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("documents")
        .select("id, name, storage_path, uploaded_at, milestone_id")
        .eq("journey_id", journey.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("weekly_updates")
        .select("draft_text, sent_at")
        .eq("journey_id", journey.id)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1),
      supabase
        .from("property_photos")
        .select("id, storage_path")
        .eq("journey_id", journey.id)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
    ]);

  const latestUpdate = updates?.[0] || null;
  const nextId = milestones?.find((m) => !m.done)?.id;
  const currentMilestoneLabel = milestones?.find((m) => !m.done)?.label;

  let documentsWithLinks = [];
  if (documents && documents.length > 0) {
    documentsWithLinks = await Promise.all(
      documents.map(async (d) => {
        const { data } = await admin.storage.from("documents").createSignedUrl(d.storage_path, 60 * 60);
        return { ...d, url: data?.signedUrl || null };
      })
    );
  }

  let propertyPhotosWithLinks = [];
  if (propertyPhotos && propertyPhotos.length > 0) {
    propertyPhotosWithLinks = await Promise.all(
      propertyPhotos.map(async (p) => {
        const { data } = await admin.storage.from("property-photos").createSignedUrl(p.storage_path, 60 * 60);
        return { ...p, url: data?.signedUrl || null };
      })
    );
  }

  const inHarbor = journey.stage === "Harbor";
  let guideName = "Your Guide";
  let harborResources = null;
  let referralNote = null;

  // Unlike the rest of harborResources (only rendered once a client
  // reaches the Harbor stage), the referral note is shown persistently on
  // every portal visit, at any stage — see PortalView's sidebar. Cheapest
  // to just fetch guideName/agency unconditionally rather than duplicate
  // this lookup.
  const { data: agentProfile } = await admin
    .from("users")
    .select("full_name, agency_id")
    .eq("id", journey.agent_id)
    .maybeSingle();

  guideName = agentProfile?.full_name || "Your Guide";

  if (agentProfile?.agency_id) {
    const { data: agency } = await admin
      .from("agencies")
      .select(
        "trusted_contractors, maintenance_note, property_tax_note, referral_note, home_value_note, trusted_contractors_image, maintenance_image, property_tax_image, home_value_image"
      )
      .eq("id", agentProfile.agency_id)
      .maybeSingle();

    if (agency) {
      referralNote = agency.referral_note;

      if (inHarbor) {
        const signResourceImage = async (path) => {
          if (!path) return null;
          const { data } = await admin.storage.from("harbor-resources").createSignedUrl(path, 60 * 60);
          return data?.signedUrl || null;
        };

        const [trustedContractorsImageUrl, maintenanceImageUrl, propertyTaxImageUrl, homeValueImageUrl] =
          await Promise.all([
            signResourceImage(agency.trusted_contractors_image),
            signResourceImage(agency.maintenance_image),
            signResourceImage(agency.property_tax_image),
            signResourceImage(agency.home_value_image),
          ]);

        harborResources = {
          trustedContractors: agency.trusted_contractors,
          maintenanceNote: agency.maintenance_note,
          propertyTaxNote: agency.property_tax_note,
          referralNote: agency.referral_note,
          homeValueNote: agency.home_value_note,
          trustedContractorsImageUrl,
          maintenanceImageUrl,
          propertyTaxImageUrl,
          homeValueImageUrl,
        };
      }
    }
  }

  // In preview mode this is always false, regardless of the real
  // harbor_seen_at value — an agent looking around shouldn't trigger (or
  // spoil) the client's own one-time Harbor arrival animation, and
  // shouldn't mark it seen on the client's behalf either (see
  // HarborSection, which only calls markHarborSeen when justArrived).
  const justArrived = !previewMode && inHarbor && !journey.harbor_seen_at;

  const videoIds = [...new Set((milestones || []).map((m) => m.video_id).filter(Boolean))];
  let videoUrlById = {};
  if (videoIds.length > 0) {
    const { data: videoRows } = await admin.from("videos").select("id, storage_path").in("id", videoIds);
    if (videoRows) {
      await Promise.all(
        videoRows.map(async (v) => {
          const { data } = await admin.storage.from("milestone-videos").createSignedUrl(v.storage_path, 60 * 60);
          videoUrlById[v.id] = data?.signedUrl || null;
        })
      );
    }
  }

  const milestonesWithVideo = (milestones || []).map((m) => ({
    ...m,
    video_url: m.video_id ? videoUrlById[m.video_id] || null : null,
  }));

  return {
    milestonesWithVideo,
    documentsWithLinks,
    propertyPhotosWithLinks,
    latestUpdate,
    nextId,
    currentMilestoneLabel,
    inHarbor,
    guideName,
    harborResources,
    referralNote,
    justArrived,
  };
}
