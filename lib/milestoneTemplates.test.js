import { describe, it, expect } from "vitest";
import { isLabelEnabled, sortLabelsByOverride, applyTemplateOverrides } from "./milestoneTemplates";

describe("isLabelEnabled", () => {
  it("is enabled when there's no override row for the label", () => {
    expect(isLabelEnabled("Pre-approval received", [])).toBe(true);
    expect(isLabelEnabled("Pre-approval received", undefined)).toBe(true);
  });

  it("is disabled when the override row has enabled: false", () => {
    const overrides = [{ label: "Pre-approval received", enabled: false }];
    expect(isLabelEnabled("Pre-approval received", overrides)).toBe(false);
  });

  it("is enabled when the override row explicitly has enabled: true", () => {
    const overrides = [{ label: "Pre-approval received", enabled: true }];
    expect(isLabelEnabled("Pre-approval received", overrides)).toBe(true);
  });

  it("only matches the exact label, not other rows in the same stage", () => {
    const overrides = [{ label: "Tour properties", enabled: false }];
    expect(isLabelEnabled("Pre-approval received", overrides)).toBe(true);
  });
});

describe("sortLabelsByOverride", () => {
  const labels = ["A", "B", "C"];

  it("keeps original order when no override row has a sort_order", () => {
    const overrides = [{ label: "A", enabled: false }];
    expect(sortLabelsByOverride(labels, overrides)).toEqual(["A", "B", "C"]);
  });

  it("keeps original order when overrideRowsForStage is empty or missing", () => {
    expect(sortLabelsByOverride(labels, [])).toEqual(labels);
    expect(sortLabelsByOverride(labels, undefined)).toEqual(labels);
  });

  it("reorders by sort_order once any row in the stage has one set", () => {
    const overrides = [
      { label: "A", sort_order: 2 },
      { label: "B", sort_order: 0 },
      { label: "C", sort_order: 1 },
    ];
    expect(sortLabelsByOverride(labels, overrides)).toEqual(["B", "C", "A"]);
  });

  it("puts labels with no explicit sort_order after ones that have one, preserving their relative order", () => {
    const overrides = [{ label: "C", sort_order: 0 }];
    expect(sortLabelsByOverride(labels, overrides)).toEqual(["C", "A", "B"]);
  });

  it("never mutates the input array", () => {
    const original = [...labels];
    sortLabelsByOverride(labels, [{ label: "C", sort_order: 0 }]);
    expect(labels).toEqual(original);
  });
});

describe("applyTemplateOverrides", () => {
  const labels = ["A", "B", "C"];

  it("returns the stock list unchanged when there are no overrides", () => {
    expect(applyTemplateOverrides(labels, [])).toEqual(labels);
  });

  it("filters out disabled labels", () => {
    const overrides = [{ label: "B", enabled: false }];
    expect(applyTemplateOverrides(labels, overrides)).toEqual(["A", "C"]);
  });

  it("applies custom order after filtering", () => {
    const overrides = [
      { label: "A", sort_order: 1 },
      { label: "B", enabled: false },
      { label: "C", sort_order: 0 },
    ];
    expect(applyTemplateOverrides(labels, overrides)).toEqual(["C", "A"]);
  });

  it("includes an agency-added custom milestone not in the stock list", () => {
    // Only the custom label has an explicit sort_order here, so per
    // sortLabelsByOverride it sorts before the un-ordered stock labels —
    // this exact shape can't arise from the real "add" UI flow (which
    // persists order for every label in the stage together), but the
    // pure function still needs well-defined behavior for it.
    const overrides = [{ label: "Custom step", sort_order: 3 }];
    expect(applyTemplateOverrides(labels, overrides)).toEqual(["Custom step", "A", "B", "C"]);
  });

  it("respects a disabled custom milestone by excluding it", () => {
    const overrides = [{ label: "Custom step", enabled: false }];
    expect(applyTemplateOverrides(labels, overrides)).toEqual(["A", "B", "C"]);
  });

  it("orders a custom milestone into the middle when its sort_order says so", () => {
    const overrides = [
      { label: "A", sort_order: 0 },
      { label: "Custom step", sort_order: 1 },
      { label: "B", sort_order: 2 },
      { label: "C", sort_order: 3 },
    ];
    expect(applyTemplateOverrides(labels, overrides)).toEqual(["A", "Custom step", "B", "C"]);
  });
});
