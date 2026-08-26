import { describe, it, expect } from "vitest";
import { nextDueMarketImpactDate, findMarketImpactDigestRecipients, buildMarketImpactDigestMessage } from "./marketImpactDigest";

describe("nextDueMarketImpactDate", () => {
  it("returns null when frequency is not set", () => {
    expect(nextDueMarketImpactDate("2025-08-24", null, null, new Date("2026-08-24"))).toBeNull();
  });

  it("returns null when the first anniversary hasn't arrived yet", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    expect(nextDueMarketImpactDate("2025-08-24", "annual", null, now)).toBeNull();
  });

  it("returns the first annual anniversary once it arrives", () => {
    const now = new Date("2026-08-24T12:00:00Z");
    const due = nextDueMarketImpactDate("2025-08-24", "annual", null, now);
    expect(due?.toISOString().slice(0, 10)).toBe("2026-08-24");
  });

  it("does not re-flag an anniversary that's already been notified", () => {
    const now = new Date("2026-08-24T12:00:00Z");
    const due = nextDueMarketImpactDate("2025-08-24", "annual", "2026-08-24T09:00:00Z", now);
    expect(due).toBeNull();
  });

  it("finds the next annual anniversary after one has already been notified", () => {
    const now = new Date("2027-08-25T00:00:00Z");
    const due = nextDueMarketImpactDate("2025-08-24", "annual", "2026-08-24T09:00:00Z", now);
    expect(due?.toISOString().slice(0, 10)).toBe("2027-08-24");
  });

  it("handles quarterly cadence", () => {
    const now = new Date("2025-11-24T00:00:00Z");
    const due = nextDueMarketImpactDate("2025-08-24", "quarterly", null, now);
    expect(due?.toISOString().slice(0, 10)).toBe("2025-11-24");
  });

  it("handles semiannual cadence", () => {
    const tooSoon = new Date("2026-02-23T00:00:00Z");
    expect(nextDueMarketImpactDate("2025-08-24", "semiannual", null, tooSoon)).toBeNull();
    const later = new Date("2026-02-25T00:00:00Z");
    const due = nextDueMarketImpactDate("2025-08-24", "semiannual", null, later);
    expect(due?.toISOString().slice(0, 10)).toBe("2026-02-24");
  });

  it("clamps a month-end closing date instead of rolling into the next month", () => {
    // Jan 31 closing, annual cadence — the 1-year anniversary should land
    // on Jan 31 the following year, not roll over.
    const now = new Date("2027-01-31T12:00:00Z");
    const due = nextDueMarketImpactDate("2026-01-31", "annual", null, now);
    expect(due?.toISOString().slice(0, 10)).toBe("2027-01-31");
  });

  it("clamps a Jan 31 closing at a quarterly cadence through February", () => {
    // Jan 31 + 1 quarter (3 months) = Apr 30 (Apr has 30 days), not May.
    const now = new Date("2026-05-01T00:00:00Z");
    const due = nextDueMarketImpactDate("2026-01-31", "quarterly", null, now);
    expect(due?.toISOString().slice(0, 10)).toBe("2026-04-30");
  });
});

describe("findMarketImpactDigestRecipients", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  const agents = [
    { id: "agent-a", email: "a@example.com", full_name: "Agent A", market_impact_report_frequency: "annual" },
    { id: "agent-b", email: "b@example.com", full_name: "Agent B", market_impact_report_frequency: null },
  ];

  it("includes a Harbor Journey whose annual anniversary is due", () => {
    const journeys = [
      { id: "j1", agent_id: "agent-a", client_name: "Smith", closed_at: "2025-08-24", last_market_impact_notified_at: null },
    ];

    const recipients = findMarketImpactDigestRecipients({ journeys, agents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].agentId).toBe("agent-a");
    expect(recipients[0].items).toHaveLength(1);
  });

  it("excludes an agent with the digest off entirely", () => {
    const journeys = [
      { id: "j2", agent_id: "agent-b", client_name: "Rivera", closed_at: "2025-08-24", last_market_impact_notified_at: null },
    ];

    const recipients = findMarketImpactDigestRecipients({ journeys, agents, now });
    expect(recipients).toEqual([]);
  });

  it("excludes a Journey with no closed_at (not actually in Harbor yet)", () => {
    const journeys = [{ id: "j3", agent_id: "agent-a", client_name: "Doe", closed_at: null, last_market_impact_notified_at: null }];
    const recipients = findMarketImpactDigestRecipients({ journeys, agents, now });
    expect(recipients).toEqual([]);
  });

  it("bundles multiple due Journeys under one agent into a single recipient", () => {
    const journeys = [
      { id: "j1", agent_id: "agent-a", client_name: "Smith", closed_at: "2025-08-24", last_market_impact_notified_at: null },
      { id: "j4", agent_id: "agent-a", client_name: "Nguyen", closed_at: "2024-08-24", last_market_impact_notified_at: "2025-08-24T09:00:00Z" },
    ];

    const recipients = findMarketImpactDigestRecipients({ journeys, agents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].items).toHaveLength(2);
  });

  it("excludes an agent with no email on file", () => {
    const noEmailAgents = [{ ...agents[0], email: null }];
    const journeys = [
      { id: "j1", agent_id: "agent-a", client_name: "Smith", closed_at: "2025-08-24", last_market_impact_notified_at: null },
    ];

    const recipients = findMarketImpactDigestRecipients({ journeys, agents: noEmailAgents, now });
    expect(recipients).toEqual([]);
  });
});

describe("buildMarketImpactDigestMessage", () => {
  it("includes each client's name and a link to their Journey", () => {
    const recipient = {
      agentId: "agent-a",
      email: "a@example.com",
      fullName: "Jane Agent",
      items: [
        { journey: { id: "j1", client_name: "Smith", closed_at: "2025-08-24" }, dueDate: new Date("2026-08-24") },
        { journey: { id: "j2", client_name: "Chen", closed_at: "2024-02-10" }, dueDate: new Date("2026-08-24") },
      ],
    };

    const message = buildMarketImpactDigestMessage(recipient, "https://lighthouse.example.com");

    expect(message).toContain("Hi Jane,");
    expect(message).toContain("2 clients");
    expect(message).toContain("Smith");
    expect(message).toContain("Chen");
    expect(message).toContain("https://lighthouse.example.com/journey/j1");
    expect(message).toContain("https://lighthouse.example.com/journey/j2");
  });

  it("uses singular wording for exactly one client", () => {
    const recipient = {
      agentId: "agent-a",
      email: "a@example.com",
      fullName: "Jane Agent",
      items: [{ journey: { id: "j1", client_name: "Smith", closed_at: "2025-08-24" }, dueDate: new Date("2026-08-24") }],
    };

    const message = buildMarketImpactDigestMessage(recipient, "https://lighthouse.example.com");

    expect(message).toContain("1 client is due");
  });
});
