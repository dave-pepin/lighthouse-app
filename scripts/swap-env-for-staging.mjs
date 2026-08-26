#!/usr/bin/env node
// Temporarily points .env.local's Supabase credentials at the staging
// branch (read from .env.test.local) instead of production, so
// `npm run dev` — and therefore the cron routes it serves — talks to
// staging for the duration of a local load-test run. Never touches
// Twilio/Resend/Stripe values.
//
// Always paired with `cp .env.local.pretest.bak .env.local` to restore
// afterward — see scripts/load-test.mjs's README-style usage note.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

function parseEnvFile(filePath) {
  const result = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

const testEnvPath = path.resolve(repoRoot, ".env.test.local");
const localEnvPath = path.resolve(repoRoot, ".env.local");

const staging = parseEnvFile(testEnvPath);
const required = ["STAGING_SUPABASE_URL", "STAGING_SUPABASE_ANON_KEY", "STAGING_SUPABASE_SERVICE_ROLE_KEY"];
for (const key of required) {
  if (!staging[key]) {
    console.error(`Missing ${key} in .env.test.local`);
    process.exit(1);
  }
}

const replacements = {
  NEXT_PUBLIC_SUPABASE_URL: staging.STAGING_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: staging.STAGING_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: staging.STAGING_SUPABASE_SERVICE_ROLE_KEY,
};

const lines = fs.readFileSync(localEnvPath, "utf-8").split("\n");
const seen = new Set();
const output = lines.map((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return line;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return line;
  const key = trimmed.slice(0, eq).trim();
  if (key in replacements) {
    seen.add(key);
    return `${key}=${replacements[key]}`;
  }
  return line;
});

for (const key of Object.keys(replacements)) {
  if (!seen.has(key)) output.push(`${key}=${replacements[key]}`);
}

fs.writeFileSync(localEnvPath, output.join("\n"));
console.log("Swapped .env.local's Supabase credentials to staging. Restore with:");
console.log("  cp .env.local.pretest.bak .env.local");
