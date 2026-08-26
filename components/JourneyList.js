"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import JourneyCard from "./JourneyCard";
import { reorderJourneys } from "@/app/(dashboard)/bridge/actions";
import { reorderById } from "@/lib/reorder";

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
    return [...journeys].sort((a, b) => {
      if (!a.closed_at && !b.closed_at) return 0;
      if (!a.closed_at) return 1;
      if (!b.closed_at) return -1;
      return a.closed_at.localeCompare(b.closed_at);
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

// Drag-and-drop reordering for the Bridge's Journey list — same pattern
// as the milestone list (JourneyDetailClient.js) and property photos
// (Sidebar.js): local optimistic state + a ref mirroring the dragged id
// for synchronous dragover reads, persisted via reorderJourneys on drop.
// JourneyCard itself stays a plain display component (also used
// unwrapped, with no reordering, on the Harbor page).
export default function JourneyList({ journeys }) {
  const [orderedJourneys, setOrderedJourneys] = useState(journeys);
  const [sortMode, setSortMode] = useState("manual");
  const [isPending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const draggedIdRef = useRef(null);

  const handleDragStart = (e, journeyId) => {
    draggedIdRef.current = journeyId;
    setDraggedId(journeyId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, journeyId) => {
    e.preventDefault();
    if (!draggedIdRef.current || draggedIdRef.current === journeyId) return;
    setDragOverId(journeyId);
  };

  const handleDrop = (e, journeyId) => {
    e.preventDefault();
    const fromId = draggedIdRef.current;
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
    if (!fromId || fromId === journeyId) return;

    const reordered = reorderById(orderedJourneys, fromId, journeyId);
    if (reordered === orderedJourneys) return;

    setOrderedJourneys(reordered);
    startTransition(() => reorderJourneys(reordered.map((j) => j.id)));
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
  };

  const displayedJourneys = sortedJourneys(orderedJourneys, sortMode);
  const manual = sortMode === "manual";

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
            draggable={manual}
            onDragStart={manual ? (e) => handleDragStart(e, journey.id) : undefined}
            onDragOver={manual ? (e) => handleDragOver(e, journey.id) : undefined}
            onDrop={manual ? (e) => handleDrop(e, journey.id) : undefined}
            onDragEnd={manual ? handleDragEnd : undefined}
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 6,
              opacity: draggedId === journey.id ? 0.4 : 1,
              outline: manual && dragOverId === journey.id && draggedId !== journey.id ? "2px solid var(--lh-teal)" : "none",
              outlineOffset: 2,
              borderRadius: 14,
            }}
          >
            <div
              title={manual ? "Drag to reorder" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 20,
                cursor: manual && !isPending ? "grab" : "default",
                color: "var(--lh-slate-light)",
                visibility: manual ? "visible" : "hidden",
              }}
            >
              <GripVertical size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <JourneyCard journey={journey} currentMilestoneLabel={journey.currentMilestoneLabel} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
