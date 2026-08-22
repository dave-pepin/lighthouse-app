// Loads .env.test.local (gitignored, staging-branch credentials only —
// see .env.test.local.example) so integration tests can read
// STAGING_SUPABASE_* without every dev needing it globally exported.
// Explicit rather than relying on Vite's own env-file auto-loading,
// since that populates import.meta.env, not process.env, in a Node
// test environment.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, ".env.test.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
