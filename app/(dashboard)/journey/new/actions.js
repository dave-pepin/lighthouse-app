"use server";

import { createClient } from "@/lib/supabase/server";
import { stagesForRole } from "@/components/CourseLine";
import { buildMilestoneTemplate, MILESTONE_STAGE_ORDER } from "@/lib/milestoneTemplates";
import { toE164 } from "@/lib/phone";
import { redirect } from "next/navigation";

export async function createJourney(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id, full_name")
    .eq("id", user.id)
    .single();

  const clientName = formData.get("client_name")?.toString().trim();
  const role = formData.get("role")?.toString();
  const stage = formData.get("stage")?.toString();
  const financingType = formData.get("financing_type")?.toString();
  const nextAction = formData.get("next_action")?.toString().trim() || null;
  const propertyAddress = formData.get("property_address")?.toString().trim() || null;
  const updatePreference = formData.get("update_preference")?.toString();
  const clientEmail = formData.get("client_email")?.toString().trim() || null;
  const rawClientPhone = formData.get("client_phone")?.toString().trim() || null;
  const clientEmail2 = formData.get("client_email_2")?.toString().trim() || null;
  const rawClientPhone2 = formData.get("client_phone_2")?.toString().trim() || null;

  if (!clientName || !role || !stage || !updatePreference || !financingType) {
    throw new Error("Missing required fields.");
  }

  // Normalize to the +1XXXXXXXXXX format Twilio requires. Catching a bad
  // number here — instead of finding out silently when the text fails to
  // send — is the whole point of this check.
  const clientPhone = rawClientPhone ? toE164(rawClientPhone) : null;
  if (rawClientPhone && !clientPhone) {
    throw new Error(
      "That doesn't look like a valid phone number. Use a 10-digit US number, e.g. 555-123-4567."
    );
  }
  if ((updatePreference === "sms" || updatePreference === "both") && !clientPhone) {
    throw new Error("A phone number is required to send text updates.");
  }

  const clientPhone2 = rawClientPhone2 ? toE164(rawClientPhone2) : null;
  if (rawClientPhone2 && !clientPhone2) {
    throw new Error(
      "The additional phone number doesn't look valid. Use a 10-digit US number, e.g. 555-123-4567."
    );
  }

  const stageIndex = stagesForRole(role).indexOf(stage);

  // Put brand-new Journeys at the very top of the agent's manually
  // ordered Bridge list — matching where they'd land under the old
  // "most recently active first" default, without needing to renumber
  // every other Journey.
  const { data: lowestSortRow } = await supabase
    .from("journeys")
    .select("bridge_sort_order")
    .eq("agency_id", profile.agency_id)
    .order("bridge_sort_order", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const bridgeSortOrder = (lowestSortRow?.bridge_sort_order ?? 1) - 1;

  const { data: journey, error } = await supabase
    .from("journeys")
    .insert({
      agency_id: profile.agency_id,
      agent_id: user.id,
      client_name: clientName,
      role,
      stage,
      stage_index: stageIndex === -1 ? 0 : stageIndex,
      financing_type: financingType,
      next_action: nextAction,
      property_address: propertyAddress,
      update_preference: updatePreference,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_email_2: clientEmail2,
      client_phone_2: clientPhone2,
      bridge_sort_order: bridgeSortOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Auto-generate the standard milestone checklist for this role and
  // financing type, across every stage, so the order of events is set
  // from day one.
  const template = buildMilestoneTemplate(role, financingType);

  // Pull any videos the agent has already assigned as defaults for this
  // role (in Settings) so brand-new milestones can start pre-attached —
  // no per-client upload needed. Keyed by "stage::label" for lookup below.
  const { data: videoDefaults } = await supabase
    .from("milestone_video_defaults")
    .select("stage, label, video_id")
    .eq("agency_id", profile.agency_id)
    .eq("role", role);
  const videoDefaultsByKey = {};
  for (const d of videoDefaults || []) {
    videoDefaultsByKey[`${d.stage}::${d.label}`] = d.video_id;
  }

  const rows = [];
  let order = 1;
  for (const stageName of MILESTONE_STAGE_ORDER[role] || MILESTONE_STAGE_ORDER.Buying) {
    const labels = template[stageName] || [];
    for (const label of labels) {
      rows.push({
        journey_id: journey.id,
        label,
        stage: stageName,
        done: false,
        sort_order: order++,
        video_id: videoDefaultsByKey[`${stageName}::${label}`] || null,
      });
    }
  }
  if (rows.length > 0) {
    await supabase.from("milestones").insert(rows);
  }

  // Give this Journey a first draft weekly update to work with.
  await supabase.from("weekly_updates").insert({
    journey_id: journey.id,
    draft_text: "",
    status: "draft",
  });

  // No message of any kind goes out at creation time — an agent may set a
  // Journey up long before they're ready for the client to hear anything
  // from Lighthouse. The opt-in confirmation SMS (required to actually
  // fire, per Twilio's A2P 10DLC registration, not just exist on paper)
  // now sends from inviteClient instead, alongside the portal invite —
  // the one deliberate, explicit trigger for all client-facing contact.

  redirect(`/journey/${journey.id}`);
}
