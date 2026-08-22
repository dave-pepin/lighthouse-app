import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import JourneyCard, { GuidanceStrip } from "@/components/JourneyCard";

export default async function BridgePage() {
  const supabase = await createClient();

  const { data: journeys, error } = await supabase
    .from("journeys")
    .select("*")
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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 32px 60px" }}>
      <div style={{ marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="lh-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
            The Bridge
          </h1>
          <p style={{ fontSize: 14, color: "var(--lh-slate)", marginTop: 4 }}>
            Every active Journey, and where each one stands right now.
          </p>
        </div>
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
      </div>

      {error && (
        <div style={{ color: "#B4472A", fontSize: 13.5 }}>
          Couldn&apos;t load Journeys: {error.message}
        </div>
      )}

      {journeys && <GuidanceStrip journeys={journeys} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {journeys?.map((j, i) => (
          <JourneyCard
            key={j.id}
            journey={j}
            currentMilestoneLabel={currentMilestoneByJourneyId[j.id]}
            isFirst={i === 0}
            isLast={i === journeys.length - 1}
          />
        ))}
        {journeys?.length === 0 && (
          <div style={{ color: "var(--lh-slate)", fontSize: 14 }}>
            No active Journeys yet. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
