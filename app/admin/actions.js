"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShortLink } from "@/lib/shortLinks";
import { sendAgentWelcomeEmail } from "@/lib/notify";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Every action here re-checks is_platform_owner itself, server-side —
// the /admin page redirects non-owners away, but a server action can be
// invoked directly regardless of which page rendered the button, so the
// page-level gate alone isn't enough.
async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) {
    throw new Error("Not authorized.");
  }

  return createAdminClient();
}

// Shared by both create flows below — generates the invite link and
// welcome email, the same "set your own password" path a real Stripe
// signup produces, rather than the owner having to relay a password.
async function createAgentLogin(admin, { agencyId, fullName, email }) {
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

// Manually onboards a new customer outside Stripe checkout — the only
// non-Stripe way to create an agency. subscriptionStatus is a plain label
// you set yourself (e.g. "active", "comped", "trialing"); no Stripe
// customer/subscription id gets attached, so the console shows these as
// "Manual" rather than Stripe-billed.
export async function createAgencyWithAgent({ agencyName, fullName, email, subscriptionStatus }) {
  const admin = await requireOwner();

  const name = agencyName?.trim();
  const agentName = fullName?.trim();
  const agentEmail = email?.trim();
  if (!name || !agentName || !agentEmail) {
    throw new Error("Agency name, agent name, and email are all required.");
  }

  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({ name, subscription_status: subscriptionStatus || "active" })
    .select()
    .single();

  if (agencyError) {
    throw new Error(agencyError.message);
  }

  try {
    await createAgentLogin(admin, { agencyId: agency.id, fullName: agentName, email: agentEmail });
  } catch (err) {
    await admin.from("agencies").delete().eq("id", agency.id);
    throw err;
  }

  revalidatePath("/admin");
}

// Adds a second (or third...) agent to an agency that already exists —
// there's no other way to do this anywhere in the app today, not even
// from within an agency's own Team page.
export async function addAgentToAgency({ agencyId, fullName, email }) {
  const admin = await requireOwner();

  const agentName = fullName?.trim();
  const agentEmail = email?.trim();
  if (!agencyId || !agentName || !agentEmail) {
    throw new Error("Agency, name, and email are all required.");
  }

  const { data: agency } = await admin.from("agencies").select("id").eq("id", agencyId).maybeSingle();
  if (!agency) {
    throw new Error("Couldn't find that agency.");
  }

  await createAgentLogin(admin, { agencyId, fullName: agentName, email: agentEmail });

  revalidatePath("/admin");
}

// Deliberately blocked if the agent still owns any Journeys — this list
// is a fast place to click, and one click shouldn't be able to silently
// orphan or lose real client data. Delete their Journeys first (from
// their own Journey pages), then remove the agent.
export async function deleteAgent(agentId) {
  const admin = await requireOwner();

  const { data: agent } = await admin
    .from("users")
    .select("id, is_platform_owner")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) {
    throw new Error("Couldn't find that agent.");
  }
  if (agent.is_platform_owner) {
    throw new Error("You can't delete the platform owner account.");
  }

  const { count } = await admin
    .from("journeys")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId);

  if (count && count > 0) {
    throw new Error(
      `This agent still owns ${count} Journey${count === 1 ? "" : "s"} — delete ${
        count === 1 ? "it" : "them"
      } first, then remove the agent.`
    );
  }

  const { error } = await admin.from("users").delete().eq("id", agentId);
  if (error) {
    throw new Error(error.message);
  }

  await admin.auth.admin.deleteUser(agentId).catch(() => {});

  revalidatePath("/admin");
}

// Removes every file under a folder in a given storage bucket. Safe to
// call even if the folder doesn't exist or is already empty.
async function purgeStorageFolder(admin, bucket, folder) {
  const { data: files } = await admin.storage.from(bucket).list(folder);
  if (files && files.length > 0) {
    await admin.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`));
  }
}

// Deletes an entire customer — every agent, Journey, milestone,
// document, photo, video, and login underneath it. Unlike deleteAgent,
// this always cascades: that's the entire point of removing a customer
// outright, so the UI must get a type-to-confirm before calling this.
export async function deleteAgency(agencyId) {
  const admin = await requireOwner();

  const { data: agency } = await admin
    .from("agencies")
    .select("id, name, trusted_contractors_image, maintenance_image, property_tax_image, home_value_image")
    .eq("id", agencyId)
    .maybeSingle();

  if (!agency) {
    throw new Error("Couldn't find that agency.");
  }

  const { data: agents } = await admin
    .from("users")
    .select("id, is_platform_owner")
    .eq("agency_id", agencyId);
  const agentIds = (agents || []).map((a) => a.id);

  if ((agents || []).some((a) => a.is_platform_owner)) {
    throw new Error("This agency has the platform owner's own account in it — it can't be deleted.");
  }

  if (agentIds.length > 0) {
    const { data: journeys } = await admin
      .from("journeys")
      .select("id, client_user_id")
      .in("agent_id", agentIds);

    for (const journey of journeys || []) {
      await Promise.all([
        admin.from("milestones").delete().eq("journey_id", journey.id),
        admin.from("documents").delete().eq("journey_id", journey.id),
        admin.from("weekly_updates").delete().eq("journey_id", journey.id),
        admin.from("property_photos").delete().eq("journey_id", journey.id),
        purgeStorageFolder(admin, "documents", journey.id),
        purgeStorageFolder(admin, "property-photos", journey.id),
      ]);

      if (journey.client_user_id) {
        await admin.auth.admin.deleteUser(journey.client_user_id).catch(() => {});
      }
    }

    await admin.from("journeys").delete().in("agent_id", agentIds);
  }

  const { data: videos } = await admin.from("videos").select("id, storage_path").eq("agency_id", agencyId);
  for (const video of videos || []) {
    if (video.storage_path) {
      await admin.storage.from("milestone-videos").remove([video.storage_path]);
    }
  }
  await admin.from("milestone_video_defaults").delete().eq("agency_id", agencyId);
  await admin.from("videos").delete().eq("agency_id", agencyId);

  const harborImagePaths = [
    agency.trusted_contractors_image,
    agency.maintenance_image,
    agency.property_tax_image,
    agency.home_value_image,
  ].filter(Boolean);
  if (harborImagePaths.length > 0) {
    await admin.storage.from("harbor-resources").remove(harborImagePaths);
  }

  for (const agentId of agentIds) {
    await admin.auth.admin.deleteUser(agentId).catch(() => {});
  }

  await admin.from("users").delete().eq("agency_id", agencyId);
  await admin.from("agencies").delete().eq("id", agencyId);

  revalidatePath("/admin");
}
