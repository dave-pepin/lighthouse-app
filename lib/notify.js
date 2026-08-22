import { Resend } from "resend";
import twilio from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY);

// Client-facing mail still goes out through Lighthouse's own verified
// domain (so deliverability/SPF/DKIM stay intact), but wearing the
// agent's name and, via replyToEmail, routing any reply straight to the
// agent instead of the platform — no per-agent domain verification
// required. See add-agent-contact-migration.sql / users.reply_to_email.
function agentFromAddress(agentName) {
  return `${agentName} via Lighthouse <${process.env.RESEND_FROM_EMAIL}>`;
}

export async function sendUpdateEmail({ to, agentName, message, replyToEmail }) {
  const { error } = await resend.emails.send({
    from: agentFromAddress(agentName),
    to,
    replyTo: replyToEmail || undefined,
    subject: `Your weekly update from ${agentName}`,
    text: message,
  });
  if (error) throw new Error(`Email failed: ${error.message || error}`);
}

// Every outgoing SMS carries this disclosure, per Twilio's A2P 10DLC
// requirements — recipients must always have a clear, visible way to opt
// out, regardless of message type.
const SMS_OPT_OUT_FOOTER = "\n\nReply STOP to unsubscribe, HELP for help. Msg & data rates may apply.";

// fromNumber is an agent's own dedicated Twilio number (see
// users.sms_phone_number) — every such number is provisioned under the
// same shared 10DLC campaign, so no extra per-agent compliance step is
// needed. Falls back to the shared messaging service for agents who
// don't have their own number yet.
export async function sendUpdateSms({ to, message, fromNumber }) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    await client.messages.create({
      body: `${message}${SMS_OPT_OUT_FOOTER}`,
      to,
      ...(fromNumber ? { from: fromNumber } : { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }),
    });
  } catch (err) {
    throw new Error(`Text failed: ${err.message}`);
  }
}

// Generic agent-facing notification email — distinct from sendUpdateEmail
// (which is addressed to the client) so the subject line can be whatever
// fits the notification, rather than always "Your weekly update from...".
export async function sendAgentEmail({ to, subject, message }) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    text: message,
  });
  if (error) throw new Error(`Email failed: ${error.message || error}`);
}

export async function sendInviteEmail({ to, agentName, clientName, inviteLink, replyToEmail }) {
  const { error } = await resend.emails.send({
    from: agentFromAddress(agentName),
    to,
    replyTo: replyToEmail || undefined,
    subject: `${agentName} invited you to your Lighthouse portal`,
    text: `Hi ${clientName},\n\n${agentName} has set up a personal portal for you to follow along with your home transaction — see your progress, upcoming steps, and any shared documents anytime.\n\nSet up your account here:\n${inviteLink}\n\nThis link will expire soon, so please set up your account when you get a chance.`,
  });
  if (error) throw new Error(`Invite email failed: ${error.message || error}`);
}

// Sent once, right after a new agent's payment succeeds — gets them from
// "just paid" to "has a working login."
export async function sendAgentWelcomeEmail({ to, fullName, setPasswordLink }) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject: "Welcome to Lighthouse — set your password",
    text: `Hi ${fullName},\n\nThanks for signing up for Lighthouse. Set your password here to get into your account:\n${setPasswordLink}\n\nThis link will expire soon, so please set it up when you get a chance.`,
  });
  if (error) throw new Error(`Welcome email failed: ${error.message || error}`);
}

export async function sendInviteSms({ to, agentName, inviteLink, fromNumber }) {
  await sendUpdateSms({
    to,
    message: `Hi! ${agentName} set up your Lighthouse portal to follow your home transaction. Set your password here: ${inviteLink}`,
    fromNumber,
  });
}
