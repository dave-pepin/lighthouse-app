"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Calendar, FileText, ChevronDown, Eye } from "lucide-react";
import { recordVideoWatched, recordDocumentViewed } from "./actions";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Client-facing version of the agent's document thumbnail — simpler, no
// PDF page rendering, just a clean clickable row with a file icon.
function MilestoneDocumentLink({ doc, journeyId, previewMode }) {
  return (
    <a
      href={doc.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="lh-focus"
      onClick={() => {
        if (!previewMode && journeyId) {
          recordDocumentViewed(journeyId, doc.id);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
        color: "var(--lh-navy)",
        textDecoration: "none",
      }}
    >
      <FileText size={14} color="var(--lh-slate)" strokeWidth={1.75} />
      <span style={{ textDecoration: "underline" }}>{doc.name}</span>
    </a>
  );
}

export default function ClientMilestoneList({ milestones, documents, nextId, journeyId, previewMode = false }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!milestones || milestones.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--lh-slate-light)" }}>
        Nothing to show yet — check back soon.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {milestones.map((m) => {
        const isNext = m.id === nextId;
        const expanded = expandedId === m.id;
        const milestoneDocs = documents.filter((d) => d.milestone_id === m.id);
        const hasDocs = milestoneDocs.length > 0;
        const hasVideo = !!m.video_url;
        const hasComment = !!m.client_notes;
        const isExpandable = hasDocs || hasVideo || hasComment;

        return (
          <div
            key={m.id}
            style={{
              borderRadius: 8,
              background: isNext ? "var(--lh-teal-soft)" : "transparent",
            }}
          >
            <div
              onClick={() => isExpandable && setExpandedId((cur) => (cur === m.id ? null : m.id))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 8px",
                borderRadius: 8,
                cursor: isExpandable ? "pointer" : "default",
              }}
            >
              {m.done ? (
                <CheckCircle2 size={16} color="var(--lh-teal)" strokeWidth={1.9} />
              ) : (
                <Circle size={16} color={isNext ? "var(--lh-teal)" : "var(--lh-slate-light)"} strokeWidth={1.9} />
              )}
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: isNext ? 600 : 400,
                  color: m.done || isNext ? "var(--lh-navy)" : "var(--lh-slate)",
                  flex: 1,
                }}
              >
                {m.label}
              </span>
              {isExpandable && (
                <span
                  title={[
                    hasComment && "a comment",
                    hasVideo && "a video",
                    hasDocs && (milestoneDocs.length > 1 ? "documents" : "a document"),
                  ]
                    .filter(Boolean)
                    .join(" and ")}
                  style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
                >
                  <Eye size={13} color="var(--lh-teal)" strokeWidth={1.9} />
                  <ChevronDown
                    size={14}
                    color="var(--lh-slate-light)"
                    style={{
                      flexShrink: 0,
                      transition: "transform 150ms ease",
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </span>
              )}
              {m.due_date && (
                <span
                  className="lh-mono"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--lh-navy-soft)",
                    fontWeight: 500,
                  }}
                >
                  <Calendar size={11} />
                  {m.done ? (
                    formatDate(m.due_date)
                  ) : (
                    <>
                      {m.date_type === "scheduled" ? "Scheduled" : "Estimated"}:
                      {/* Fixed width so a one- vs two-digit day (e.g. "Jul 3"
                          vs "Jul 13") never shifts the label before it. */}
                      <span style={{ display: "inline-block", minWidth: 46 }}>
                        {formatDate(m.due_date)}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
            {expanded && isExpandable && (
              <div
                style={{
                  padding: "2px 8px 10px 33px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {hasComment && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--lh-navy-soft)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.client_notes}
                  </p>
                )}
                {hasVideo && (
                  <video
                    controls
                    autoPlay={false}
                    preload="none"
                    playsInline
                    src={m.video_url}
                    onPlay={() => {
                      // An agent previewing their client's portal shouldn't
                      // register as the client having watched it.
                      if (!previewMode && journeyId) {
                        recordVideoWatched(journeyId, m.id);
                      }
                    }}
                    style={{
                      width: "100%",
                      maxWidth: 280,
                      borderRadius: 8,
                      border: "1px solid var(--lh-line)",
                      background: "#000",
                    }}
                  />
                )}
                {hasDocs && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {milestoneDocs.map((d) => (
                      <MilestoneDocumentLink key={d.id} doc={d} journeyId={journeyId} previewMode={previewMode} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
