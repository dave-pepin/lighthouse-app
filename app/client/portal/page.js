import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import JourneyChooser from "./JourneyChooser";
import PortalView from "./PortalView";
import { loadPortalData } from "./loadPortalData";

export default async function ClientPortalPage({ searchParams }) {
  const params = await searchParams;
  const requestedJourneyId = params?.journey || null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A client login can be tied to more than one Journey at once (e.g.
  // selling their current home while buying a new one) — fetch every
  // Journey this login owns, not just one. Only ever select what a client
  // should see — no internal guidance notes, no milestone notes, nothing
  // agent-only.
  const { data: journeys } = await supabase
    .from("journeys")
    .select(
      "id, client_name, role, stage, stage_index, next_action, property_address, agent_id, harbor_seen_at, status_level"
    )
    .eq("client_user_id", user.id)
    .order("created_at", { ascending: true });

  if (!journeys || journeys.length === 0) {
    // Logged in, but not linked to a Journey — not a client account we recognize.
    redirect("/login");
  }

  const hasMultipleJourneys = journeys.length > 1;
  let journey = journeys[0];

  if (hasMultipleJourneys) {
    if (requestedJourneyId) {
      const match = journeys.find((j) => j.id === requestedJourneyId);
      // An unrecognized or foreign journey id — send them back to the
      // chooser rather than silently falling back to the wrong Journey.
      if (!match) redirect("/client/portal");
      journey = match;
    } else {
      return <JourneyChooser journeys={journeys} />;
    }
  }

  const admin = createAdminClient();
  const data = await loadPortalData(supabase, admin, journey);

  return <PortalView journey={journey} hasMultipleJourneys={hasMultipleJourneys} {...data} />;
}
