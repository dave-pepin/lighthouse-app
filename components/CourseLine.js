// Buying and Selling Journeys follow different pipelines end to end —
// different number of real-world steps, different names for them. Each
// list ends in "Harbor," the shared destination once Closing/Closed is done.
export const STAGES_BY_ROLE = {
  Buying: ["Getting Started", "Searching", "Under Contract", "Inspection", "Financing", "Closing", "Harbor"],
  Selling: ["Consultation", "Listing Agreement", "Showings", "Under Contract", "Final Preparations", "Closed", "Harbor"],
};

// Backwards-compatible default — anywhere that can't determine a role yet
// falls back to the Buying pipeline rather than crashing.
export const STAGES = STAGES_BY_ROLE.Buying;

export function stagesForRole(role) {
  return STAGES_BY_ROLE[role] || STAGES_BY_ROLE.Buying;
}

// Display-only labels for identifiers that need a friendlier name than
// their stored value. Selling's stage names already are the display text,
// so nothing to map there — this only exists for Buying's "Getting
// Started," kept as the stable identifier in the database and milestone
// templates so it doesn't need to be renamed everywhere.
export const STAGE_LABELS = {
  "Getting Started": "Consultation",
};

export function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage;
}

const ACCENT_COLORS = {
  on_course: "var(--lh-teal)",
  caution: "var(--lh-gold)",
  danger: "var(--lh-red)",
};

const CURRENT_LABEL_COLORS = {
  on_course: "var(--lh-teal)",
  caution: "#8A6614",
  danger: "var(--lh-red)",
};

export default function CourseLine({ stageIndex, compact, statusLevel = "on_course", role = "Buying" }) {
  const stages = stagesForRole(role);
  const total = stages.length - 1;
  const pct = (stageIndex / total) * 100;
  const height = compact ? 20 : 24;
  const margin = 1.5;
  const span = 100 - margin * 2;
  const accent = ACCENT_COLORS[statusLevel] || ACCENT_COLORS.on_course;
  const currentLabelColor = CURRENT_LABEL_COLORS[statusLevel] || CURRENT_LABEL_COLORS.on_course;

  // On narrow phones, compressing the label row down to the viewport
  // width is what caused labels to run into each other again — a fixed
  // font size can't shrink text pixel-width in step with a shrinking
  // percentage-based container. Instead of shrinking further, the
  // non-compact (labeled) version scrolls horizontally on mobile, keeping
  // the same desktop-safe spacing that's already proven not to overlap.
  // Compact mode (Bridge cards) has no labels and stays fully fluid.
  return (
    <div className={compact ? undefined : "lh-courseline-scroll"}>
      <div className={compact ? undefined : "lh-courseline-inner"} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block", overflow: "visible" }}
      >
        <line
          x1={margin}
          y1={height / 2}
          x2={100 - margin}
          y2={height / 2}
          stroke="var(--lh-line)"
          strokeWidth="1.4"
        />
        <line
          x1={margin}
          y1={height / 2}
          x2={margin + (span * pct) / 100}
          y2={height / 2}
          stroke={accent}
          strokeWidth="1.4"
          className="lh-anim"
          style={{ transition: "x2 400ms ease, stroke 200ms ease" }}
        />
        {stages.map((s, i) => {
          const x = margin + (span * i) / total;
          const passed = i <= stageIndex;
          return (
            <circle
              key={s}
              cx={x}
              cy={height / 2}
              r={i === stageIndex ? 3.4 : 1.8}
              fill={i === stageIndex ? accent : passed ? "var(--lh-slate-light)" : "var(--lh-line)"}
            />
          );
        })}
      </svg>
      {!compact && (
        <div style={{ position: "relative", height: 34, marginTop: 4 }}>
          {stages.map((s, i) => {
            const isCurrent = i === stageIndex;
            const passed = i <= stageIndex;
            const leftPct = margin + (span * i) / total;
            // Pull the very first and last labels in slightly so they
            // don't get cut off at the edge of the container.
            const align = i === 0 ? "left" : i === stages.length - 1 ? "right" : "center";
            return (
              <span
                key={s}
                className="lh-mono"
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  // Narrower than the gap between stages (rather than
                  // close to it) so a longer two-word label — "Listing
                  // Agreement" next to "Consultation," for instance —
                  // wraps onto its own second line instead of visually
                  // running into its neighbor. The first/last labels are
                  // left/right-aligned and reach a full box-width toward
                  // their one neighbor (versus half a box-width for a
                  // centered label), so this width has to stay safely
                  // under two-thirds of the stage spacing to guarantee a
                  // gap in that worst case, not just the average case.
                  width: `${(span / total) * 0.62}%`,
                  transform:
                    align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : "none",
                  textAlign: align === "left" ? "left" : align === "right" ? "right" : "center",
                  fontSize: 10,
                  lineHeight: 1.25,
                  // Wrap only at real word boundaries — "break-word" was
                  // forcing a hard break wherever a single long word (like
                  // "Consultation") first stopped fitting the box, which
                  // stranded just its last letter on its own line. Letting
                  // a whole word overflow its narrow box slightly (rather
                  // than fracturing it) looks better and the safety margin
                  // built into the box width keeps it clear of neighbors.
                  whiteSpace: "normal",
                  wordBreak: "normal",
                  overflowWrap: "normal",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? currentLabelColor : passed ? "var(--lh-slate)" : "var(--lh-slate-light)",
                }}
              >
                {stageLabel(s)}
              </span>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
