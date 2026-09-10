import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import TitlePortalView from "@/app/title/portal/TitlePortalView";
import { loadTitlePortalData } from "@/app/title/portal/loadTitlePortalData";

// Lets an agent see exactly what a title company contact sees in their
// scoped document portal, without needing that contact's password. Same
// shape as app/journey-preview/[id]/page.js: agent-only, gated by the
// same agency-scoped RLS that governs every other agent-facing page, and
// read-only (no upload control — see TitlePortalView's previewMode).
//
// A Journey can have up to two title company contacts, so ?contact=<id>
// picks which one to preview as; omitted or unrecognized falls back to
// the first.
export default async function TitleJourneyPreviewPage({ params, searchParams }) {
  const { id } = await params;
  const { contact: requestedContactId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();
  if (!profile) {
    // Not an agent account — this route is agent-only.
    redirect("/client/portal");
  }

  const { data: journey } = await supabase
    .from("journeys")
    .select("id, client_name, property_address")
    .eq("id", id)
    .maybeSingle();

  if (!journey) {
    // Not found, or outside this agent's agency — RLS enforces that
    // boundary the same way it does everywhere else in the app.
    redirect("/bridge");
  }

  const { data: contacts } = await supabase
    .from("title_company_contacts")
    .select("id, company_name")
    .eq("journey_id", id)
    .order("created_at", { ascending: true });

  if (!contacts || contacts.length === 0) {
    redirect(`/journey/${id}`);
  }

  const contact = contacts.find((c) => c.id === requestedContactId) || contacts[0];

  const admin = createAdminClient();
  const { documentsWithLinks } = await loadTitlePortalData(supabase, admin, id);

  return (
    <TitlePortalView
      journey={journey}
      companyName={contact.company_name}
      documentsWithLinks={documentsWithLinks}
      previewMode
      closePreviewHref={`/journey/${id}`}
    />
  );
}
