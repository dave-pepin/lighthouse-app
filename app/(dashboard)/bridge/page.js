import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GuidanceStrip } from "@/components/JourneyCard";
import JourneyList from "@/components/JourneyList";
import { getEffectiveAgency } from "@/lib/effectiveAgency";

export default async function BridgePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveAgency = await getEffectiveAgency(supabase, user.id);

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("*")
    .eq("agency_id", effectiveAgency.agencyId)
    .neq("stage", "Harbor")
    .order("bridge_sort_order", { ascending: true, nullsFirst: false })
    .order("last_activity_at", { ascending: false });

  // One bulk query for every Journey's milestones, instead of one query
  // per card, so the current-milestone badge (same idea as the Journey
  // page and client portal) works here too without an N+1 fetch.
  let currentMilestoneByJourneyId = {};
  if (journeys && journeys.length > 0) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("journey_id, label, done")
      .in("journey_id", journeys.map((j) => j.id))
      .order("sort_order", { ascending: true });

    for (const m of milestones || []) {
      if (!m.done && !(m.journey_id in currentMilestoneByJourneyId)) {
        currentMilestoneByJourneyId[m.journey_id] = m.label;
      }
    }
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 32px 60px" }}>
      {effectiveAgency.isDelegate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            background: "var(--lh-navy)",
            color: "white",
            fontSize: 12.5,
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <Eye size={13} />
          You&apos;re covering {effectiveAgency.agencyName} until{" "}
          {new Date(effectiveAgency.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} —
          sending messages is disabled.
        </div>
      )}
      <div style={{ marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="lh-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
            The Bridge
          </h1>
          <p style={{ fontSize: 14, color: "var(--lh-slate)", marginTop: 4 }}>
            Every active Journey, and where each one stands right now.
          </p>
        </div>
        {!effectiveAgency.isDelegate && (
          <Link
            href="/journey/new"
            className="lh-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--lh-navy)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={15} /> New Journey
          </Link>
        )}
      </div>

      {error && (
        <div style={{ color: "#B4472A", fontSize: 13.5 }}>
          Couldn&apos;t load Journeys: {error.message}
        </div>
      )}

      {journeys && <GuidanceStrip journeys={journeys} />}

      {journeys && journeys.length > 0 ? (
        <JourneyList
          journeys={journeys.map((j) => ({ ...j, currentMilestoneLabel: currentMilestoneByJourneyId[j.id] }))}
        />
      ) : (
        <div style={{ color: "var(--lh-slate)", fontSize: 14 }}>No active Journeys yet. Add one to get started.</div>
      )}
    </div>
  );
}
