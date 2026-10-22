"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical, Phone } from "lucide-react";
import JourneyCard from "./JourneyCard";
import { reorderJourneys, setWeeklyCallMade } from "@/app/(dashboard)/bridge/actions";
import { reorderById } from "@/lib/reorder";
import { usePointerReorder } from "@/lib/usePointerReorder";
import { calledThisWeek } from "@/lib/weeklyCall";

// Last whitespace-separated word of the client's name — client_name is a
// single free-text field (not split first/last), so this is a best-effort
// proxy for "last name" rather than a guaranteed-correct parse.
function lastNameOf(clientName) {
  const parts = (clientName || "").trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

// Same "manual drag order, or a display-only alternate view" pattern as
// the milestone list's sortMode (JourneyDetailClient.js) — switching to
// Closing Date/Last Name/Date Entered never touches bridge_sort_order or
// calls reorderJourneys; only dragging in Manual mode does.
function sortedJourneys(journeys, sortMode) {
  if (sortMode === "closing") {
    // closingDate comes from each Journey's own "Closing" milestone due
    // date (see bridge/page.js) — Journeys don't have a closing-date
    // field of their own until they actually reach Harbor, and the
    // Bridge only ever shows active (non-Harbor) Journeys.
    return [...journeys].sort((a, b) => {
      if (!a.closingDate && !b.closingDate) return 0;
      if (!a.closingDate) return 1;
      if (!b.closingDate) return -1;
      return a.closingDate.localeCompare(b.closingDate);
    });
  }
  if (sortMode === "name") {
    return [...journeys].sort((a, b) => lastNameOf(a.client_name).localeCompare(lastNameOf(b.client_name)));
  }
  if (sortMode === "created") {
    return [...journeys].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  return journeys;
}

// Drag-to-reorder for the Bridge's Journey list — same pattern as the
// milestone list (JourneyDetailClient.js): pointer-based via
// usePointerReorder (so the grip works with a finger on a phone), local
// optimistic state, persisted via reorderJourneys on release.
// JourneyCard itself stays a plain display component (also used
// unwrapped, with no reordering, on the Harbor page).
export default function JourneyList({ journeys }) {
  const [orderedJourneys, setOrderedJourneys] = useState(journeys);
  const [sortMode, setSortMode] = useState("manual");
  const [isPending, startTransition] = useTransition();
  // "This week" depends on the agent's own clock/timezone, so the weekly-
  // call checkboxes only resolve after mount — rendering them on the server
  // could disagree with the browser and cause a hydration mismatch.
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);

  const updateJourney = (journeyId, fields) =>
    setOrderedJourneys((prev) => prev.map((j) => (j.id === journeyId ? { ...j, ...fields } : j)));

  // Optimistic tick, then fills in "Called by …" once the server has looked
  // up the caller's name.
  const handleWeeklyCallToggle = (journeyId, made) => {
    updateJourney(journeyId, {
      weekly_call_made_at: made ? new Date().toISOString() : null,
      weekly_call_made_by_name: null,
    });
    startTransition(async () => {
      const { weeklyCallMadeByName } = await setWeeklyCallMade(journeyId, made);
      if (made) updateJourney(journeyId, { weekly_call_made_by_name: weeklyCallMadeByName });
    });
  };

  const displayedJourneys = sortedJourneys(orderedJourneys, sortMode);
  const manual = sortMode === "manual";

  const { draggedId, overId: dragOverId, getRowProps, getHandleProps } = usePointerReorder({
    enabled: manual,
    onReorder: (fromKey, toKey) => {
      const fromId = orderedJourneys.find((j) => String(j.id) === fromKey)?.id;
      const toId = orderedJourneys.find((j) => String(j.id) === toKey)?.id;
      const reordered = reorderById(orderedJourneys, fromId, toId);
      if (reordered === orderedJourneys) return;

      setOrderedJourneys(reordered);
      startTransition(() => reorderJourneys(reordered.map((j) => j.id)));
    },
  });

  // Adopts whatever's currently displayed under a computed sort (Closing
  // Date/Last Name/Date Entered) as the new persisted Manual order — lets
  // an agent sort to see an arrangement they like, lock it in, then fine-
  // tune further with drag instead of picking one or the other forever.
  const handleUseThisOrder = () => {
    setOrderedJourneys(displayedJourneys);
    setSortMode("manual");
    startTransition(() => reorderJourneys(displayedJourneys.map((j) => j.id)));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {!manual && (
          <button
            onClick={handleUseThisOrder}
            disabled={isPending}
            className="lh-focus"
            style={{
              background: "var(--lh-navy)",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Use this order
          </button>
        )}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="lh-focus"
          title="How this list is ordered"
          style={{
            fontSize: 11.5,
            color: "var(--lh-navy-soft)",
            fontWeight: 500,
            border: "1px solid var(--lh-line)",
            borderRadius: 6,
            padding: "4px 6px",
            fontFamily: "inherit",
            background: "var(--lh-paper)",
          }}
        >
          <option value="manual">Sort: Manual</option>
          <option value="closing">Sort: Closing Date</option>
          <option value="name">Sort: Last Name</option>
          <option value="created">Sort: Date Entered</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {displayedJourneys.map((journey) => (
          <div
            key={journey.id}
            {...getRowProps(journey.id)}
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 6,
              opacity: draggedId === String(journey.id) ? 0.4 : 1,
              outline: dragOverId === String(journey.id) ? "2px solid var(--lh-teal)" : "none",
              outlineOffset: 2,
              borderRadius: 14,
            }}
          >
            <div
              {...getHandleProps(journey.id)}
              title={manual ? "Drag to reorder" : undefined}
              className="lh-drag-handle"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 20,
                boxSizing: "content-box",
                cursor: manual ? (draggedId ? "grabbing" : "grab") : "default",
                touchAction: "none",
                color: "var(--lh-slate-light)",
                visibility: manual ? "visible" : "hidden",
              }}
            >
              <GripVertical size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <JourneyCard journey={journey} currentMilestoneLabel={journey.currentMilestoneLabel} />
            </div>
            <WeeklyCallCheckbox
              journey={journey}
              checked={!!now && calledThisWeek(journey.weekly_call_made_at, now)}
              onToggle={handleWeeklyCallToggle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Sits beside (not inside) the card — JourneyCard is itself a <button>, which
// can't contain another interactive element. Once ticked it shows when the
// call was logged, so the agent (or a teammate covering) can see at a glance.
function WeeklyCallCheckbox({ journey, checked, onToggle }) {
  const calledAt = checked ? new Date(journey.weekly_call_made_at) : null;
  const calledDay = calledAt?.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
  const calledTime = calledAt?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const calledBy = calledAt ? journey.weekly_call_made_by_name : null;
  // First name only on the narrow box; the full name is in the tooltip.
  const calledByFirstName = calledBy?.trim().split(/\s+/)[0];

  return (
    <label
      title={
        calledAt
          ? `Weekly update call made${calledBy ? ` by ${calledBy}` : ""} ${calledAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}`
          : "Weekly update call not made yet this week (resets Mondays at 12 PM)"
      }
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        flexShrink: 0,
        width: 76,
        padding: "8px 4px",
        borderRadius: 10,
        border: "1px solid var(--lh-line)",
        background: checked ? "var(--lh-teal-soft)" : "var(--lh-paper)",
        color: checked ? "var(--lh-teal)" : "var(--lh-slate-light)",
        fontSize: 10.5,
        fontWeight: 600,
        textAlign: "center",
        lineHeight: 1.25,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <Phone size={14} />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(journey.id, e.target.checked)}
        aria-label={`Weekly update call made for ${journey.client_name}`}
        className="lh-focus"
        style={{ margin: 0, accentColor: "var(--lh-teal)", cursor: "pointer" }}
      />
      {calledAt ? (
        <span>
          Called
          {calledByFirstName && (
            <span
              style={{
                display: "block",
                maxWidth: 68,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              by {calledByFirstName}
            </span>
          )}
          <span className="lh-mono" style={{ display: "block", fontSize: 10, fontWeight: 500 }}>
            {calledDay}
            <br />
            {calledTime}
          </span>
        </span>
      ) : (
        "Weekly call"
      )}
    </label>
  );
}
