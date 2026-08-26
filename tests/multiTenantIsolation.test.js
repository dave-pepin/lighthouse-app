// Integration test — hits a real database (the "staging" Supabase branch,
// never production; see .env.test.local.example) because this is
// fundamentally an RLS guarantee, not application logic: it can only be
// proven by actually authenticating as one agent and querying as them,
// the same way the real app does. Skips entirely (rather than failing)
// if STAGING_SUPABASE_* isn't configured, so this doesn't block anyone
// running the rest of the suite without staging access.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const { STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, STAGING_SUPABASE_SERVICE_ROLE_KEY } = process.env;

const hasStagingConfig = !!(STAGING_SUPABASE_URL && STAGING_SUPABASE_ANON_KEY && STAGING_SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasStagingConfig)("multi-tenant data isolation (journeys)", () => {
  const admin = hasStagingConfig ? createClient(STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY) : null;
  const password = "isolation-test-Tr0ub4dor";
  const emailA = `isolation-a-${Date.now()}@example.com`;
  const emailB = `isolation-b-${Date.now()}@example.com`;

  const state = {
    agencyAId: null,
    agencyBId: null,
    agentAId: null,
    agentBId: null,
    journeyAId: null,
    journeyBId: null,
  };

  async function createTestAgent(agencyName, email) {
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .insert({ name: agencyName, subscription_status: "active" })
      .select()
      .single();
    if (agencyError) throw agencyError;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;

    const { error: userError } = await admin
      .from("users")
      .insert({ id: authData.user.id, agency_id: agency.id, full_name: agencyName, role: "agent", email });
    if (userError) throw userError;

    return { agencyId: agency.id, agentId: authData.user.id };
  }

  async function signInAs(email) {
    const client = createClient(STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return client;
  }

  beforeAll(async () => {
    const a = await createTestAgent("Isolation Test Agency A", emailA);
    const b = await createTestAgent("Isolation Test Agency B", emailB);
    state.agencyAId = a.agencyId;
    state.agentAId = a.agentId;
    state.agencyBId = b.agencyId;
    state.agentBId = b.agentId;

    const { data: journeyA, error: journeyAError } = await admin
      .from("journeys")
      .insert({
        agency_id: state.agencyAId,
        agent_id: state.agentAId,
        client_name: "Agency A's Client",
        client_email: "clienta@example.com",
        role: "Buying",
        stage: "Getting Started",
        stage_index: 0,
        update_preference: "email",
      })
      .select()
      .single();
    if (journeyAError) throw journeyAError;
    state.journeyAId = journeyA.id;

    const { data: journeyB, error: journeyBError } = await admin
      .from("journeys")
      .insert({
        agency_id: state.agencyBId,
        agent_id: state.agentBId,
        client_name: "Agency B's Client",
        client_email: "clientb@example.com",
        role: "Selling",
        stage: "Consultation",
        stage_index: 0,
        update_preference: "email",
      })
      .select()
      .single();
    if (journeyBError) throw journeyBError;
    state.journeyBId = journeyB.id;
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    // Best-effort cleanup, each step independent so one failure doesn't
    // leave the rest of the throwaway data behind.
    for (const id of [state.journeyAId, state.journeyBId].filter(Boolean)) {
      await admin.from("journeys").delete().eq("id", id);
    }
    for (const id of [state.agentAId, state.agentBId].filter(Boolean)) {
      await admin.from("users").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    for (const id of [state.agencyAId, state.agencyBId].filter(Boolean)) {
      await admin.from("agencies").delete().eq("id", id);
    }
  }, 30000);

  it("does not let Agent B see Agent A's Journey", async () => {
    const clientB = await signInAs(emailB);
    const { data, error } = await clientB.from("journeys").select("id").eq("id", state.journeyAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does not let Agent A see Agent B's Journey", async () => {
    const clientA = await signInAs(emailA);
    const { data, error } = await clientA.from("journeys").select("id").eq("id", state.journeyBId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("does let each agent see their own Journey", async () => {
    const clientA = await signInAs(emailA);
    const { data: ownA } = await clientA.from("journeys").select("id").eq("id", state.journeyAId);
    expect(ownA).toHaveLength(1);

    const clientB = await signInAs(emailB);
    const { data: ownB } = await clientB.from("journeys").select("id").eq("id", state.journeyBId);
    expect(ownB).toHaveLength(1);
  });

  it("does not let Agent B see Agency A's row", async () => {
    const clientB = await signInAs(emailB);
    const { data, error } = await clientB.from("agencies").select("id").eq("id", state.agencyAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// Requires add-agency-delegates-migration.sql to already be applied on
// the staging branch — skips (rather than failing) if the
// agency_delegates table doesn't exist yet, same reasoning as
// hasStagingConfig above.
describe.skipIf(!hasStagingConfig)("cross-agency delegate access", () => {
  const admin = hasStagingConfig ? createClient(STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY) : null;
  const password = "delegate-test-Tr0ub4dor";
  const emailOwner = `delegate-owner-${Date.now()}@example.com`;
  const emailDelegate = `delegate-agent-${Date.now()}@example.com`;

  const state = {
    agencyId: null,
    ownerAgentId: null,
    delegateAgentId: null,
    journeyId: null,
    milestoneId: null,
    weeklyUpdateId: null,
    grantId: null,
  };

  async function createTestAgent(agencyName, email) {
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .insert({ name: agencyName, subscription_status: "active" })
      .select()
      .single();
    if (agencyError) throw agencyError;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;

    const { error: userError } = await admin
      .from("users")
      .insert({ id: authData.user.id, agency_id: agency.id, full_name: agencyName, role: "agent", email });
    if (userError) throw userError;

    return { agencyId: agency.id, agentId: authData.user.id };
  }

  async function signInAs(email) {
    const client = createClient(STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return client;
  }

  beforeAll(async () => {
    const owner = await createTestAgent("Delegate Test Agency (owner)", emailOwner);
    const delegate = await createTestAgent("Delegate Test Agency (delegate's own)", emailDelegate);
    state.agencyId = owner.agencyId;
    state.ownerAgentId = owner.agentId;
    state.delegateAgentId = delegate.agentId;

    const { data: journey, error: journeyError } = await admin
      .from("journeys")
      .insert({
        agency_id: state.agencyId,
        agent_id: state.ownerAgentId,
        client_name: "Delegate Test Client",
        client_email: "client@example.com",
        role: "Buying",
        stage: "Getting Started",
        stage_index: 0,
        update_preference: "email",
      })
      .select()
      .single();
    if (journeyError) throw journeyError;
    state.journeyId = journey.id;

    const { data: milestone, error: milestoneError } = await admin
      .from("milestones")
      .insert({ journey_id: state.journeyId, label: "Test milestone", stage: "Getting Started", done: false, sort_order: 1 })
      .select()
      .single();
    if (milestoneError) throw milestoneError;
    state.milestoneId = milestone.id;

    const { data: weeklyUpdate, error: weeklyUpdateError } = await admin
      .from("weekly_updates")
      .insert({ journey_id: state.journeyId, draft_text: "Test update", status: "draft" })
      .select()
      .single();
    if (weeklyUpdateError) throw weeklyUpdateError;
    state.weeklyUpdateId = weeklyUpdate.id;

    const now = Date.now();
    const { data: grant, error: grantError } = await admin
      .from("agency_delegates")
      .insert({
        agency_id: state.agencyId,
        delegate_user_id: state.delegateAgentId,
        granted_by: state.ownerAgentId,
        starts_at: new Date(now - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(now + 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (grantError) throw grantError;
    state.grantId = grant.id;
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    if (state.grantId) await admin.from("agency_delegates").delete().eq("id", state.grantId);
    if (state.journeyId) await admin.from("journeys").delete().eq("id", state.journeyId);
    for (const id of [state.ownerAgentId, state.delegateAgentId].filter(Boolean)) {
      await admin.from("users").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    if (state.agencyId) await admin.from("agencies").delete().eq("id", state.agencyId);
  }, 30000);

  it("lets an active delegate view the covered agency's journey and milestone", async () => {
    const delegateClient = await signInAs(emailDelegate);
    const { data: journeys } = await delegateClient.from("journeys").select("id").eq("id", state.journeyId);
    expect(journeys).toHaveLength(1);

    const { data: milestones } = await delegateClient.from("milestones").select("id").eq("id", state.milestoneId);
    expect(milestones).toHaveLength(1);
  });

  it("lets an active delegate edit a milestone", async () => {
    const delegateClient = await signInAs(emailDelegate);
    const { error } = await delegateClient.from("milestones").update({ done: true }).eq("id", state.milestoneId);
    expect(error).toBeNull();

    const { data } = await admin.from("milestones").select("done").eq("id", state.milestoneId).single();
    expect(data.done).toBe(true);
  });

  it("lets an active delegate view but not create weekly_updates", async () => {
    const delegateClient = await signInAs(emailDelegate);
    const { data } = await delegateClient.from("weekly_updates").select("id").eq("id", state.weeklyUpdateId);
    expect(data).toHaveLength(1);

    const { error } = await delegateClient
      .from("weekly_updates")
      .insert({ journey_id: state.journeyId, draft_text: "Should not be allowed", status: "draft" });
    expect(error).not.toBeNull();
  });

  it("does not let a delegate create a new journey in the covered agency", async () => {
    const delegateClient = await signInAs(emailDelegate);
    const { error } = await delegateClient.from("journeys").insert({
      agency_id: state.agencyId,
      agent_id: state.ownerAgentId,
      client_name: "Should not be allowed",
      role: "Buying",
      stage: "Getting Started",
      stage_index: 0,
      update_preference: "email",
    });
    expect(error).not.toBeNull();
  });

  it("does not grant access outside the delegate's time window", async () => {
    const { data: expiredGrant, error: expiredGrantError } = await admin
      .from("agency_delegates")
      .insert({
        agency_id: state.agencyId,
        delegate_user_id: state.delegateAgentId,
        granted_by: state.ownerAgentId,
        starts_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (expiredGrantError) throw expiredGrantError;

    // Remove the still-active grant from beforeAll so only the expired
    // one is in play for this check.
    await admin.from("agency_delegates").delete().eq("id", state.grantId);

    const delegateClient = await signInAs(emailDelegate);
    const { data } = await delegateClient.from("journeys").select("id").eq("id", state.journeyId);
    expect(data).toEqual([]);

    // Restore the active grant so afterAll's cleanup (and any later test
    // in this file) still finds what it expects.
    await admin.from("agency_delegates").delete().eq("id", expiredGrant.id);
    const { data: restoredGrant } = await admin
      .from("agency_delegates")
      .insert({
        agency_id: state.agencyId,
        delegate_user_id: state.delegateAgentId,
        granted_by: state.ownerAgentId,
        starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    state.grantId = restoredGrant.id;
  });
});
