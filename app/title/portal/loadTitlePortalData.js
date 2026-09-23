// Shared data-loading for the title company portal — takes an
// already-resolved, already-authorized Journey (the caller confirms a
// title_company_contacts row actually ties this login to it) plus an
// admin client for the private-storage signed URLs. Documents only — no
// milestones, updates, or photos, since a title company contact's access
// is scoped to upload/download documents alone.
import { getSignedStorageUrl } from "@/lib/signedStorageUrl";

export async function loadTitlePortalData(supabase, admin, journeyId) {
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, storage_path, uploaded_at")
    .eq("journey_id", journeyId)
    .order("uploaded_at", { ascending: false });

  let documentsWithLinks = [];
  if (documents && documents.length > 0) {
    documentsWithLinks = await Promise.all(
      documents.map(async (d) => ({ ...d, url: await getSignedStorageUrl("documents", d.storage_path) }))
    );
  }

  return { documentsWithLinks };
}
