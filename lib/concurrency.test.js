import { describe, it, expect } from "vitest";
import { runWithConcurrencyLimit } from "./concurrency";

describe("runWithConcurrencyLimit", () => {
  it("never runs more workers concurrently than the limit", async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const limit = 2;
    let running = 0;
    let maxRunning = 0;

    await runWithConcurrencyLimit(items, limit, async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running--;
    });

    expect(maxRunning).toBeLessThanOrEqual(limit);
    expect(maxRunning).toBe(limit); // actually achieved concurrency, not just sequential
  });

  it("processes every item exactly once, even with a limit smaller than the item count", async () => {
    const items = [1, 2, 3, 4, 5];
    const processed = [];

    await runWithConcurrencyLimit(items, 2, async (item) => {
      processed.push(item);
    });

    expect(processed.slice().sort()).toEqual(items.slice().sort());
    expect(processed).toHaveLength(items.length);
  });

  it("handles a limit larger than the item count without error", async () => {
    const items = [1, 2];
    const processed = [];

    await runWithConcurrencyLimit(items, 10, async (item) => {
      processed.push(item);
    });

    expect(processed.slice().sort()).toEqual([1, 2]);
  });

  it("does nothing for an empty item list", async () => {
    let calls = 0;
    await runWithConcurrencyLimit([], 5, async () => {
      calls++;
    });
    expect(calls).toBe(0);
  });

  it("keeps processing the rest of the batch when one worker throws, without rejecting overall", async () => {
    const items = [1, 2, 3, 4];
    const processed = [];

    await expect(
      runWithConcurrencyLimit(items, 2, async (item) => {
        if (item === 2) {
          throw new Error("boom");
        }
        processed.push(item);
      })
    ).resolves.toBeUndefined();

    expect(processed.slice().sort()).toEqual([1, 3, 4]);
  });
});
