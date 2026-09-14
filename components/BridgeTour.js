"use client";

import ProductTour from "./ProductTour";

// Targets matching data-tour attributes added to Bridge page.js (New
// Journey link), JourneyCard.js (every card — querySelector naturally
// picks the first one in document order), and Sidebar.js (every nav
// item, keyed by its own `key`).
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

export default function BridgeTour({ hasJourneys }) {
  const steps = [...baseSteps, ...(hasJourneys ? [journeyCardStep] : []), ...trailingSteps];
  return <ProductTour steps={steps} storageKey="lh_bridge_tour_seen" />;
}
