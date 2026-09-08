"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import CourseLine from "./CourseLine";
import StageTag from "./StageTag";

// Mirrors the 3-step titles above it in LandingPage.js — kept as plain
// strings here rather than imported, since this is the only place that
// needs the frame-title pairing and duplicating three short strings is
// simpler than threading a shared constant across a client/server split.
const FRAME_TITLES = ["Create a Journey", "Check off milestones as you go", "Review it, then send"];

const CHECKLIST = [
  { label: "Inspection scheduled", done: true },
  { label: "Inspection completed", done: true },
  { label: "Appraisal completed", done: false },
];

// A read-only stand-in for one field of the real New Journey form
// (app/(dashboard)/journey/new/page.js) — mirrors its label-above-box
// layout so frame 0 reads as a glimpse of that actual form, not an
// invented one. `select` just adds the chevron affordance.
function MockField({ label, value, select, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--lh-slate)", marginBottom: 4 }}>{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          border: "1px solid var(--lh-line)",
          borderRadius: 8,
          padding: "8px 10px",
          background: "white",
        }}
      >
        <span className="lh-display" style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </span>
        {select && <ChevronDown size={14} color="var(--lh-slate-light)" style={{ flexShrink: 0 }} />}
      </div>
    </div>
  );
}

// A looping, animated mockup of the 3-step flow described above it —
// built from the same real UI components the product itself uses
// (CourseLine, StageTag), fed sample data, rather than a screen
// recording. Crossfades between frames on a timer; the dots below both
// show and control which frame is showing.
export default function LandingDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = setInterval(
      () => setStep((s) => (s + 1) % FRAME_TITLES.length),
      prefersReducedMotion ? 5000 : 3200
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          position: "relative",
          minHeight: 400,
        }}
      >
        <div className="lh-demo-frame" style={{ opacity: step === 0 ? 1 : 0, zIndex: step === 0 ? 1 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "var(--lh-teal-soft)",
              }}
            >
              <CheckCircle2 size={17} color="var(--lh-teal)" />
            </div>
            <span className="lh-display" style={{ fontSize: 17, fontWeight: 600 }}>
              New Journey
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MockField label="Client name" value="Sarah Chen" />
            <div style={{ display: "flex", gap: 10 }}>
              <MockField label="Role" value="Buying" select style={{ flex: 1, minWidth: 0 }} />
              <MockField label="Starting stage" value="Inspection" select style={{ flex: 1, minWidth: 0 }} />
            </div>
            <MockField label="Cash or financed?" value="Financed (loan involved)" select />
            <MockField label="Property address" value="412 Birchwood Ln" />
          </div>
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "var(--lh-teal-soft)",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.45,
              color: "var(--lh-teal)",
              fontWeight: 600,
            }}
          >
            We'll build the standard Buying milestone checklist automatically — adjusted for a financed
            transaction.
          </div>
        </div>

        <div className="lh-demo-frame" style={{ opacity: step === 1 ? 1 : 0, zIndex: step === 1 ? 1 : 0 }}>
          <div
            className="lh-mono"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "var(--lh-slate)", marginBottom: 12 }}
          >
            THE BRIDGE
          </div>

          {/* One Journey, expanded — the rest of your active clients,
              collapsed underneath, so this reads as a real dashboard
              moment, not just a single isolated card. */}
          <div style={{ border: "1px solid var(--lh-line)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lh-display" style={{ fontSize: 15, fontWeight: 600 }}>
                  Sarah Chen
                </div>
                <div style={{ fontSize: 11.5, color: "var(--lh-slate)", marginTop: 1 }}>Buying</div>
              </div>
              <StageTag stage="Inspection" statusLevel="on_course" currentLabel="Appraisal" />
            </div>
            <CourseLine stageIndex={3} statusLevel="on_course" role="Buying" compact />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
              {CHECKLIST.map((m) =>
                m.done ? (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <CheckCircle2 size={15} color="var(--lh-teal)" style={{ flexShrink: 0 }} />
                    <span style={{ color: "var(--lh-navy-soft)", textDecoration: "line-through" }}>{m.label}</span>
                  </div>
                ) : (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Circle size={15} color="var(--lh-slate-light)" style={{ flexShrink: 0 }} />
                    <span style={{ color: "var(--lh-slate)" }}>{m.label}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name: "Mike Torres", role: "Selling", stage: "Showings", statusLevel: "caution" },
              { name: "The Ramirez Family", role: "Buying", stage: "Closing", statusLevel: "on_course" },
            ].map((j) => (
              <div
                key={j.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "9px 12px",
                  background: "var(--lh-fog)",
                  borderRadius: 9,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="lh-display" style={{ fontSize: 13, fontWeight: 600 }}>
                    {j.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--lh-slate)" }}>{j.role}</span>
                </div>
                <StageTag stage={j.stage} statusLevel={j.statusLevel} />
              </div>
            ))}
          </div>
        </div>

        <div className="lh-demo-frame" style={{ opacity: step === 2 ? 1 : 0, zIndex: step === 2 ? 1 : 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              fontSize: 12.5,
              color: "var(--lh-teal)",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} /> Reviewed and approved by the agent, then sent
          </div>
          <div
            style={{
              background: "var(--lh-teal)",
              color: "white",
              borderRadius: "18px 18px 4px 18px",
              padding: "14px 18px",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Hi Sarah! This is Lighthouse with an update from your agent: Inspection is complete and
            everything looked great. Next up is the appraisal, and we're still on track for your
            March 15 closing. Your agent will be calling shortly to answer any additional questions
            you may have.
          </div>
          <div style={{ fontSize: 12, color: "var(--lh-slate-light)", marginTop: 8, textAlign: "right" }}>
            Jane · sent by email &amp; text
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
        {FRAME_TITLES.map((title, i) => (
          <button
            key={title}
            onClick={() => setStep(i)}
            aria-label={title}
            title={title}
            className="lh-focus"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: step === i ? "var(--lh-navy)" : "var(--lh-line)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
