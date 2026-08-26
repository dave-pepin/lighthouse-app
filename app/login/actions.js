"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { clientIp, checkRateLimit } from "@/lib/rateLimit";

// Moves sign-in server-side — it used to be a direct browser call to
// supabase.auth.signInWithPassword from login/page.js — specifically so
// a rate limit can run before Supabase Auth ever sees the attempt. This
// is a second, app-level layer on top of Supabase Auth's own built-in
// rate limiting (configured in the Supabase dashboard under Auth → Rate
// Limits), not a replacement for it. Keyed by IP rather than email,
// since brute-forcing one account is exactly what per-IP throttling
// should catch regardless of which email is being guessed.
export async function signIn(email, password) {
  const h = await headers();
  const ip = clientIp(h);

  if (!(await checkRateLimit(`login:${ip}`, { limit: 10, windowSeconds: 300 }))) {
    throw new Error("Too many sign-in attempts. Please try again in a few minutes.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();

  return { isAgent: !!profile };
}
