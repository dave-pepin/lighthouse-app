import { describe, it, expect } from "vitest";
import { isEligibleForDigest, daysOverdue, findOverdueDigestRecipients, buildDigestMessage } from "./overdueDigest";

describe("isEligibleForDigest", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  it("is eligible when never sent before", () => {
    expect(isEligibleForDigest(null, now)).toBe(true);
  });

  it("is not eligible 1 hour after the last send", () => {
    expect(isEligibleForDigest("2026-08-24T11:00:00Z", now)).toBe(false);
  });

  it("is eligible 21 hours after the last send", () => {
    expect(isEligibleForDigest("2026-08-23T15:00:00Z", now)).toBe(true);
  });

  it("is not eligible exactly at the 20-hour boundary", () => {
    expect(isEligibleForDigest("2026-08-23T16:00:00Z", now)).toBe(false);
  });
});

describe("daysOverdue", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  it("is 0 for a milestone due today", () => {
    expect(daysOverdue("2026-08-24", now)).toBe(0);
  });

  it("is 1 for a milestone due yesterday", () => {
    expect(daysOverdue("2026-08-23", now)).toBe(1);
  });

  it("is 14 for a milestone due two weeks ago", () => {
    expect(daysOverdue("2026-08-10", now)).toBe(14);
  });
});

describe("findOverdueDigestRecipients", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  const journeys = [
    { id: "j1", agent_id: "agent-a", client_name: "Smith" },
    { id: "j2", agent_id: "agent-a", client_name: "Chen" },
    { id: "j3", agent_id: "agent-b", client_name: "Rivera" },
  ];

  const agents = [
    {
      id: "agent-a",
      email: "a@example.com",
      full_name: "Agent A",
      last_overdue_digest_sent_at: null,
      overdue_digest_threshold_days: 1,
    },
    {
      id: "agent-b",
      email: "b@example.com",
      full_name: "Agent B",
      last_overdue_digest_sent_at: null,
      overdue_digest_threshold_days: 1,
    },
  ];

  it("groups multiple overdue milestones across multiple Journeys under one agent", () => {
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" },
      { id: "m2", journey_id: "j2", label: "Walkthrough", due_date: "2026-08-20" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].agentId).toBe("agent-a");
    expect(recipients[0].items).toHaveLength(2);
  });

  it("keeps two agents' overdue sets independent", () => {
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" },
      { id: "m3", journey_id: "j3", label: "Appraisal", due_date: "2026-08-15" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents, now });

    expect(recipients).toHaveLength(2);
    const byAgent = Object.fromEntries(recipients.map((r) => [r.agentId, r]));
    expect(byAgent["agent-a"].items).toHaveLength(1);
    expect(byAgent["agent-b"].items).toHaveLength(1);
  });

  it("excludes an agent who was digested less than 20 hours ago", () => {
    const recentAgents = [
      { ...agents[0], last_overdue_digest_sent_at: "2026-08-24T11:00:00Z" },
      agents[1],
    ];
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" },
      { id: "m3", journey_id: "j3", label: "Appraisal", due_date: "2026-08-15" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents: recentAgents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].agentId).toBe("agent-b");
  });

  it("excludes an agent with no email on file", () => {
    const noEmailAgents = [{ ...agents[0], email: null }, agents[1]];
    const candidateMilestones = [{ id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" }];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents: noEmailAgents, now });

    expect(recipients).toEqual([]);
  });

  it("returns nothing when there are no candidate milestones", () => {
    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones: [], agents, now });
    expect(recipients).toEqual([]);
  });

  it("includes a milestone due today only when the agent's threshold is 0", () => {
    const candidateMilestones = [{ id: "m1", journey_id: "j1", label: "Final walkthrough", due_date: "2026-08-24" }];

    const withDefaultThreshold = findOverdueDigestRecipients({ journeys, candidateMilestones, agents, now });
    expect(withDefaultThreshold).toEqual([]);

    const zeroThresholdAgents = [{ ...agents[0], overdue_digest_threshold_days: 0 }, agents[1]];
    const withZeroThreshold = findOverdueDigestRecipients({
      journeys,
      candidateMilestones,
      agents: zeroThresholdAgents,
      now,
    });
    expect(withZeroThreshold).toHaveLength(1);
    expect(withZeroThreshold[0].items).toHaveLength(1);
  });

  it("excludes an agent entirely when their threshold is null (digest off)", () => {
    const offAgents = [{ ...agents[0], overdue_digest_threshold_days: null }, agents[1]];
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" },
      { id: "m3", journey_id: "j3", label: "Appraisal", due_date: "2026-08-15" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents: offAgents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].agentId).toBe("agent-b");
  });

  it("excludes a milestone that hasn't reached a 3-day threshold yet, but includes one that has", () => {
    const threeDayAgents = [{ ...agents[0], overdue_digest_threshold_days: 3 }, agents[1]];
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Two days overdue", due_date: "2026-08-22" },
      { id: "m2", journey_id: "j2", label: "Three days overdue", due_date: "2026-08-21" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys, candidateMilestones, agents: threeDayAgents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].items).toHaveLength(1);
    expect(recipients[0].items[0].milestone.label).toBe("Three days overdue");
  });

  it("excludes a Journey an agent has individually paused, without affecting their other Journeys", () => {
    const pausedJourneys = [{ ...journeys[0], overdue_digest_paused: true }, journeys[1], journeys[2]];
    const candidateMilestones = [
      { id: "m1", journey_id: "j1", label: "Inspection", due_date: "2026-08-10" },
      { id: "m2", journey_id: "j2", label: "Walkthrough", due_date: "2026-08-20" },
    ];

    const recipients = findOverdueDigestRecipients({ journeys: pausedJourneys, candidateMilestones, agents, now });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].agentId).toBe("agent-a");
    expect(recipients[0].items).toHaveLength(1);
    expect(recipients[0].items[0].journey.id).toBe("j2");
  });
});

