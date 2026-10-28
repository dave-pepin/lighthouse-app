"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { clientIp, checkRateLimit } from "@/lib/rateLimit";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSetPasswordLink } from "@/lib/setPasswordLink";
import { sendPasswordResetEmail } from "@/lib/notify";

// Moves sign-in server-side — it used to be a direct browser call to
// supabase.auth.signInWithPassword from login/page.js — specifically so
// a rate limit can run before Supabase Auth ever sees the attempt. This
// is a second, app-level layer on top of Supabase Auth's own built-in
// rate limiting (configured in the Supabase dashboard under Auth → Rate
// Limits), not a replacement for it. Keyed by IP rather than email,
// since brute-forcing one account is exactly what per-IP throttling
// should catch regardless of which email is being guessed.
//
// Failures come back as { error } rather than being thrown: in production
// Next.js replaces a thrown Server Action error's message with a generic
// "An error occurred in the Server Components render..." so the person
// signing in would never see why it failed.
export async function signIn(email, password) {
  const h = await headers();
  const ip = clientIp(h);

  if (!(await checkRateLimit(`login:${ip}`, { limit: 10, windowSeconds: 300 }))) {
    return { error: "Too many sign-in attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email?.trim(), password });
  if (error) {
    if (error.code === "invalid_credentials" || error.message === "Invalid login credentials") {
      return { error: "That email and password don't match. Try again, or use \"Forgot password?\" to set a new one." };
    }
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();

  return { isAgent: !!profile };
}

// Exact, case-insensitive match for .ilike() — escapes the LIKE wildcards
// an email can legitimately contain (_ especially).
const likeExact = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// Which set-password page an account's reset link should land on, found
// the same way the rest of the app tells the three kinds of login apart:
// agents have a users row, title companies a title_company_contacts row,
// clients a Journey pointing at them. Returns null if no login exists.
async function findLoginForEmail(admin, email) {
  const { data: agent } = await admin.from("users").select("id").ilike("email", likeExact(email)).limit(1).maybeSingle();
  if (agent) return { userId: agent.id, path: "/agent/set-password" };

  const { data: titleContact } = await admin
    .from("title_company_contacts")
    .select("user_id")
    .ilike("email", likeExact(email))
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (titleContact) return { userId: titleContact.user_id, path: "/title/set-password" };

  const { data: journey } = await admin
    .from("journeys")
    .select("client_user_id")
    .ilike("client_email", likeExact(email))
    .not("client_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (journey) return { userId: journey.client_user_id, path: "/client/set-password" };

  return null;
}

// "Forgot password?" — emails a fresh set-password link. Always reports
// success whether or not the email has an account, so this can't be used
// to find out who's signed up. Also covers someone who never finished
// setting up from their original invite, since that link expires.
// Returns { error } on failure, for the same reason as signIn above.
export async function requestPasswordReset(email) {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Enter the email you sign in with." };
  }

  const h = await headers();
  const ip = clientIp(h);
  if (
    !(await checkRateLimit(`password-reset-ip:${ip}`, { limit: 5, windowSeconds: 900 })) ||
    !(await checkRateLimit(`password-reset-email:${trimmed}`, { limit: 3, windowSeconds: 3600 }))
  ) {
    return { error: "Too many reset requests. Please try again in a little while." };
  }

  const admin = createAdminClient();
  try {
    const login = await findLoginForEmail(admin, trimmed);
    if (!login) return {};

    // A revoked login stays revoked — a reset link would only lead to a
    // sign-in that fails anyway.
    const { data } = await admin.auth.admin.getUserById(login.userId);
    const authUser = data?.user;
    if (!authUser?.email) return {};
    const bannedUntil = authUser.banned_until;
    if (bannedUntil && new Date(bannedUntil).getTime() > Date.now()) return {};

    const setPasswordLink = await createSetPasswordLink(admin, { email: authUser.email, path: login.path });
    await sendPasswordResetEmail({ to: authUser.email, setPasswordLink });
  } catch (err) {
    Sentry.captureException(err);
    return { error: "Couldn't send the reset email right now. Please try again in a few minutes." };
  }
  return {};
}
