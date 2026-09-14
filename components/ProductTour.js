"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Compass } from "lucide-react";
import { STATUS } from "react-joyride";

// react-joyride pulls in browser-only measurement code, so it can't be
// server-rendered — same reasoning as any other DOM-measuring library in
// a Next.js App Router page.
const Joyride = dynamic(() => import("react-joyride").then((mod) => mod.Joyride), { ssr: false });

// react-joyride v3 moved every color/behavior knob (primaryColor,
// buttons, closeButtonAction, showProgress, ...) off the top-level props
// and into a single `options` object — styles.options (the v2 shape) no
// longer does anything. Matches --lh-navy in app/globals.css, hardcoded
// rather than var(--lh-navy) since Joyride runs it through tinycolor2
// internally, which parses plain CSS color strings, not custom
// properties.
const LH_NAVY = "#16324F";
const joyrideOptions = {
  primaryColor: LH_NAVY,
  textColor: LH_NAVY,
  arrowColor: "#FFFFFF",
  backgroundColor: "#FFFFFF",
  zIndex: 10000,
  showProgress: true,
  // The default button set is just back/close/primary — 'skip' has to be
  // added explicitly to get a visible Skip control. closeButtonAction
  // 'skip' makes the X button actually end the tour (and fire
  // STATUS.SKIPPED); the default 'close' action just silently advances
  // to the next step instead, which looks like the tour is stuck.
  buttons: ["back", "close", "primary", "skip"],
  closeButtonAction: "skip",
};

const joyrideStyles = {
  tooltip: { borderRadius: 10, fontFamily: "inherit" },
  buttonPrimary: { borderRadius: 7, fontSize: 13 },
  buttonBack: { fontSize: 13 },
  buttonSkip: { fontSize: 13 },
};

// Shared engine behind every guided walkthrough in the app (see
// BridgeTour.js, JourneyFormTour.js) — each caller just supplies its own
// step list and a unique storageKey. Every step should set
// disableBeacon: true (Joyride's default pulsing beacon needing its own
// click before the tooltip even appears is an unnecessary extra step).
export default function ProductTour({ steps, storageKey, label = "Take a tour" }) {
  const [run, setRun] = useState(false);
  // Bumped on every manual trigger to force Joyride to fully remount —
  // it manages its own internal step index once running, so reusing the
  // same instance after a prior close could otherwise resume mid-tour
  // instead of starting over from step one.
  const [tourKey, setTourKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setRun(true);
    }
    // Only ever check on mount for this storageKey, not on every steps
    // identity change (callers may pass a fresh array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // v3 renamed the `callback` prop to `onEvent` — same status/action/type
  // payload shape, just a different prop name.
  const handleEvent = useCallback(
    (data) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        localStorage.setItem(storageKey, "1");
        setRun(false);
      }
    },
    [storageKey]
  );

  return (
    <>
      <button
        onClick={() => {
          setTourKey((k) => k + 1);
          setRun(true);
        }}
        className="lh-focus"
        title={label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "1px solid var(--lh-line)",
          borderRadius: 7,
          padding: "5px 10px",
          fontSize: 12.5,
          color: "var(--lh-slate)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Compass size={13} /> {label}
      </button>
      <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        locale={{ last: "Done" }}
        options={joyrideOptions}
        styles={joyrideStyles}
      />
    </>
  );
}
