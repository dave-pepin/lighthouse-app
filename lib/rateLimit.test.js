import { describe, it, expect } from "vitest";
import { clientIp } from "./rateLimit";

function makeHeaders(entries) {
  return new Headers(entries);
}

describe("clientIp", () => {
  it("uses x-forwarded-for when it has a single IP", () => {
    expect(clientIp(makeHeaders({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("uses the first IP when x-forwarded-for has a comma-separated chain", () => {
    expect(clientIp(makeHeaders({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" }))).toBe(
      "203.0.113.5"
    );
  });

  it("trims whitespace around the first IP", () => {
    expect(clientIp(makeHeaders({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(clientIp(makeHeaders({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    expect(clientIp(makeHeaders({}))).toBe("unknown");
  });
});
