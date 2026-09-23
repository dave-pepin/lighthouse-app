import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure and succeeds on a later attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry when isRetryable returns false", async () => {
    const err = new Error("permanent");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { baseDelayMs: 1, isRetryable: () => false })).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops after maxAttempts even if every failure is retryable", async () => {
    const err = new Error("always fails");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { baseDelayMs: 1, maxAttempts: 3 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("passes the error to isRetryable so it can inspect it", async () => {
    const err = new Error("rate limited");
    err.status = 429;
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce("ok");
    const isRetryable = vi.fn((e) => e.status === 429);
    const result = await withRetry(fn, { baseDelayMs: 1, isRetryable });
    expect(result).toBe("ok");
    expect(isRetryable).toHaveBeenCalledWith(err);
  });
});
