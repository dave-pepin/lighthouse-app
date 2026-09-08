"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
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
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          position: "relative",
          minHeight: 300,
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
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)" }}>Client name</div>
              <div className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, marginTop: 2 }}>
                Sarah Chen
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--lh-slate)" }}>Role</div>
              <div className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, marginTop: 2 }}>
                Buying
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--lh-line)",
              fontSize: 12.5,
              color: "var(--lh-teal)",
              fontWeight: 600,
            }}
          >
            Milestone checklist built automatically
          </div>
        </div>

        <div className="lh-demo-frame" style={{ opacity: step === 1 ? 1 : 0, zIndex: step === 1 ? 1 : 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lh-display" style={{ fontSize: 17, fontWeight: 600 }}>
                Sarah Chen
              </div>
              <div style={{ fontSize: 12.5, color: "var(--lh-slate)", marginTop: 1 }}>Buying</div>
            </div>
            <StageTag stage="Inspection" statusLevel="on_course" currentLabel="Appraisal" />
          </div>
          <CourseLine stageIndex={3} statusLevel="on_course" role="Buying" compact />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {CHECKLIST.map((m) =>
              m.done ? (
                <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                  <CheckCircle2 size={16} color="var(--lh-teal)" style={{ flexShrink: 0 }} />
                  <span style={{ color: "var(--lh-navy-soft)", textDecoration: "line-through" }}>{m.label}</span>
                </div>
              ) : (
                <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                  <Circle size={16} color="var(--lh-slate-light)" style={{ flexShrink: 0 }} />
                  <span style={{ color: "var(--lh-slate)" }}>{m.label}</span>
                </div>
              )
            )}
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
