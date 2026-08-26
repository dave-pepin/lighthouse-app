"use client";

import { Bell, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import CourseLine from "./CourseLine";
import StageTag from "./StageTag";

export function GuidanceStrip({ journeys }) {
  const router = useRouter();
  const flagged = journeys
    .filter((j) => j.status_level === "caution" || j.status_level === "danger")
    // Danger first — that's the one that actually needs eyes on it sooner.
    .sort((a, b) => (a.status_level === b.status_level ? 0 : a.status_level === "danger" ? -1 : 1));
  if (flagged.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--lh-gold-soft)",
        border: "1px solid #E8CE93",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Bell size={15} color="#8A6614" strokeWidth={1.75} />
        <span className="lh-display" style={{ fontSize: 15, fontWeight: 600, color: "#5C4508" }}>
          Needs Your Guidance
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {flagged.map((j) => (
          <button
            key={j.id}
            onClick={() => router.push(`/journey/${j.id}`)}
            className="lh-focus lh-anim"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--lh-paper)",
              border: "none",
              borderRadius: 9,
              padding: "10px 12px",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: j.status_level === "danger" ? "var(--lh-red)" : "var(--lh-gold)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{j.client_name}</div>
              <div style={{ fontSize: 12.5, color: "var(--lh-slate)" }}>{j.guidance_note}</div>
            </div>
            <ChevronRight size={15} color="var(--lh-slate-light)" />
          </button>
        ))}
      </div>
    </div>
  );
}

function formatClosedDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JourneyCard({ journey, currentMilestoneLabel }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/journey/${journey.id}`)}
      className="lh-focus lh-anim"
      style={{
        background: "var(--lh-paper)",
        border: "1px solid var(--lh-line)",
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "box-shadow 150ms ease, border-color 150ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lh-display" style={{ fontSize: 16.5, fontWeight: 600 }}>
            {journey.client_name}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--lh-slate)", marginTop: 1 }}>{journey.role}</div>
        </div>
        <StageTag stage={journey.stage} statusLevel={journey.status_level} currentLabel={currentMilestoneLabel} />
      </div>

      <CourseLine stageIndex={journey.stage_index} statusLevel={journey.status_level} role={journey.role} compact />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          fontSize: 12.5,
          color: "var(--lh-slate)",
        }}
      >
        {journey.stage === "Harbor" ? (
          <span style={{ flex: 1, minWidth: 0, overflowWrap: "break-word" }}>
            {journey.closed_at ? `Closed ${formatClosedDate(journey.closed_at)}` : "Closing date not set"}
          </span>
        ) : (
          <>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: "break-word" }}>Next: {journey.next_action}</span>
            <span className="lh-mono" style={{ color: "var(--lh-slate-light)", fontSize: 11, flexShrink: 0 }}>
              {timeAgo(journey.last_activity_at)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
