#!/usr/bin/env node
// One-off recovery script: restores .env.local's Supabase credentials to
// production values pulled fresh from Vercel (via `vercel env pull`),
// after a botched backup left .env.local.pretest.bak also pointing at
// staging instead of the original production values. Never prints any
// secret value — reads and writes them programmatically only.
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
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    result[trimmed.slice(0, eq).trim()] = value;
  }
  return result;
}

const pulledPath = process.argv[2];
if (!pulledPath) {
  console.error("Usage: node scripts/restore-prod-supabase-env.mjs <path-to-vercel-pulled-env-file>");
  process.exit(1);
}

const localEnvPath = path.resolve(repoRoot, ".env.local");
const prod = parseEnvFile(pulledPath);

const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of keys) {
  if (!prod[key]) {
    console.error(`Missing ${key} in pulled Vercel env file`);
    process.exit(1);
  }
}

const lines = fs.readFileSync(localEnvPath, "utf-8").split("\n");
const seen = new Set();
const output = lines.map((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return line;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return line;
  const key = trimmed.slice(0, eq).trim();
  if (keys.includes(key)) {
    seen.add(key);
    return `${key}=${prod[key]}`;
  }
  return line;
});
for (const key of keys) {
  if (!seen.has(key)) output.push(`${key}=${prod[key]}`);
}

fs.writeFileSync(localEnvPath, output.join("\n"));
console.log("Restored .env.local's Supabase credentials to production values from Vercel.");
