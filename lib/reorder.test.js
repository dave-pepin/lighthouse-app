import { describe, it, expect } from "vitest";
import { reorderById } from "./reorder";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("reorderById", () => {
  it("moves an item earlier in the list", () => {
    const result = reorderById(items, "d", "b");
    expect(result.map((i) => i.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an item later in the list", () => {
    const result = reorderById(items, "a", "c");
    expect(result.map((i) => i.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("moving an item onto itself is a no-op and returns the same array reference", () => {
    const result = reorderById(items, "b", "b");
    expect(result).toBe(items);
  });

  it("returns the original array unchanged if fromId isn't found", () => {
    const result = reorderById(items, "nonexistent", "b");
    expect(result).toBe(items);
  });

  it("returns the original array unchanged if toId isn't found", () => {
    const result = reorderById(items, "a", "nonexistent");
    expect(result).toBe(items);
  });

  it("never mutates the input array", () => {
    const original = [...items];
    reorderById(items, "d", "a");
    expect(items).toEqual(original);
  });

  it("preserves every item — no duplicates or drops", () => {
    const result = reorderById(items, "c", "a");
    expect(result).toHaveLength(items.length);
    expect(new Set(result.map((i) => i.id))).toEqual(new Set(["a", "b", "c", "d"]));
  });
});
