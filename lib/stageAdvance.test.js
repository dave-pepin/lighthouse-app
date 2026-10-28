import { describe, it, expect } from "vitest";
import { targetStageIndex } from "./stageAdvance";

// The Buying pipeline from components/CourseLine.js (not imported: that
// file is JSX, which these tests don't compile).
const buying = ["Getting Started", "Searching", "Under Contract", "Inspection", "Financing", "Closing", "Harbor"];
const m = (stage, done) => ({ stage, done });

describe("targetStageIndex", () => {
  it("stays put while the current stage has something left to do", () => {
    expect(targetStageIndex(buying, "Inspection", [m("Inspection", true), m("Inspection", false)])).toBe(null);
  });

  it("moves on one stage once the current stage is done", () => {
    expect(targetStageIndex(buying, "Inspection", [m("Inspection", true), m("Financing", false)])).toBe(4);
  });

  it("passes an empty stage to the next one with work left", () => {
    expect(targetStageIndex(buying, "Financing", [m("Inspection", true), m("Closing", false)])).toBe(5);
  });

  it("reaches the Harbor from an empty stage once Closing is all done", () => {
    const all = [m("Under Contract", true), m("Inspection", true), m("Closing", true), m("Closing", true)];
    expect(targetStageIndex(buying, "Financing", all)).toBe(6);
  });

  it("skips several finished stages at once", () => {
    expect(targetStageIndex(buying, "Searching", [m("Searching", true), m("Under Contract", true), m("Inspection", false)])).toBe(3);
  });

  it("doesn't sail into the Harbor just because the rest of the pipeline is empty", () => {
    expect(targetStageIndex(buying, "Getting Started", [m("Getting Started", true)])).toBe(1);
    expect(targetStageIndex(buying, "Financing", [])).toBe(null);
  });

  it("never moves from the Harbor or an unknown stage", () => {
    expect(targetStageIndex(buying, "Harbor", [])).toBe(null);
    expect(targetStageIndex(buying, "Nowhere", [m("Closing", false)])).toBe(null);
  });
});
