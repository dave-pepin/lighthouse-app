#!/usr/bin/env node
// Seeds/measures/cleans up synthetic "hundreds of agents" scale data on
// the staging Supabase branch (never production — see
// .env.test.local.example), to load-test the two cron send loops
// (send-scheduled-updates, send-overdue-digest) without spending real
// Twilio/Resend money or touching a real inbox. Email-only: seeded
// journeys have no sms_phone_number, so update_preference is "email" and
// every send exercises Resend's real API against its own delivered@
// resend.dev magic address (a real call, nothing lands anywhere).
//
// Usage:
//   node scripts/load-test.mjs seed [count]      # default 300
//   node scripts/load-test.mjs run <baseUrl>     # e.g. http://localhost:3000
//   node scripts/load-test.mjs cleanup
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { runWithConcurrencyLimit } from "../lib/concurrency.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

// Same tiny loader as vitest.setup.mjs — process.env, not import.meta.env,
// and this runs as a plain node script rather than through Vite/Vitest.
const envPath = path.resolve(repoRoot, ".env.test.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
// CRON_SECRET (needed only for `run`) lives in .env.local instead.
const localEnvPath = path.resolve(repoRoot, ".env.local");
if (fs.existsSync(localEnvPath)) {
  for (const line of fs.readFileSync(localEnvPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const { STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!STAGING_SUPABASE_URL || !STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing STAGING_SUPABASE_URL/STAGING_SUPABASE_SERVICE_ROLE_KEY — see .env.test.local.example");
  process.exit(1);
}

const admin = createClient(STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY);

const STATE_PATH = path.resolve(repoRoot, ".load-test-state.json");
const PREFIX = "loadtest";
// Resend's magic "always delivered" test address — a real API call and
// response, but nothing is ever actually delivered to a real inbox.
const TEST_RECIPIENT_EMAIL = "delivered@resend.dev";
const SEED_CONCURRENCY = 10; // matches CONCURRENCY_LIMIT in the cron routes themselves

function loadState() {
  return fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) : null;
}
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function seedOne(i, runId, clientUserId, state) {
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({ name: `LoadTest-Agency-${runId}-${i}`, subscription_status: "active" })
    .select()
    .single();
  if (agencyError) throw agencyError;
  state.agencyIds.push(agency.id);

  // Auth needs a unique, real-shaped email per login but never actually
  // sends anything through Resend (email_confirm: true skips it), so
  // @example.com is fine here. users.email is a different story — it's
  // the actual digest recipient address (sendAgentEmail's `to`), and
  // Resend rejects @example.com outright as an invalid test domain in
  // live mode, which would force every batch containing one of these
  // agents to fail validation and fall back to individual sends. Use
  // Resend's own magic "always delivered" address there instead.
  const authEmail = `${PREFIX}-agent-${runId}-${i}@example.com`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: "load-test-Tr0ub4dor",
    email_confirm: true,
  });
  if (authError) throw authError;
  state.agentIds.push(authData.user.id);

  const { error: userError } = await admin.from("users").insert({
    id: authData.user.id,
    agency_id: agency.id,
    full_name: `LoadTest Agent ${i}`,
    role: "agent",
    email: TEST_RECIPIENT_EMAIL,
    overdue_digest_threshold_days: 1,
  });
  if (userError) throw userError;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const scheduledFor = new Date(Date.now() - 3600000).toISOString();

  const { data: journey, error: journeyError } = await admin
    .from("journeys")
    .insert({
      agency_id: agency.id,
      agent_id: authData.user.id,
      client_user_id: clientUserId,
      client_name: `LoadTest Client ${i}`,
      client_email: TEST_RECIPIENT_EMAIL,
      role: "Buying",
      stage: "Getting Started",
      stage_index: 0,
      financing_type: "financed",
      update_preference: "email",
    })
    .select()
    .single();
  if (journeyError) throw journeyError;
  state.journeyIds.push(journey.id);

  const { error: milestoneError } = await admin.from("milestones").insert({
    journey_id: journey.id,
    label: "Load test milestone",
    stage: "Getting Started",
    done: false,
    sort_order: 1,
    due_date: yesterday,
  });
  if (milestoneError) throw milestoneError;

  const { error: updateError } = await admin.from("weekly_updates").insert({
    journey_id: journey.id,
    draft_text: "This is a load-test weekly update — safe to ignore.",
    status: "scheduled",
    scheduled_for: scheduledFor,
  });
  if (updateError) throw updateError;
}

async function seed(count) {
  if (loadState()) {
    console.error("A previous load-test's data is still seeded — run `cleanup` first.");
    process.exit(1);
  }

  const runId = Date.now();
  const state = { runId, clientUserId: null, agencyIds: [], agentIds: [], journeyIds: [] };

  console.log(`Seeding ${count} synthetic agents/journeys on staging (run ${runId})...`);

  const { data: clientAuth, error: clientAuthError } = await admin.auth.admin.createUser({
    email: `${PREFIX}-client-${runId}@example.com`,
    password: "load-test-Tr0ub4dor",
    email_confirm: true,
  });
  if (clientAuthError) throw clientAuthError;
  state.clientUserId = clientAuth.user.id;
  saveState(state); // save early so cleanup can still find the client user if seeding fails partway

  let done = 0;
  await runWithConcurrencyLimit(Array.from({ length: count }, (_, i) => i), SEED_CONCURRENCY, async (i) => {
    await seedOne(i, runId, state.clientUserId, state);
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${count}`);
    saveState(state);
  });

  saveState(state);
  console.log(`Seeded ${count} agents. State saved to ${STATE_PATH}.`);
}

async function cleanup() {
  const state = loadState();
  if (!state) {
    console.log("No load-test state file found — nothing to clean up.");
    return;
  }

  console.log(
    `Cleaning up run ${state.runId}: ${state.journeyIds.length} journeys, ${state.agentIds.length} agents...`
  );

  await runWithConcurrencyLimit(state.journeyIds, SEED_CONCURRENCY, async (journeyId) => {
    await admin.from("weekly_updates").delete().eq("journey_id", journeyId);
    await admin.from("milestones").delete().eq("journey_id", journeyId);
    await admin.from("journeys").delete().eq("id", journeyId);
  });

  await runWithConcurrencyLimit(state.agentIds, SEED_CONCURRENCY, async (agentId) => {
    await admin.from("users").delete().eq("id", agentId);
    await admin.auth.admin.deleteUser(agentId).catch(() => {});
  });

  await runWithConcurrencyLimit(state.agencyIds, SEED_CONCURRENCY, async (agencyId) => {
    await admin.from("agencies").delete().eq("id", agencyId);
  });

  if (state.clientUserId) {
    await admin.auth.admin.deleteUser(state.clientUserId).catch(() => {});
  }

  fs.unlinkSync(STATE_PATH);
  console.log("Cleanup complete.");
}

async function run(baseUrl) {
  if (!baseUrl) {
    console.error("Usage: node scripts/load-test.mjs run <baseUrl>");
    process.exit(1);
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Missing CRON_SECRET in environment (see .env.local).");
    process.exit(1);
  }

  for (const endpoint of ["send-scheduled-updates", "send-overdue-digest"]) {
    const url = `${baseUrl}/api/cron/${endpoint}?secret=${encodeURIComponent(cronSecret)}`;
    console.log(`\nHitting ${endpoint}...`);
    const start = Date.now();
    const res = await fetch(url);
    const elapsed = Date.now() - start;
    const body = await res.json().catch(() => null);
    console.log(`  status: ${res.status}, elapsed: ${elapsed}ms`);
    if (body) {
      const { details, ...summary } = body;
      console.log(`  summary:`, summary);
      // Grouped by message rather than dumped item-by-item — hundreds of
      // identical errors are much more useful as a count than a wall of
      // repeated text.
      const counts = new Map();
      for (const d of details || []) {
        const key = d.error || "(no error message)";
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (counts.size > 0) {
        console.log(`  error breakdown:`);
        for (const [msg, count] of counts) console.log(`    ${count}x  ${msg}`);
      }
    }
  }
}

const [, , cmd, arg] = process.argv;
if (cmd === "seed") await seed(arg ? parseInt(arg, 10) : 300);
else if (cmd === "cleanup") await cleanup();
else if (cmd === "run") await run(arg);
else {
  console.error("Usage: node scripts/load-test.mjs <seed [count]|run <baseUrl>|cleanup>");
  process.exit(1);
}
