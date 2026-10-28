"use server";

import { withActionErrors } from "@/lib/actionErrors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentLogin } from "@/lib/agentInvite";
import { createSetPasswordLink } from "@/lib/setPasswordLink";
import { sendAgentWelcomeEmail } from "@/lib/notify";
import { checkRateLimit } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

// Lets any agent add a teammate to their own agency — no agency id is
// ever taken from the client here, it's read straight off the caller's
// own users row, so there's no cross-agency parameter to forge (simpler
// than the "verify then admin-write" pattern setAgentAccess below needs,
// since that one does take another agent's id as an argument).
export const inviteTeamMember = withActionErrors(async function inviteTeamMember(fullName, email) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const trimmedName = fullName?.trim();
  const trimmedEmail = email?.trim();
  if (!trimmedName || !trimmedEmail) {
    throw new Error("Name and email are both required.");
  }

  const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).maybeSingle();
  if (!profile?.agency_id) {
    throw new Error("Couldn't find your agency.");
  }

  // Same reasoning as inviteClient's limit (journey/[id]/actions.js) —
  // this always requires a real signed-in agent session already, so
  // nothing else stops a compromised account from spamming invites.
  if (!(await checkRateLimit(`invite-team:${user.id}`, { limit: 5, windowSeconds: 600 }))) {
    throw new Error("Too many invites sent recently. Please try again in a few minutes.");
  }

  const admin = createAdminClient();
  await createAgentLogin(admin, { agencyId: profile.agency_id, fullName: trimmedName, email: trimmedEmail });

  revalidatePath("/team");
});

// Same "no real permanent option" workaround used for client access —
// see setClientAccess in journey/[id]/actions.js.
const INDEFINITE_BAN = "876000h";

// Suspends (or restores) another agent's ability to log in. Only affects
// their own Auth login — doesn't touch any Journeys, clients, or data
// they own, since those stay visible to the rest of the agency either way.
export const setAgentAccess = withActionErrors(async function setAgentAccess(agentId, revoke) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  if (agentId === user.id) {
    throw new Error("You can't revoke your own access.");
  }

  const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).maybeSingle();
  if (!profile?.agency_id) {
    throw new Error("Couldn't find your agency.");
  }

  const admin = createAdminClient();

  // Verify the target agent is actually in the caller's own agency before
  // touching their login — this action takes a raw ID, so this check is
  // the only thing stopping one agency from reaching into another's.
  const { data: target } = await admin.from("users").select("agency_id").eq("id", agentId).maybeSingle();
  if (!target || target.agency_id !== profile.agency_id) {
    throw new Error("That agent isn't part of your agency.");
  }

  const { error } = await admin.auth.admin.updateUserById(agentId, {
    ban_duration: revoke ? INDEFINITE_BAN : "none",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
});

// Sends a teammate who never finished setting up their login a fresh
// set-password link — the original invite link is one-time-use and expires
// quickly, and without this there was no way to get them a new one. Same
// "verify they're in the caller's agency, then act as admin" shape as
// setAgentAccess, since this also takes another agent's raw id.
export const resendAgentInvite = withActionErrors(async function resendAgentInvite(agentId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).maybeSingle();
  if (!profile?.agency_id) {
    throw new Error("Couldn't find your agency.");
  }

  const admin = createAdminClient();

  const { data: target } = await admin.from("users").select("agency_id, full_name").eq("id", agentId).maybeSingle();
  if (!target || target.agency_id !== profile.agency_id) {
    throw new Error("That agent isn't part of your agency.");
  }

  const { data: authData } = await admin.auth.admin.getUserById(agentId);
  const authUser = authData?.user;
  if (!authUser?.email) {
    throw new Error("That agent has no email on file.");
  }
  if (authUser.last_sign_in_at) {
    throw new Error("They've already set up their login. They can use \"Forgot password?\" on the sign-in page.");
  }

  if (!(await checkRateLimit(`invite-team:${user.id}`, { limit: 5, windowSeconds: 600 }))) {
    throw new Error("Too many invites sent recently. Please try again in a few minutes.");
  }

  const setPasswordLink = await createSetPasswordLink(admin, { email: authUser.email, path: "/agent/set-password" });
  await sendAgentWelcomeEmail({ to: authUser.email, fullName: target.full_name || "there", setPasswordLink });

  revalidatePath("/team");
});
