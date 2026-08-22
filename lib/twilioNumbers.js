import twilio from "twilio";

function twilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Searches Twilio for one available US local number (optionally narrowed
// to an area code), buys it, and attaches it to the shared Messaging
// Service — the same one that already carries Lighthouse's approved A2P
// 10DLC campaign registration, so the new number can send SMS immediately
// with no extra per-agent compliance step or approval wait.
export async function provisionPhoneNumber(areaCode) {
  const client = twilioClient();

  const searchParams = { limit: 1, smsEnabled: true };
  if (areaCode) searchParams.areaCode = areaCode;

  const available = await client.availablePhoneNumbers("US").local.list(searchParams);
  if (!available.length) {
    throw new Error(
      areaCode
        ? `No numbers available in area code ${areaCode}. Try a different one, or leave it blank.`
        : "No numbers available right now. Please try again shortly."
    );
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
  });

  try {
    await client.messaging.v1
      .services(process.env.TWILIO_MESSAGING_SERVICE_SID)
      .phoneNumbers.create({ phoneNumberSid: purchased.sid });
  } catch (err) {
    // Don't leave a purchased-but-unusable (and still billing) number
    // behind if attaching it to the campaign fails.
    await client.incomingPhoneNumbers(purchased.sid).remove().catch(() => {});
    throw new Error(`Couldn't finish setting up that number: ${err.message}`);
  }

  return { phoneNumber: purchased.phoneNumber, phoneNumberSid: purchased.sid };
}

// Detaches and releases a previously-provisioned number so Twilio stops
// billing for it. Safe to call even if it's already been detached from
// the messaging service.
export async function releasePhoneNumber(phoneNumberSid) {
  const client = twilioClient();

  try {
    await client.messaging.v1
      .services(process.env.TWILIO_MESSAGING_SERVICE_SID)
      .phoneNumbers(phoneNumberSid)
      .remove();
  } catch {
    // Already detached, or was never attached — either way, fine.
  }

  await client.incomingPhoneNumbers(phoneNumberSid).remove();
}
