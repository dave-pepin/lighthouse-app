import { describe, expect, it } from "vitest";
import { calledThisWeek, startOfCallWeek } from "@/lib/weeklyCall";

describe("startOfCallWeek", () => {
  it("returns Monday noon of the current week", () => {
    expect(startOfCallWeek(new Date(2026, 9, 15, 14, 30))).toEqual(new Date(2026, 9, 12, 12));
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(startOfCallWeek(new Date(2026, 9, 18, 9))).toEqual(new Date(2026, 9, 12, 12));
  });

  it("still uses last Monday's noon on Monday morning", () => {
    expect(startOfCallWeek(new Date(2026, 9, 12, 11, 59))).toEqual(new Date(2026, 9, 5, 12));
  });

  it("switches to the new week at exactly Monday noon", () => {
    expect(startOfCallWeek(new Date(2026, 9, 12, 12))).toEqual(new Date(2026, 9, 12, 12));
  });
});

describe("calledThisWeek", () => {
  const wednesday = new Date(2026, 9, 14, 12);

  it("is false when no call has ever been logged", () => {
    expect(calledThisWeek(null, wednesday)).toBe(false);
  });

  it("is true for a call logged after Monday noon", () => {
    expect(calledThisWeek(new Date(2026, 9, 12, 13).toISOString(), wednesday)).toBe(true);
  });

  it("is false for a call logged Monday morning, before the reset", () => {
    expect(calledThisWeek(new Date(2026, 9, 12, 10).toISOString(), wednesday)).toBe(false);
  });

  it("keeps a Monday-morning call checked until noon", () => {
    const mondayMorning = new Date(2026, 9, 12, 11);
    expect(calledThisWeek(new Date(2026, 9, 12, 9).toISOString(), mondayMorning)).toBe(true);
  });
});
