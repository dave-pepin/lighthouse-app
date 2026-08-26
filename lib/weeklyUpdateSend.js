import { sendUpdateEmail, sendUpdateSms, buildUpdateEmail } from "@/lib/notify";

// Shared by the interactive "Approve & Send" action and the scheduled-
// send cron endpoint — sends an update's draft_text over whichever
// channels the client wants. Collects errors per-channel/per-recipient
// rather than throwing on the first one, so a bad phone number doesn't
// block an email that would otherwise go out fine.
export async function dispatchWeeklyUpdate(update, journey) {
  const agentName = journey.users?.full_name || "Your agent";
  const agentPhoneNumber = journey.users?.sms_phone_number || null;
  const agentReplyToEmail = journey.users?.reply_to_email || null;
  const pref = journey.update_preference;

  const errors = [];

  if (pref === "email" || pref === "both") {
    const emailRecipients = [journey.client_email, journey.client_email_2].filter(Boolean);
    try {
      await sendUpdateEmail({
        to: emailRecipients,
        agentName,
        message: update.draft_text,
        replyToEmail: agentReplyToEmail,
      });
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (pref === "sms" || pref === "both") {
    for (const phone of [journey.client_phone, journey.client_phone_2].filter(Boolean)) {
      try {
        await sendUpdateSms({ to: phone, message: update.draft_text, fromNumber: agentPhoneNumber });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  return errors;
}

// Same email-recipient logic as dispatchWeeklyUpdate's email branch, but
// returns the ready-to-send payload instead of sending it — used by the
// scheduled-send cron route to collect every due update's email into one
// batch (see sendEmailBatch in lib/notify.js) instead of sending them one
// at a time, which is what tips Resend's rate limit at real scale. SMS
// isn't part of this — it still goes out per-update via dispatchWeeklyUpdate
// or sendUpdateSms directly, since Twilio isn't what this addresses.
export function buildWeeklyUpdateEmail(update, journey) {
  const pref = journey.update_preference;
  if (pref !== "email" && pref !== "both") return null;

  const emailRecipients = [journey.client_email, journey.client_email_2].filter(Boolean);
  if (emailRecipients.length === 0) return null;

  return buildUpdateEmail({
    to: emailRecipients,
    agentName: journey.users?.full_name || "Your agent",
    message: update.draft_text,
    replyToEmail: journey.users?.reply_to_email || null,
  });
}

// The SMS half of dispatchWeeklyUpdate, split out so the cron route can
// batch the email side (above) while still sending SMS per-update as
// before. Returns per-phone errors, same shape as dispatchWeeklyUpdate.
export async function dispatchWeeklyUpdateSms(update, journey) {
  const pref = journey.update_preference;
  const errors = [];
  if (pref === "sms" || pref === "both") {
    const agentPhoneNumber = journey.users?.sms_phone_number || null;
    for (const phone of [journey.client_phone, journey.client_phone_2].filter(Boolean)) {
      try {
        await sendUpdateSms({ to: phone, message: update.draft_text, fromNumber: agentPhoneNumber });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }
  return errors;
}
