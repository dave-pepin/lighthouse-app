"use client";

import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { setMilestoneEnabled, reorderMilestoneStage } from "./actions";
import { flattenTemplateForRole, sortLabelsByOverride, isLabelEnabled } from "@/lib/milestoneTemplates";
import { reorderById } from "@/lib/reorder";

const fieldGroupStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

// Builds one role's ordered, enabled-annotated row list from the stock
// template plus this agency's override rows — grouped by stage, each
// stage's labels sorted by any custom order for that stage.
function buildRoleRows(role, overrideRows) {
  const flat = flattenTemplateForRole(role);

  const stagesInOrder = [];
  const labelsByStage = {};
  const variantByKey = new Map();
  for (const row of flat) {
    if (!labelsByStage[row.stage]) {
      labelsByStage[row.stage] = [];
      stagesInOrder.push(row.stage);
    }
    labelsByStage[row.stage].push(row.label);
    variantByKey.set(`${row.stage}::${row.label}`, row.variantNote);
  }

  const overridesByStage = {};
  for (const o of overrideRows) {
    if (o.role !== role) continue;
    (overridesByStage[o.stage] ||= []).push(o);
  }

  const rows = [];
  for (const stage of stagesInOrder) {
    const ordered = sortLabelsByOverride(labelsByStage[stage], overridesByStage[stage]);
    for (const label of ordered) {
      rows.push({
        stage,
        label,
        variantNote: variantByKey.get(`${stage}::${label}`),
        enabled: isLabelEnabled(label, overridesByStage[stage]),
      });
    }
  }
  return rows;
}

export default function MilestoneTemplateSettings({ templateSettings }) {
  const [activeRole, setActiveRole] = useState("Buying");
  const [rowsByRole, setRowsByRole] = useState(() => ({
    Buying: buildRoleRows("Buying", templateSettings),
    Selling: buildRoleRows("Selling", templateSettings),
  }));
  const [rowError, setRowError] = useState("");
  const [draggedLabel, setDraggedLabel] = useState(null);
  const [dragOverLabel, setDragOverLabel] = useState(null);
  // Mirrors draggedLabel synchronously so dragover/drop can read it
  // immediately, without waiting on a React re-render mid-drag — same
  // reasoning as JourneyDetailClient's draggedMilestoneIdRef.
  const draggedLabelRef = useRef(null);
  // Gates dragstart to mousedowns that began on the grip handle, not
  // anywhere else in the row (the checkbox, the label text).
  const dragHandleActiveRef = useRef(false);

  const rows = rowsByRole[activeRole];

  const handleToggle = (row) => {
    const nextEnabled = !row.enabled;
    const previousRows = rows;
    setRowsByRole((cur) => ({
      ...cur,
      [activeRole]: cur[activeRole].map((r) =>
        r.stage === row.stage && r.label === row.label ? { ...r, enabled: nextEnabled } : r
      ),
    }));
    setRowError("");
    setMilestoneEnabled(activeRole, row.stage, row.label, nextEnabled).catch((err) => {
      setRowsByRole((cur) => ({ ...cur, [activeRole]: previousRows }));
      setRowError(err.message || "Couldn't save that.");
    });
  };

  const handleDragStart = (e, row) => {
    if (!dragHandleActiveRef.current) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    draggedLabelRef.current = row.label;
    setDraggedLabel(row.label);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, row) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedLabelRef.current || draggedLabelRef.current === row.label) return;
    // Only allow dropping within the same stage as the dragged row —
    // this feature reorders milestones within a stage, not across them.
    const draggedRow = rows.find((r) => r.label === draggedLabelRef.current);
    if (!draggedRow || draggedRow.stage !== row.stage) return;
    setDragOverLabel(row.label);
  };

  const handleDrop = (e, row) => {
    e.preventDefault();
    e.stopPropagation();
    const fromLabel = draggedLabelRef.current;
    draggedLabelRef.current = null;
    setDraggedLabel(null);
    setDragOverLabel(null);
    if (!fromLabel || fromLabel === row.label) return;

    const draggedRow = rows.find((r) => r.label === fromLabel);
    if (!draggedRow || draggedRow.stage !== row.stage) return;

    const idRows = rows.map((r) => ({ ...r, id: r.label }));
    const reordered = reorderById(idRows, fromLabel, row.label);
    if (reordered === idRows) return;

    const previousRows = rows;
    setRowsByRole((cur) => ({ ...cur, [activeRole]: reordered }));

    const stageLabelsInOrder = reordered.filter((r) => r.stage === row.stage).map((r) => r.label);
    reorderMilestoneStage(activeRole, row.stage, stageLabelsInOrder).catch((err) => {
      setRowsByRole((cur) => ({ ...cur, [activeRole]: previousRows }));
      setRowError(err.message || "Couldn't save that order.");
    });
  };

  const handleDragEnd = () => {
    dragHandleActiveRef.current = false;
    draggedLabelRef.current = null;
    setDraggedLabel(null);
    setDragOverLabel(null);
  };

  let lastStage = null;

  return (
    <div style={fieldGroupStyle}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["Buying", "Selling"].map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className="lh-focus"
            style={{
              background: activeRole === role ? "var(--lh-navy)" : "none",
              color: activeRole === role ? "white" : "var(--lh-slate)",
              border: activeRole === role ? "none" : "1px solid var(--lh-line)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {role}
          </button>
        ))}
      </div>

      {rowError && <div style={{ fontSize: 11.5, color: "#B4472A", marginBottom: 10 }}>{rowError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((row) => {
          const showStageHeader = row.stage !== lastStage;
          lastStage = row.stage;

          return (
            <div key={`${row.stage}::${row.label}`}>
              {showStageHeader && (
                <div
                  className="lh-mono"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "var(--lh-slate-light)",
                    letterSpacing: 0.3,
                    margin: "14px 0 4px",
                  }}
                >
                  {row.stage.toUpperCase()}
                </div>
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, row)}
                onDragOver={(e) => handleDragOver(e, row)}
                onDrop={(e) => handleDrop(e, row)}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "5px 0",
                  opacity: draggedLabel === row.label ? 0.4 : 1,
                  borderTop:
                    dragOverLabel === row.label && draggedLabel !== row.label
                      ? "2px solid var(--lh-teal)"
                      : "2px solid transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={() => handleToggle(row)}
                  className="lh-focus"
                  style={{ flexShrink: 0, cursor: "pointer" }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: row.enabled ? "var(--lh-navy-soft)" : "var(--lh-slate-light)",
                    flex: "1 1 auto",
                    minWidth: 0,
                  }}
                >
                  {row.label}
                  {row.variantNote && (
                    <span style={{ color: "var(--lh-slate-light)", fontSize: 11.5 }}> ({row.variantNote})</span>
                  )}
                </span>
                <div
                  onMouseDown={() => {
                    dragHandleActiveRef.current = true;
                  }}
                  onMouseUp={() => {
                    dragHandleActiveRef.current = false;
                  }}
                  title="Drag to reorder"
                  style={{ display: "flex", flexShrink: 0, width: 14, cursor: "grab", touchAction: "none" }}
                >
                  <GripVertical size={14} color="var(--lh-slate-light)" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
