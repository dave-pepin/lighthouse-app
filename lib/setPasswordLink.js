import { headers } from "next/headers";
import { createShortLink } from "@/lib/shortLinks";

// A fresh one-time "set your password" link for an Auth user who already
// exists — used to resend a teammate's expired invite and for "Forgot
// password?". `path` is the set-password page to land on
// (/agent/set-password, /client/set-password, /title/set-password); each
// one turns the link's session tokens into a session and lets them pick a
// new password. Wrapped in a short link like every other one-time link, so
// email scanners can't burn it (see app/i/[code]/route.js).
//
// Tries "invite" first: while an account is still unconfirmed (invited but
// never set up), Supabase re-issues the original invite. Once confirmed it
// refuses, and "recovery" is the right link anyway.
export async function createSetPasswordLink(admin, { email, path }) {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;
  const options = { redirectTo: `${origin}${path}` };

  let { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options });
  if (error) {
    ({ data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options }));
  }
  if (error || !data?.properties?.action_link) {
    throw new Error(`Couldn't create a set-password link: ${error?.message || "unknown error"}`);
  }

  return createShortLink(admin, data.properties.action_link, origin);
}
