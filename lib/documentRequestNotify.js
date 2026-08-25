import { sendUpdateEmail, sendUpdateSms } from "@/lib/notify";

// Notifies the client that their agent has requested a document. Mirrors
// dispatchWeeklyUpdate's channel-selection: respects update_preference,
// collects per-channel errors instead of throwing.
export async function dispatchDocumentRequestNotice(request, journey, agentProfile) {
  const agentName = agentProfile?.full_name || "Your agent";
  const pref = journey.update_preference;
  const message = `${agentName} has requested a document from you: "${request.label}". Please upload it in your portal when you get a chance.`;
  const errors = [];

  if (pref === "email" || pref === "both") {
    const emailRecipients = [journey.client_email, journey.client_email_2].filter(Boolean);
    if (emailRecipients.length > 0) {
      try {
        await sendUpdateEmail({
          to: emailRecipients,
          agentName,
          message,
          replyToEmail: agentProfile?.reply_to_email || null,
        });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  if (pref === "sms" || pref === "both") {
    for (const phone of [journey.client_phone, journey.client_phone_2].filter(Boolean)) {
      try {
        await sendUpdateSms({ to: phone, message, fromNumber: agentProfile?.sms_phone_number || null });
      } catch (err) {
        errors.push(err.message);
      }
    }
  }

  return errors;
}
