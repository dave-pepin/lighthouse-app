"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendUpdateSms, sendInviteEmail, sendInviteSms } from "@/lib/notify";
import { dispatchWeeklyUpdate } from "@/lib/weeklyUpdateSend";
import { toE164 } from "@/lib/phone";
import { stagesForRole } from "@/components/CourseLine";
import { generateText } from "@/lib/openai";
import { createShortLink } from "@/lib/shortLinks";

export async function updateClientInfo(
  journeyId,
  { clientName, clientEmail, clientPhone, clientEmail2, clientPhone2, updatePreference }
) {
  const supabase = await createClient();

  const trimmedName = clientName?.trim();
  if (!trimmedName) {
    throw new Error("Client name is required.");
  }

  const rawPhone = clientPhone?.trim() || null;
  const normalizedPhone = rawPhone ? toE164(rawPhone) : null;
  if (rawPhone && !normalizedPhone) {
    throw new Error(
      "That doesn't look like a valid phone number. Use a 10-digit US number, e.g. 555-123-4567."
    );
  }

  const rawPhone2 = clientPhone2?.trim() || null;
  const normalizedPhone2 = rawPhone2 ? toE164(rawPhone2) : null;
  if (rawPhone2 && !normalizedPhone2) {
    throw new Error(
      "The additional phone number doesn't look valid. Use a 10-digit US number, e.g. 555-123-4567."
    );
  }

  const trimmedEmail = clientEmail?.trim() || null;
  const trimmedEmail2 = clientEmail2?.trim() || null;
  const wantsSms = updatePreference === "sms" || updatePreference === "both";
  const wantsEmail = updatePreference === "email" || updatePreference === "both";

  if (wantsSms && !normalizedPhone) {
    throw new Error("A phone number is required to send text updates.");
  }
  if (wantsEmail && !trimmedEmail) {
    throw new Error("An email address is required to send email updates.");
  }

  await supabase
    .from("journeys")
    .update({
      client_name: trimmedName,
      client_email: trimmedEmail,
      client_phone: normalizedPhone,
      client_email_2: trimmedEmail2,
      client_phone_2: normalizedPhone2,
      update_preference: updatePreference,
    })
    .eq("id", journeyId);

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/bridge");
}

export async function setPropertyAddress(journeyId, address) {
  const supabase = await createClient();
  await supabase
    .from("journeys")
    .update({ property_address: address?.trim() || null })
    .eq("id", journeyId);
  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/bridge");
}

export async function setClosedDate(journeyId, date) {
  const supabase = await createClient();
  await supabase
    .from("journeys")
    .update({ closed_at: date || null })
    .eq("id", journeyId);
  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/harbor");
}

export async function setAnniversaryReminder(journeyId, enabled) {
  const supabase = await createClient();
  await supabase
    .from("journeys")
    .update({ anniversary_reminder_enabled: enabled })
    .eq("id", journeyId);
  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/harbor");
}

const STATUS_LEVELS = ["on_course", "caution", "danger"];

// Backs the sailboat status badge. needs_guidance is intentionally left
// alone here (unused elsewhere going forward) rather than dropped, so
// nothing else that might reference it breaks.
export async function setJourneyStatus(journeyId, statusLevel, guidanceNote) {
  const supabase = await createClient();

  const level = STATUS_LEVELS.includes(statusLevel) ? statusLevel : "on_course";

  await supabase
    .from("journeys")
    .update({
      status_level: level,
      guidance_note: level === "on_course" ? null : guidanceNote?.trim() || null,
    })
    .eq("id", journeyId);

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/bridge");
}

// Starts a fresh, editable weekly update once the current one has already
// been sent (or held) — there's otherwise no way to begin the next week's
// update, since the detail page only ever shows the most recent row.
export async function startNewUpdate(journeyId) {
  const supabase = await createClient();
  await supabase.from("weekly_updates").insert({
    journey_id: journeyId,
    draft_text: "",
    status: "draft",
  });
  revalidatePath(`/journey/${journeyId}`);
}

