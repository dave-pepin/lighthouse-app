"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Compass } from "lucide-react";
import { STATUS } from "react-joyride";

// react-joyride pulls in browser-only measurement code, so it can't be
// server-rendered — same reasoning as any other DOM-measuring library in
// a Next.js App Router page.
const Joyride = dynamic(() => import("react-joyride").then((mod) => mod.Joyride), { ssr: false });

const SEEN_KEY = "lh_bridge_tour_seen";

// Targets matching data-tour attributes added to Bridge page.js (New
// Journey link), JourneyCard.js (every card — querySelector naturally
// picks the first one in document order), and Sidebar.js (every nav
// item, keyed by its own `key`).
// disableBeacon on every step: Joyride's default of a pulsing beacon
// that needs its own separate click before the tooltip even appears
// adds a confusing extra step — the tooltip should just show up.
const baseSteps = [
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to the Bridge",
    content:
      "This is where every active Journey lives. Let's take a quick look around — click Next to continue, or Skip anytime.",
  },
  {
    target: '[data-tour="new-journey"]',
    disableBeacon: true,
    title: "Start a new Journey",
    content:
      "Every client transaction starts here — buying or selling, this sets up the milestone checklist for you automatically.",
  },
];

const journeyCardStep = {
  target: '[data-tour="journey-card"]',
  disableBeacon: true,
  title: "A Journey card",
  content: "Each card shows the client, their progress through the deal, and what's coming up next. Click any card to open it.",
};

const trailingSteps = [
  {
    target: '[data-tour="nav-team"]',
    disableBeacon: true,
    title: "Team",
    content: "Invite teammates to your agency from here.",
  },
  {
    target: '[data-tour="nav-harbor"]',
    disableBeacon: true,
    title: "The Harbor",
    content:
      "Once a deal closes, its Journey moves here — this is also where you'll check in on past clients after closing.",
  },
  {
    target: '[data-tour="nav-settings"]',
    disableBeacon: true,
    title: "Settings",
    content: "Set up your branding, your texting number, and weekly update preferences here.",
  },
  {
    target: "body",
    placement: "center",
    disableBeacon: true,
    title: "That's it!",
    content: "You can replay this tour anytime from the compass icon up top.",
  },
];

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
  // to the next step instead, which looked like the tour was stuck.
  buttons: ["back", "close", "primary", "skip"],
  closeButtonAction: "skip",
};

export default function BridgeTour({ hasJourneys }) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  // Bumped on every manual trigger to force Joyride to fully remount —
  // it manages its own internal step index once running, so reusing the
  // same instance after a prior close could otherwise resume mid-tour
  // instead of starting over from step one.
  const [tourKey, setTourKey] = useState(0);

  useEffect(() => {
    setSteps([...baseSteps, ...(hasJourneys ? [journeyCardStep] : []), ...trailingSteps]);

    if (!localStorage.getItem(SEEN_KEY)) {
      setRun(true);
    }
  }, [hasJourneys]);

  // v3 renamed the `callback` prop to `onEvent` — same status/action/type
  // payload shape, just a different prop name.
  const handleEvent = useCallback((data) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      localStorage.setItem(SEEN_KEY, "1");
      setRun(false);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setTourKey((k) => k + 1);
          setRun(true);
        }}
        className="lh-focus"
        title="Take a tour"
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
        <Compass size={13} /> Take a tour
      </button>
      {steps.length > 0 && (
        <Joyride
          key={tourKey}
          steps={steps}
          run={run}
          continuous
          scrollToFirstStep
          onEvent={handleEvent}
          locale={{ last: "Done" }}
          options={joyrideOptions}
          styles={{
            tooltip: { borderRadius: 10, fontFamily: "inherit" },
            buttonPrimary: { borderRadius: 7, fontSize: 13 },
            buttonBack: { fontSize: 13 },
            buttonSkip: { fontSize: 13 },
          }}
        />
      )}
    </>
  );
}
