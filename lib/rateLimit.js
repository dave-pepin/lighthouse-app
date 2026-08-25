import { createAdminClient } from "@/lib/supabase/admin";

// Best-guess client IP from the standard proxy header Vercel's edge
// network sets. Deterrence against casual abuse/bots, not a hard
// security boundary — a determined attacker behind rotating proxies can
// still look like a fresh IP each time.
export function clientIp(requestHeaders) {
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}

// Checks and records one hit against a named limit. Backed by the
// check_rate_limit Postgres function (add-rate-limit-migration.sql) —
// atomic, self-cleaning. Fails open on error: a broken rate limiter
// shouldn't be able to take down real signups or invite links.
export async function checkRateLimit(key, { limit, windowSeconds }) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return true;
  return data;
}
