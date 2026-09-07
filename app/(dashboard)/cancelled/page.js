import { createClient } from "@/lib/supabase/server";
import JourneyCard from "@/components/JourneyCard";
import { getEffectiveAgency } from "@/lib/effectiveAgency";

// A simple, read-only lookup for Journeys an agent has cancelled (see the
// "Cancel this Journey" checkbox in JourneyDetailClient.js) — e.g. a
// client pausing until a later season. Cancelled Journeys drop off the
// Bridge but stay reachable here for reference; opening one and
// unchecking that same box brings it right back to the Bridge.
export default async function CancelledJourneysPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveAgency = await getEffectiveAgency(supabase, user.id);

  const { data: journeys } = await supabase
    .from("journeys")
    .select("*")
    .eq("agency_id", effectiveAgency.agencyId)
    .eq("cancelled", true)
    .order("last_activity_at", { ascending: false });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 32px 60px" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 className="lh-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
          Cancelled Journeys
        </h1>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginTop: 4 }}>
          Kept for reference — open one and uncheck &quot;Cancel this Journey&quot; to bring it back to the Bridge.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {journeys?.map((j) => (
          <JourneyCard key={j.id} journey={j} />
        ))}
        {(!journeys || journeys.length === 0) && (
          <div style={{ color: "var(--lh-slate)", fontSize: 14 }}>No cancelled Journeys.</div>
        )}
      </div>
    </div>
  );
}
