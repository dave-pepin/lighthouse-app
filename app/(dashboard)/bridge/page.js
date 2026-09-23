import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GuidanceStrip } from "@/components/JourneyCard";
import JourneyList from "@/components/JourneyList";
import BridgeTour from "@/components/BridgeTour";
import Pagination from "@/components/Pagination";
import { getEffectiveAgency } from "@/lib/effectiveAgency";

// Large relative to any realistic active-journey count (agents naturally
// move things to Harbor or cancel them when done, so this rarely gets
// anywhere near 150) — drag-to-reorder and the guidance-flag widget both
// expect to see the whole active list, so this only exists to cap the
// genuinely degenerate case of hundreds of active Journeys piling up,
// not to paginate normal day-to-day usage.
const PAGE_SIZE = 150;

export default async function BridgePage({ searchParams }) {
  const supabase = await createClient();
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveAgency = await getEffectiveAgency(supabase, user.id);

  // Needs every active Journey, not just the current page — an agent
  // shouldn't miss a flagged Journey just because it's sitting on a page
  // they're not viewing. Narrow columns keep this cheap even at scale.
  const { data: guidanceJourneys } = await supabase
    .from("journeys")
    .select("id, client_name, status_level, guidance_note")
    .eq("agency_id", effectiveAgency.agencyId)
    .neq("stage", "Harbor")
    .eq("cancelled", false);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const {
    data: journeys,
    error,
    count: totalCount,
  } = await supabase
    .from("journeys")
    .select("*", { count: "exact" })
    .eq("agency_id", effectiveAgency.agencyId)
    .neq("stage", "Harbor")
    .eq("cancelled", false)
    .order("bridge_sort_order", { ascending: true, nullsFirst: false })
    .order("last_activity_at", { ascending: false })
    .range(from, to);

  // One bulk query for every Journey's milestones, instead of one query
  // per card, so the current-milestone badge (same idea as the Journey
  // page and client portal) works here too without an N+1 fetch. Also
  // picks up each Journey's own "Closing" milestone (a plain custom
  // milestone agents add once under contract — see CLAUDE.md/Sort:
  // Closing Date) for the Bridge's Closing Date sort, since Journeys
  // don't have a dedicated closing-date field of their own until they
  // actually reach Harbor.
  let currentMilestoneByJourneyId = {};
  let closingDateByJourneyId = {};
  if (journeys && journeys.length > 0) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("journey_id, label, done, due_date")
      .in("journey_id", journeys.map((j) => j.id))
      .order("sort_order", { ascending: true });

    for (const m of milestones || []) {
      if (!m.done && !(m.journey_id in currentMilestoneByJourneyId)) {
        currentMilestoneByJourneyId[m.journey_id] = m.label;
      }
      if (m.due_date && m.label?.trim().toLowerCase() === "closing" && !(m.journey_id in closingDateByJourneyId)) {
        closingDateByJourneyId[m.journey_id] = m.due_date;
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BridgeTour hasJourneys={!!journeys && journeys.length > 0} />
          {!effectiveAgency.isDelegate && (
            <Link
              href="/journey/new"
              data-tour="new-journey"
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
      </div>

      {error && (
        <div style={{ color: "#B4472A", fontSize: 13.5 }}>
          Couldn&apos;t load Journeys: {error.message}
        </div>
      )}

      {guidanceJourneys && <GuidanceStrip journeys={guidanceJourneys} />}

      {journeys && journeys.length > 0 ? (
        <JourneyList
          journeys={journeys.map((j) => ({
            ...j,
            currentMilestoneLabel: currentMilestoneByJourneyId[j.id],
            closingDate: closingDateByJourneyId[j.id] || null,
          }))}
        />
      ) : (
        <div style={{ color: "var(--lh-slate)", fontSize: 14 }}>No active Journeys yet. Add one to get started.</div>
      )}

      <Pagination basePath="/bridge" currentPage={currentPage} pageSize={PAGE_SIZE} totalCount={totalCount || 0} />
    </div>
  );
}
