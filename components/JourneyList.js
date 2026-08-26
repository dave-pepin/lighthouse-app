"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import JourneyCard from "./JourneyCard";
import { reorderJourneys } from "@/app/(dashboard)/bridge/actions";
import { reorderById } from "@/lib/reorder";

// Drag-and-drop reordering for the Bridge's Journey list — same pattern
// as the milestone list (JourneyDetailClient.js) and property photos
// (Sidebar.js): local optimistic state + a ref mirroring the dragged id
// for synchronous dragover reads, persisted via reorderJourneys on drop.
// JourneyCard itself stays a plain display component (also used
// unwrapped, with no reordering, on the Harbor page).
export default function JourneyList({ journeys }) {
  const [orderedJourneys, setOrderedJourneys] = useState(journeys);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {orderedJourneys.map((journey) => (
        <div
          key={journey.id}
          draggable
          onDragStart={(e) => handleDragStart(e, journey.id)}
          onDragOver={(e) => handleDragOver(e, journey.id)}
          onDrop={(e) => handleDrop(e, journey.id)}
          onDragEnd={handleDragEnd}
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 6,
            opacity: draggedId === journey.id ? 0.4 : 1,
            outline: dragOverId === journey.id && draggedId !== journey.id ? "2px solid var(--lh-teal)" : "none",
            outlineOffset: 2,
            borderRadius: 14,
          }}
        >
          <div
            title="Drag to reorder"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: 20,
              cursor: isPending ? "default" : "grab",
              color: "var(--lh-slate-light)",
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
  );
}