export async function suggestUpdateMessage(journeyId) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You need to be signed in to do that.");
  }

  const { data: journey } = await supabase
    .from("journeys")
    .select("client_name, role, stage, property_address, agent_id")
    .eq("id", journeyId)
    .single();
  if (!journey) {
    throw new Error("Couldn't find that Journey.");
  }

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, label, done, due_date, date_type")
    .eq("journey_id", journeyId)
    .order("sort_order", { ascending: true });

  const nextMilestone = (milestones || []).find((m) => !m.done);
  const completedMilestones = (milestones || []).filter((m) => m.done);
  const lastCompleted = completedMilestones[completedMilestones.length - 1] || null;

  // If a milestone was just finished, mention whatever document came in
  // with it — that's usually the actual news worth passing along.
  let recentDocNames = [];
  if (lastCompleted) {
    const { data: docs } = await supabase
      .from("documents")
      .select("name")
      .eq("milestone_id", lastCompleted.id)
      .order("uploaded_at", { ascending: false })
      .limit(3);
    recentDocNames = (docs || []).map((d) => d.name);
  }

  // Pull a few of this agent's own past sent updates to match their real
  // voice, plus whatever tone notes they've written in Settings.
  const { data: myJourneys } = await supabase.from("journeys").select("id").eq("agent_id", journey.agent_id);
  const journeyIds = (myJourneys || []).map((j) => j.id);

  let pastExamples = [];
  if (journeyIds.length > 0) {
    const { data: pastUpdates } = await supabase
      .from("weekly_updates")
      .select("draft_text, sent_at")
      .in("journey_id", journeyIds)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(4);
    pastExamples = (pastUpdates || []).map((u) => u.draft_text).filter(Boolean);
  }

  const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).maybeSingle();
  let toneNotes = "";
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("update_tone_notes")
      .eq("id", profile.agency_id)
      .maybeSingle();
    toneNotes = agency?.update_tone_notes?.trim() || "";
  }

  const clientFirstName = journey.client_name.split(" ")[0];

  const contextLines = [
    `Client: ${clientFirstName} (${journey.role})`,
    `Property: ${journey.property_address || "not set yet"}`,
    `Current stage: ${journey.stage}`,
  ];
  if (lastCompleted) {
    contextLines.push(`Just completed: "${lastCompleted.label}"`);
    if (recentDocNames.length > 0) {
      contextLines.push(`Document(s) just added for that: ${recentDocNames.join(", ")}`);
    }
  }
  if (nextMilestone) {
    contextLines.push(
      `Coming up next: "${nextMilestone.label}"${
        nextMilestone.due_date ? ` (${nextMilestone.date_type || "estimated"}: ${nextMilestone.due_date})` : ""
      }`
    );
  }

  const system = `You write short weekly check-in messages for a real estate agent to send to their client inside a client portal.

Tone: warm and personal — like a text from someone who's genuinely glad to be helping, not a status notification. Write directly to the client in second person ("you're under contract now," not "the home is currently under contract"). If what just happened is real, good news — an accepted offer, going under contract, clearing to close — open with real warmth or a quick congratulations. Don't undersell good news just to sound low-key. Save the "no big deal" register for routine, logistical updates (a document came in, something's just waiting on someone else) — there it should be reassuring and unhurried, never salesy. Avoid corporate or clinical phrasing ("is currently," "has been completed") in favor of how someone actually talks. Keep it to 2-4 short sentences. Don't include a greeting like "Hi ${clientFirstName}" or a sign-off — just the body of the update, since those are handled separately.${
    toneNotes ? `\n\nThe agent's own notes on their voice:\n${toneNotes}` : ""
  }${
    pastExamples.length > 0
      ? `\n\nHere are a few real messages this agent has sent before — match this voice:\n${pastExamples
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}`
      : ""
  }`;

  const prompt = `Write this week's update using this context:\n${contextLines.join("\n")}`;

  return generateText({ system, prompt, maxTokens: 220 });
}

