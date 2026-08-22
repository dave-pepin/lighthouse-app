import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PortalView from "@/app/client/portal/PortalView";
import { loadPortalData } from "@/app/client/portal/loadPortalData";

// Lets an agent see exactly what a specific client sees in their portal,
// without needing that client's password. Agent-only: gated by the same
// agency-scoped RLS that already governs every other agent-facing page
// (Bridge, Team, the Journey detail page itself) — a journey outside the
// signed-in agent's own agency simply won't come back from this query,
// same as it wouldn't anywhere else in the app.
//
// Read-only by design: no invite/edit/delete actions are reachable from
// here, and loadPortalData is told this is a preview so it never marks
// the Harbor arrival as "seen" on the real client's behalf (see
// loadPortalData's justArrived handling).
export default async function JourneyPreviewPage({ params }) {
  const { id } = await params;
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
    .select(
      "id, client_name, role, stage, stage_index, next_action, property_address, agent_id, harbor_seen_at, status_level"
    )
    .eq("id", id)
    .maybeSingle();

  if (!journey) {
    // Not found, or outside this agent's agency — RLS enforces that
    // boundary the same way it does everywhere else in the app.
    redirect("/bridge");
  }

  const admin = createAdminClient();
  const data = await loadPortalData(supabase, admin, journey, { previewMode: true });

  return (
    <PortalView
      journey={journey}
      previewMode
      closePreviewHref={`/journey/${journey.id}`}
      {...data}
    />
  );
}
