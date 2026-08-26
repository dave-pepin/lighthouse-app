"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPhoneNumber, releasePhoneNumber } from "@/lib/twilioNumbers";
import { revalidatePath } from "next/cache";

// Grants a colleague from a DIFFERENT agency time-boxed access to this
// agent's own agency (see add-agency-delegates-migration.sql) — e.g.
// covering the business while away. Looks the invitee up directly in
// public.users (every agent, regardless of agency, shares this one
// table) rather than the Auth Admin API, since she already has her own
// login elsewhere.
export async function grantDelegateAccess(email, startsAt, endsAt) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).maybeSingle();
  if (!profile?.agency_id) {
    throw new Error("Couldn't find your agency.");
  }

  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    throw new Error("An email is required.");
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Pick a valid start and end date, with the end after the start.");
  }

  // The RLS-scoped client can only see this agent's own agency's members
  // (see RLS_POLICIES.md's users SELECT policy) — looking up someone in a
  // different agency needs the admin client, same as team/actions.js's
  // setAgentAccess cross-agency check.
  const admin = createAdminClient();
  const { data: invitee } = await admin.from("users").select("id, agency_id").eq("email", trimmedEmail).maybeSingle();

  if (!invitee) {
    throw new Error("No Lighthouse agent found with that email — they need their own login first.");
  }
  if (invitee.agency_id === profile.agency_id) {
    throw new Error("They're already on your team, with full access — no need for this.");
  }

  const { error } = await supabase.from("agency_delegates").insert({
    agency_id: profile.agency_id,
    delegate_user_id: invitee.id,
    granted_by: user.id,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function revokeDelegateAccess(grantId) {
  const supabase = await createClient();
  const { error } = await supabase.from("agency_delegates").delete().eq("id", grantId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/settings");
}

export async function updateAgencyResources(agencyId, fields) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({
      trusted_contractors: fields.trustedContractors?.trim() || null,
      maintenance_note: fields.maintenanceNote?.trim() || null,
      property_tax_note: fields.propertyTaxNote?.trim() || null,
      referral_note: fields.referralNote?.trim() || null,
      home_value_note: fields.homeValueNote?.trim() || null,
      update_tone_notes: fields.updateToneNotes?.trim() || null,
    })
    .eq("id", agencyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

// Assigns (or clears, if videoId is null) which library video should
// automatically attach to a given template milestone — identified by
// role + stage + label — for every new Journey of that role going
// forward. Doesn't touch any already-created Journey's milestones.
export async function setMilestoneVideoDefault(role, stage, label, videoId) {
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

  if (videoId) {
    const { error } = await supabase.from("milestone_video_defaults").upsert(
      { agency_id: profile.agency_id, role, stage, label, video_id: videoId },
      { onConflict: "agency_id,role,stage,label" }
    );
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("milestone_video_defaults")
      .delete()
      .eq("agency_id", profile.agency_id)
      .eq("role", role)
      .eq("stage", stage)
      .eq("label", label);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/settings");
}

const IMAGE_FIELDS = [
  "trusted_contractors_image",
  "maintenance_image",
  "property_tax_image",
  "home_value_image",
];

export async function setAgencyResourceImage(agencyId, field, path) {
  if (!IMAGE_FIELDS.includes(field)) {
    throw new Error("Invalid image field.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({ [field]: path })
    .eq("id", agencyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

// An agent's own reply-to email plus optional display-only contact
// details (office address, cell/office phone, fax) shown on the client
// portal branding footer — see add-agent-contact-migration.sql and
// add-agent-contact-details-migration.sql. Uses the admin client
// (bypassing RLS) but scoped to the caller's own verified id, the same
// "confirm identity, then mutate by id" pattern setAgentAccess uses,
// since there's no established RLS policy yet for an agent updating
// their own users row directly.
export async function updateAgentContactInfo(fields) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      reply_to_email: fields.replyToEmail?.trim() || null,
      office_address: fields.officeAddress?.trim() || null,
      cell_phone: fields.cellPhone?.trim() || null,
      office_phone: fields.officePhone?.trim() || null,
      fax_number: fields.faxNumber?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

const BRANDING_IMAGE_FIELDS = ["profile_photo_path", "logo_path"];

// Records an agent's own uploaded photo or logo (or clears it, if path
// is null) — see add-agent-branding-migration.sql. Same "confirm
// identity, then mutate by id" pattern as updateAgentContactInfo above.
export async function setAgentBrandingImage(field, path) {
  if (!BRANDING_IMAGE_FIELDS.includes(field)) {
    throw new Error("Invalid image field.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ [field]: path })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

// An agent's own optional brand color, shown as a thin accent on their
// client portal footer — never a site-wide theme override (see
// PortalView.js). Empty/null clears it back to no color.
export async function updateAgentBrandColor(color) {
  const trimmed = color?.trim() || null;
  if (trimmed && !/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new Error("Enter a valid hex color, like #2F6F6B.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ brand_color: trimmed }).eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

// Lets an agent hide their name from the branding footer — useful when
// their logo already includes it. Defaults to true (shown) via the
// column default, see add-agent-branding-show-name-migration.sql.
export async function updateShowFooterName(show) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ show_footer_name: !!show }).eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/client/portal");
}

// How many days after a milestone's due date this agent wants to hear
// about it in the overdue digest — null means "off" entirely. See
// add-overdue-digest-threshold-migration.sql / lib/overdueDigest.js.
// Same "confirm identity, then mutate by id" pattern as
// updateAgentContactInfo above (no established RLS policy yet for an
// agent updating their own users row directly).
export async function updateOverdueDigestPreference(thresholdDays) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ overdue_digest_threshold_days: thresholdDays })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

// Self-serve: buys the agent a real, dedicated Twilio number and attaches
// it to Lighthouse's shared, already-approved 10DLC campaign — no per-
// agent compliance step. This is a real purchase (Twilio bills the
// platform account ~$1-2/mo per number for as long as it's held), so the
// UI must get explicit confirmation before calling this.
export async function provisionMyPhoneNumber(areaCode) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("sms_phone_number")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.sms_phone_number) {
    throw new Error("You already have a texting number. Release it first if you want a different one.");
  }

  const { phoneNumber, phoneNumberSid } = await provisionPhoneNumber(areaCode?.trim() || undefined);

  const { error } = await admin
    .from("users")
    .update({ sms_phone_number: phoneNumber, twilio_phone_number_sid: phoneNumberSid })
    .eq("id", user.id);

  if (error) {
    // Don't leave an orphaned, still-billing number behind if the DB
    // write that was supposed to claim it fails.
    await releasePhoneNumber(phoneNumberSid).catch(() => {});
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  return phoneNumber;
}

// Gives the number back to Twilio so billing for it stops. The agent's
// SMS sends fall back to the shared messaging service afterward.
export async function releaseMyPhoneNumber() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("twilio_phone_number_sid")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.twilio_phone_number_sid) {
    await releasePhoneNumber(existing.twilio_phone_number_sid);
  }

  const { error } = await admin
    .from("users")
    .update({ sms_phone_number: null, twilio_phone_number_sid: null })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}