export async function saveDraft(updateId, journeyId, text) {
  const supabase = await createClient();
  await supabase.from("weekly_updates").update({ draft_text: text }).eq("id", updateId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function approveAndSend(updateId, journeyId) {
  const supabase = await createClient();

  const { data: update } = await supabase
    .from("weekly_updates")
    .select("*")
    .eq("id", updateId)
    .single();

  const { data: journey } = await supabase
    .from("journeys")
    .select("*, users:agent_id (full_name, sms_phone_number, reply_to_email)")
    .eq("id", journeyId)
    .single();

  if (!update || !journey) {
    throw new Error("Couldn't find that update or Journey.");
  }

  if (!update.draft_text?.trim()) {
    throw new Error("Write a draft before sending.");
  }

  // Nothing should reach a client's inbox or phone before the agent has
  // deliberately invited them to their portal — a weekly update is still
  // client-facing communication even though it doesn't require the client
  // to have actually set up their account yet.
  if (!journey.client_user_id) {
    throw new Error(
      "Invite this client to their portal first — no updates go out until then."
    );
  }

  const errors = await dispatchWeeklyUpdate(update, journey);
  if (errors.length > 0) {
    // Don't mark it as sent if nothing actually went out.
    throw new Error(errors.join(" "));
  }

  await supabase
    .from("weekly_updates")
    .update({ status: "sent", sent_via: journey.update_preference, sent_at: new Date().toISOString() })
    .eq("id", updateId);
  revalidatePath(`/journey/${journeyId}`);
}

// Sets this update aside to send automatically at a future date/time —
// see app/api/cron/send-scheduled-updates/route.js, which is what
// actually dispatches it once scheduled_for has passed. Direct editing
// stays available while scheduled (same as "held"); "Cancel schedule"
// reverts to a plain draft via unscheduleUpdate below.
export async function scheduleUpdate(updateId, journeyId, scheduledFor) {
  const supabase = await createClient();

  const { data: update } = await supabase
    .from("weekly_updates")
    .select("draft_text")
    .eq("id", updateId)
    .single();

  if (!update?.draft_text?.trim()) {
    throw new Error("Write a draft before scheduling.");
  }

  const sendAt = new Date(scheduledFor);
  if (Number.isNaN(sendAt.getTime()) || sendAt.getTime() <= Date.now()) {
    throw new Error("Pick a date and time in the future.");
  }

  const { data: journey } = await supabase
    .from("journeys")
    .select("client_user_id")
    .eq("id", journeyId)
    .single();

  if (!journey?.client_user_id) {
    throw new Error("Invite this client to their portal first — no updates go out until then.");
  }

  await supabase
    .from("weekly_updates")
    .update({ status: "scheduled", scheduled_for: sendAt.toISOString() })
    .eq("id", updateId);

  revalidatePath(`/journey/${journeyId}`);
}

// Cancels a pending scheduled send, putting the update back into the
// normal editable draft state.
export async function unscheduleUpdate(updateId, journeyId) {
  const supabase = await createClient();
  await supabase
    .from("weekly_updates")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", updateId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function holdUpdate(updateId, journeyId) {
  const supabase = await createClient();
  await supabase.from("weekly_updates").update({ status: "held" }).eq("id", updateId);
  revalidatePath(`/journey/${journeyId}`);
}

// Un-holds a held update, putting it back into the normal draft state so
// Approve & Send / Hold are available again — there was previously no way
// back once something was held.
export async function resumeUpdate(updateId, journeyId) {
  const supabase = await createClient();
  await supabase.from("weekly_updates").update({ status: "draft" }).eq("id", updateId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function recordDocument(journeyId, name, storagePath, milestoneId = null) {
  const supabase = await createClient();
  await supabase.from("documents").insert({
    journey_id: journeyId,
    name,
    storage_path: storagePath,
    milestone_id: milestoneId,
  });
  revalidatePath(`/journey/${journeyId}`);
}

// Deletes a document's row and its underlying file in storage — whether
// it's attached to a milestone or sitting in the general Documents list.
export async function deleteDocument(documentId, journeyId) {
  const supabase = await createClient();

  // Read through the regular RLS-scoped client first, so this can only
  // ever act on a document belonging to a Journey the signed-in agent
  // actually owns.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("journey_id", journeyId)
    .single();

  if (!doc) {
    throw new Error("Couldn't find that document.");
  }

  const admin = createAdminClient();
  if (doc.storage_path) {
    await admin.storage.from("documents").remove([doc.storage_path]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/journey/${journeyId}`);
}

const MAX_PROPERTY_PHOTOS = 5;

export async function addPropertyPhoto(journeyId, storagePath) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("property_photos")
    .select("sort_order")
    .eq("journey_id", journeyId);

  if ((existing?.length || 0) >= MAX_PROPERTY_PHOTOS) {
    throw new Error(`You can only have up to ${MAX_PROPERTY_PHOTOS} property photos — delete one first to add another.`);
  }

  // Base this on the highest sort_order actually in use, not just the
  // current count — after any delete-then-add cycle, count-based
  // numbering re-issues a value that's already taken by a surviving row,
  // producing a duplicate that makes reordering unreliable (ties have no
  // guaranteed stable order, so a swap and the next re-fetch can disagree
  // about which photo is actually "first").
  const nextSortOrder = (existing || []).reduce((max, p) => Math.max(max, p.sort_order || 0), 0) + 1;

  await supabase.from("property_photos").insert({
    journey_id: journeyId,
    storage_path: storagePath,
    sort_order: nextSortOrder,
  });

  revalidatePath(`/journey/${journeyId}`);
}

export async function deletePropertyPhoto(photoId, journeyId) {
  const supabase = await createClient();
  await supabase.from("property_photos").delete().eq("id", photoId);
  revalidatePath(`/journey/${journeyId}`);
}

// Persists a full manual reorder from drag-and-drop in one batch —
// orderedIds is every photo id for this journey in its new order, which
// becomes the new sort_order (index 0 is the main photo clients see).
export async function reorderPropertyPhotos(journeyId, orderedIds) {
  const supabase = await createClient();

  for (let index = 0; index < orderedIds.length; index++) {
    await supabase
      .from("property_photos")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("journey_id", journeyId);
  }

  revalidatePath(`/journey/${journeyId}`);
}

// If marking something done just finished every milestone in the
// Journey's current stage, auto-advance the course-line to the next
// stage. Shared by every path that can mark a milestone done — the
// checkbox (toggleMilestone) and the status pulldown (setMilestoneStatus)
// both need to trigger this, or the timeline silently stops advancing
// depending on which control an agent happens to use.
async function maybeAdvanceStage(supabase, journeyId) {
  const { data: journey } = await supabase
    .from("journeys")
    .select("stage, role, closed_at")
    .eq("id", journeyId)
    .single();

  if (!journey?.stage) return;

  const { data: stageMilestones } = await supabase
    .from("milestones")
    .select("done")
    .eq("journey_id", journeyId)
    .eq("stage", journey.stage);

  const allDone =
    stageMilestones && stageMilestones.length > 0 && stageMilestones.every((m) => m.done);

  if (!allDone) return;

  const stages = stagesForRole(journey.role);
  const currentIndex = stages.indexOf(journey.stage);
  const nextStage = stages[currentIndex + 1];
  if (!nextStage) return;

  const update = {
    stage: nextStage,
    stage_index: currentIndex + 1,
    last_activity_at: new Date().toISOString(),
  };

  // Landing in the Harbor for the first time — capture today as the
  // closing date automatically. An agent can still correct it by hand
  // (e.g. for a client whose Journey already existed before this
  // feature), so this only fills it in when it isn't already set.
  if (nextStage === "Harbor" && !journey.closed_at) {
    update.closed_at = new Date().toISOString().slice(0, 10);
  }

  await supabase.from("journeys").update(update).eq("id", journeyId);
}

export async function toggleMilestone(milestoneId, journeyId, done) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ done }).eq("id", milestoneId);

  if (done) {
    await maybeAdvanceStage(supabase, journeyId);
  }

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/bridge");
}

export async function setMilestoneDueDate(milestoneId, journeyId, dueDate) {
  const supabase = await createClient();
  await supabase
    .from("milestones")
    .update({ due_date: dueDate || null })
    .eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

// Backs the agent-facing "Completed / Estimated / Scheduled" pulldown.
// Keeps `done` and `date_type` consistent from one control instead of
// juggling the checkbox and a separate field.
export async function setMilestoneStatus(milestoneId, journeyId, status) {
  const supabase = await createClient();

  if (status === "completed") {
    await supabase.from("milestones").update({ done: true }).eq("id", milestoneId);
    await maybeAdvanceStage(supabase, journeyId);
  } else {
    await supabase
      .from("milestones")
      .update({ done: false, date_type: status })
      .eq("id", milestoneId);
  }

  revalidatePath(`/journey/${journeyId}`);
  revalidatePath("/bridge");
}

export async function setMilestoneNotes(milestoneId, journeyId, notes) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ notes }).eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

// Unlike setMilestoneNotes (private to the agent), this one is shown to
// the client on their portal — see ClientMilestoneList.js.
export async function setMilestoneClientNotes(milestoneId, journeyId, clientNotes) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ client_notes: clientNotes }).eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function addMilestone(journeyId, label, stage) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("milestones")
    .select("sort_order")
    .eq("journey_id", journeyId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

  await supabase.from("milestones").insert({
    journey_id: journeyId,
    label,
    stage,
    done: false,
    sort_order: nextOrder,
  });
  revalidatePath(`/journey/${journeyId}`);
}

export async function deleteMilestone(milestoneId, journeyId) {
  const supabase = await createClient();
  await supabase.from("milestones").delete().eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

// Persists a full manual reorder from drag-and-drop in one batch —
// orderedIds is every milestone id for this journey in its new
// top-to-bottom order, which becomes the new sort_order.
export async function reorderMilestones(journeyId, orderedIds) {
  const supabase = await createClient();

  for (let index = 0; index < orderedIds.length; index++) {
    await supabase
      .from("milestones")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("journey_id", journeyId);
  }

  revalidatePath(`/journey/${journeyId}`);
}

// Adds a newly-uploaded file to the agency's reusable video library. The
// file itself is already in storage by the time this runs — this just
// records it so it can be attached to this (and any future) milestone.
export async function createVideo(title, storagePath) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Couldn't find your agency.");
  }

  const { data: video, error } = await supabase
    .from("videos")
    .insert({
      agency_id: profile.agency_id,
      title: title?.trim() || "Untitled video",
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return video;
}

export async function attachVideoToMilestone(milestoneId, journeyId, videoId) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ video_id: videoId }).eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function removeVideoFromMilestone(milestoneId, journeyId) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ video_id: null }).eq("id", milestoneId);
  revalidatePath(`/journey/${journeyId}`);
}

export async function inviteClient(journeyId) {
  const supabase = await createClient();

  const { data: journey } = await supabase
    .from("journeys")
    .select(
      "client_name, client_email, client_phone, client_email_2, client_phone_2, update_preference, client_user_id, agent_id, role"
    )
    .eq("id", journeyId)
    .single();

  if (!journey) {
    throw new Error("Couldn't find that Journey.");
  }

  const wantsEmail = journey.update_preference === "email" || journey.update_preference === "both";
  const wantsSms = journey.update_preference === "sms" || journey.update_preference === "both";

  if (wantsEmail && !journey.client_email) {
    throw new Error("This Journey is set to email updates, but has no client email on file.");
  }
  if (wantsSms && !journey.client_phone) {
    throw new Error("This Journey is set to text updates, but has no client phone on file.");
  }
  if (!wantsEmail && !wantsSms) {
    throw new Error("This Journey has no update preference set.");
  }

  // The invite link needs an identity to send to Supabase — email if we
  // have one, otherwise fall back to using the phone as the account's
  // contact (Supabase invites are email-based, so a client with phone-only
  // still needs an email on file to receive login access).
  if (!journey.client_email) {
    throw new Error("A client email is required to create their portal login, even if updates go by text.");
  }

  const { data: agentProfile } = await supabase
    .from("users")
    .select("full_name, sms_phone_number, reply_to_email")
    .eq("id", journey.agent_id)
    .single();

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;
  const redirectTo = `${origin}/client/set-password`;

  const admin = createAdminClient();
  const isReinvite = !!journey.client_user_id;

  let { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: isReinvite ? "magiclink" : "invite",
    email: journey.client_email,
    options: { redirectTo },
  });

  // If this email already has an account (e.g. invited on a different
  // Journey before), fall back to a fresh login link instead of failing.
  if (linkError && !isReinvite) {
    ({ data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: journey.client_email,
      options: { redirectTo },
    }));
  }

  if (linkError) {
    throw new Error(`Couldn't create the invite: ${linkError.message}`);
  }

  const agentName = agentProfile?.full_name || "Your agent";
  const agentPhoneNumber = agentProfile?.sms_phone_number || null;
  const agentReplyToEmail = agentProfile?.reply_to_email || null;
  const inviteLink = await createShortLink(admin, linkData.properties.action_link, origin);
  const errors = [];

  if (wantsEmail) {
    const emailRecipients = [journey.client_email, journey.client_email_2].filter(Boolean);
    try {
      await sendInviteEmail({
        to: emailRecipients,
        agentName,
        clientName: journey.client_name,
        inviteLink,
        replyToEmail: agentReplyToEmail,
      });
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (wantsSms) {
    for (const phone of [journey.client_phone, journey.client_phone_2].filter(Boolean)) {
      try {
        await sendInviteSms({ to: phone, agentName, inviteLink, fromNumber: agentPhoneNumber });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  // The Twilio-required opt-in confirmation — only on the actual first
  // invite, not on a resend/reinvite, since consent only needs
  // acknowledging once. This used to fire automatically the moment a
  // phone number was saved at Journey creation, which meant a client
  // could get texted before the agent was ready to involve them at all;
  // it now shares the same deliberate trigger as everything else here.
  if (wantsSms && !isReinvite) {
    const optInMessage = `Hi ${journey.client_name.split(" ")[0]}, this is Lighthouse. ${agentName} added you here to send text updates about your home ${
      journey.role === "Selling" ? "sale" : "purchase"
    }. Msg frequency varies.`;
    for (const phone of [journey.client_phone, journey.client_phone_2].filter(Boolean)) {
      try {
        await sendUpdateSms({ to: phone, message: optInMessage, fromNumber: agentPhoneNumber });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  await supabase
    .from("journeys")
    .update({ client_user_id: linkData.user.id })
    .eq("id", journeyId);

  revalidatePath(`/journey/${journeyId}`);
}

// Removes every file under a journey's folder in a given storage bucket.
// Safe to call even if the folder doesn't exist or is already empty.
async function purgeStorageFolder(admin, bucket, journeyId) {
  const { data: files } = await admin.storage.from(bucket).list(journeyId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${journeyId}/${f.name}`);
    await admin.storage.from(bucket).remove(paths);
  }
}

// Permanently deletes a Journey and everything tied to it: milestones,
// documents, weekly updates, property photos (rows and files), and the
// client's portal login if they were ever invited. Does NOT touch the
// agency-wide videos library — those are reusable across milestones and
// other clients, so they're left alone even if this Journey used one.
export async function deleteJourney(journeyId) {
  const supabase = await createClient();

  // Read through the regular RLS-scoped client first, so this can only
  // ever act on a Journey the signed-in agent actually owns.
  const { data: journey } = await supabase
    .from("journeys")
    .select("id, client_user_id")
    .eq("id", journeyId)
    .single();

  if (!journey) {
    throw new Error("Couldn't find that Journey.");
  }

  await Promise.all([
    supabase.from("milestones").delete().eq("journey_id", journeyId),
    supabase.from("documents").delete().eq("journey_id", journeyId),
    supabase.from("weekly_updates").delete().eq("journey_id", journeyId),
    supabase.from("property_photos").delete().eq("journey_id", journeyId),
  ]);

  const admin = createAdminClient();

  await Promise.all([
    purgeStorageFolder(admin, "documents", journeyId),
    purgeStorageFolder(admin, "property-photos", journeyId),
  ]);

  if (journey.client_user_id) {
    // Best-effort — if this fails, the Journey itself still gets deleted
    // below rather than leaving the agent stuck.
    try {
      await admin.auth.admin.deleteUser(journey.client_user_id);
    } catch {
      // Ignore — the login being left behind isn't worth blocking on.
    }
  }

  const { data: deletedRows, error } = await supabase.from("journeys").delete().eq("id", journeyId).select("id");
  if (error) {
    throw new Error(error.message);
  }
  if (!deletedRows || deletedRows.length === 0) {
    throw new Error("The Journey wasn't deleted — you may not have permission to do that.");
  }

  revalidatePath("/bridge");
}

// A very long ban duration stands in for "indefinitely" — Supabase's Auth
// Admin API doesn't have a literal permanent-ban value, so this (100
// years) is the standard workaround. Pass "none" to lift a ban.
const INDEFINITE_BAN = "876000h";

// Blocks (or restores) a client's ability to log into their portal,
// without touching any of their Journey data — reversible, unlike
// deleteJourney above.
export async function setClientAccess(journeyId, revoke) {
  const supabase = await createClient();

  const { data: journey } = await supabase
    .from("journeys")
    .select("id, client_user_id")
    .eq("id", journeyId)
    .single();

  if (!journey) {
    throw new Error("Couldn't find that Journey.");
  }
  if (!journey.client_user_id) {
    throw new Error("This client hasn't been invited yet, so there's no login to change.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(journey.client_user_id, {
    ban_duration: revoke ? INDEFINITE_BAN : "none",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/journey/${journeyId}`);
}
