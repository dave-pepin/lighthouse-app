import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import TitleJourneyChooser from "./TitleJourneyChooser";
import TitlePortalView from "./TitlePortalView";
import { loadTitlePortalData } from "./loadTitlePortalData";

export default async function TitlePortalPage({ searchParams }) {
  const params = await searchParams;
  const requestedJourneyId = params?.journey || null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A title company login can be tied to more than one Journey (an agent
  // may invite the same title company on a later deal) — fetch every
  // Journey this login has access to, not just one. Only ever select what
  // a title company contact should see — no client contact info, no
  // milestones, nothing agent-only.
  const { data: contacts } = await supabase
    .from("title_company_contacts")
    .select("id, company_name, journey_id, journeys(id, client_name, property_address)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!contacts || contacts.length === 0) {
    // Logged in, but not linked to a Journey — not a login we recognize.
    redirect("/login");
  }

  const hasMultipleJourneys = contacts.length > 1;
  let contact = contacts[0];

  if (hasMultipleJourneys) {
    if (requestedJourneyId) {
      const match = contacts.find((c) => c.journey_id === requestedJourneyId);
      // An unrecognized or foreign journey id — send them back to the
      // chooser rather than silently falling back to the wrong Journey.
      if (!match) redirect("/title/portal");
      contact = match;
    } else {
      return (
        <TitleJourneyChooser
          journeys={contacts.map((c) => ({
            journeyId: c.journey_id,
            clientName: c.journeys?.client_name,
            propertyAddress: c.journeys?.property_address,
          }))}
        />
      );
    }
  }

  const admin = createAdminClient();
  const { documentsWithLinks } = await loadTitlePortalData(supabase, admin, contact.journey_id);

  return (
    <TitlePortalView
      journey={contact.journeys}
      companyName={contact.company_name}
      documentsWithLinks={documentsWithLinks}
      hasMultipleJourneys={hasMultipleJourneys}
    />
  );
}
