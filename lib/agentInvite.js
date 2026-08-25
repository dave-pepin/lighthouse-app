import { createShortLink } from "@/lib/shortLinks";
import { sendAgentWelcomeEmail } from "@/lib/notify";
import { headers } from "next/headers";

// Creates a new agent login the same way for every path that creates
// one — the platform-owner /admin console and self-serve Team invites
// both end up here. Generates a Supabase invite link, creates the users
// row, and emails a welcome message with a short-lived set-password
// link. Rolls back the auth user if the users-row insert fails, so a
// failed invite never leaves an orphaned login behind.
export async function createAgentLogin(admin, { agencyId, fullName, email }) {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;
  const redirectTo = `${origin}/agent/set-password`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.user?.id) {
    throw new Error(`Couldn't create the agent's login: ${linkError?.message || "unknown error"}`);
  }

  const newUserId = linkData.user.id;

  const { error: userError } = await admin.from("users").insert({
    id: newUserId,
    agency_id: agencyId,
    full_name: fullName,
    role: "agent",
    email,
  });

  if (userError) {
    await admin.auth.admin.deleteUser(newUserId);
    throw new Error(userError.message);
  }

  const setPasswordLink = await createShortLink(admin, linkData.properties.action_link, origin);
  await sendAgentWelcomeEmail({ to: email, fullName, setPasswordLink });
}