describe("buildDigestMessage", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  it("groups items by Journey and includes a link to each", () => {
    const recipient = {
      agentId: "agent-a",
      email: "a@example.com",
      fullName: "Jane Agent",
      items: [
        { journey: { id: "j1", client_name: "Smith" }, milestone: { label: "Inspection", due_date: "2026-08-10" } },
        { journey: { id: "j2", client_name: "Chen" }, milestone: { label: "Walkthrough", due_date: "2026-08-20" } },
      ],
    };

    const message = buildDigestMessage(recipient, "https://lighthouse.example.com", now);

    expect(message).toContain("Hi Jane,");
    expect(message).toContain("2 milestones");
    expect(message).toContain("Smith");
    expect(message).toContain("Chen");
    expect(message).toContain("https://lighthouse.example.com/journey/j1");
    expect(message).toContain("https://lighthouse.example.com/journey/j2");
    expect(message).toContain("14 days overdue");
    expect(message).toContain("4 days overdue");
  });

  it("uses singular wording for exactly one item", () => {
    const recipient = {
      agentId: "agent-a",
      email: "a@example.com",
      fullName: "Jane Agent",
      items: [{ journey: { id: "j1", client_name: "Smith" }, milestone: { label: "Inspection", due_date: "2026-08-23" } }],
    };

    const message = buildDigestMessage(recipient, "https://lighthouse.example.com", now);

    expect(message).toContain("1 milestone that needs attention");
    expect(message).toContain("1 day overdue");
  });

  it("renders a due-today item as 'due today', not '0 days overdue'", () => {
    const recipient = {
      agentId: "agent-a",
      email: "a@example.com",
      fullName: "Jane Agent",
      items: [{ journey: { id: "j1", client_name: "Smith" }, milestone: { label: "Final walkthrough", due_date: "2026-08-24" } }],
    };

    const message = buildDigestMessage(recipient, "https://lighthouse.example.com", now);

    expect(message).toContain("due today");
    expect(message).not.toContain("0 days overdue");
  });
});
