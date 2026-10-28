import { describe, it, expect, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (err) => {
    if (err?.digest?.startsWith("NEXT_")) throw err;
  },
}));

const { withActionErrors } = await import("./actionErrors");
const { runAction } = await import("./runAction");

describe("withActionErrors + runAction", () => {
  it("passes a successful result straight through", async () => {
    const action = withActionErrors(async (a, b) => ({ sum: a + b }));
    expect(await runAction(action(2, 3))).toEqual({ sum: 5 });
  });

  it("delivers a deliberate error's message to the client as a thrown Error", async () => {
    const action = withActionErrors(async () => {
      throw new Error("Too many sign-in attempts.");
    });
    expect(await action()).toEqual({ actionError: "Too many sign-in attempts." });
    await expect(runAction(action())).rejects.toThrow("Too many sign-in attempts.");
  });

  it("hides an unexpected error's internals", async () => {
    const action = withActionErrors(async () => {
      null.boom();
    });
    const result = await action();
    expect(result.actionError).toMatch(/Something went wrong/);
    expect(result.actionError).not.toMatch(/null/);
  });

  it("lets redirect() through untouched", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/bridge;307;" });
    const action = withActionErrors(async () => {
      throw redirect;
    });
    await expect(action()).rejects.toBe(redirect);
    await expect(runAction(action())).rejects.toBe(redirect);
  });

  it("turns a call that never completed into a connection message", async () => {
    await expect(runAction(Promise.reject(new TypeError("Failed to fetch")))).rejects.toThrow(/Couldn't reach Lighthouse/);
  });
});
