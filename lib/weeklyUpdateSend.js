import { sendUpdateEmail, sendUpdateSms } from "@/lib/notify";

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
