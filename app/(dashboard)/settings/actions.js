"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPhoneNumber, releasePhoneNumber } from "@/lib/twilioNumbers";
import { revalidatePath } from "next/cache";

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

// An agent's own reply-to email — see add-agent-contact-migration.sql.
// Uses the admin client (bypassing RLS) but scoped to the caller's own
// verified id, the same "confirm identity, then mutate by id" pattern
// setAgentAccess uses, since there's no established RLS policy yet for an
// agent updating their own users row directly.
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
    })
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
