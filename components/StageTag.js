import { Anchor } from "lucide-react";
import { stageLabel } from "./CourseLine";

const LEVELS = {
  on_course: { bg: "var(--lh-green)", label: "On Course" },
  caution: { bg: "var(--lh-gold)", label: "Needs Correction" },
  danger: { bg: "var(--lh-red)", label: "In Danger" },
};

export default function StageTag({ stage, statusLevel = "on_course", currentLabel }) {
  if (stage === "Harbor") {
    return (
      <span
        className="lh-mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 12px",
          borderRadius: 20,
          background: "var(--lh-green)",
          color: "white",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}
      >
        <Anchor size={13} strokeWidth={2} />
        Welcome Home
      </span>
    );
  }

  const level = LEVELS[statusLevel] || LEVELS.on_course;

  return (
    <span
      className="lh-mono lh-anim"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: 20,
        background: level.bg,
        color: "white",
        letterSpacing: "0.03em",
        transition: "background 200ms ease",
        maxWidth: "100%",
      }}
    >
      <Anchor size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
        {currentLabel ? (
          <>
            {level.label} · Up next: {currentLabel}
          </>
        ) : (
          <>
            {level.label} · {stageLabel(stage)}
          </>
        )}
      </span>
    </span>
  );
}
