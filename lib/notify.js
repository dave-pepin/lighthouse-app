import { Resend } from "resend";
import twilio from "twilio";
import { runWithConcurrencyLimit } from "@/lib/concurrency";

const resend = new Resend(process.env.RESEND_API_KEY);

// Client-facing mail still goes out through Lighthouse's own verified
// domain (so deliverability/SPF/DKIM stay intact), but wearing the
// agent's name and, via replyToEmail, routing any reply straight to the
// agent instead of the platform — no per-agent domain verification
// required. See add-agent-contact-migration.sql / users.reply_to_email.
function agentFromAddress(agentName) {
  return `${agentName} via Lighthouse <${process.env.RESEND_FROM_EMAIL}>`;
}

function buildUpdateEmail({ to, agentName, message, replyToEmail }) {
  return {
    from: agentFromAddress(agentName),
    to,
    replyTo: replyToEmail || undefined,
    subject: `Your weekly update from ${agentName}`,
    text: message,
  };
}

export async function sendUpdateEmail(args) {
  const { error } = await resend.emails.send(buildUpdateEmail(args));
  if (error) throw new Error(`Email failed: ${error.message || error}`);
}

// Resend's rate limit (10 requests/sec) is per API call, not per email —
// a cron loop that fires one call per recipient tips over it well before
// "hundreds of agents" (confirmed by an actual load test: ~300 individual
// sends failed the majority of the time). Batching many independent,
// fully-formed emails into one call raises effective throughput by
// roughly BATCH_SIZE, which is what actually scales instead of just
// moving the ceiling.
//
// Resend validates each batch atomically — one malformed email fails the
// *entire* call — so BATCH_SIZE is kept well under Resend's own 100-per-
// batch cap to limit the blast radius, and any whole-batch failure falls
// back to sending that batch's emails individually, isolating whichever
// one was actually bad instead of losing the rest.
const BATCH_SIZE = 25;
const BATCH_CONCURRENCY = 3;

// Shared by every actual Resend API call this module makes — both batch
// attempts and their individual-send fallback below. Batching alone
// isn't sufficient: a batch that fails validation falls back to one call
// per email, and enough simultaneous fallbacks (e.g. several bad
// addresses landing in different chunks at once) can still blow through
// Resend's 10 req/sec limit even with batching in place, confirmed by an
// actual load test. This caps the real call rate no matter which path
// emails end up taking, with margin below Resend's own limit.
const MAX_CALLS_PER_SECOND = 5;
let tokensAvailable = MAX_CALLS_PER_SECOND;
setInterval(() => {
  tokensAvailable = MAX_CALLS_PER_SECOND;
}, 1000).unref();

async function withRateLimit(fn) {
  while (tokensAvailable <= 0) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  tokensAvailable--;
  return fn();
}

async function sendOneBatch(emails) {
  const { error } = await withRateLimit(() => resend.batch.send(emails));
  if (!error) return emails.map(() => ({ ok: true }));

  const results = [];
  for (const email of emails) {
    try {
      const { error: singleError } = await withRateLimit(() => resend.emails.send(email));
      results.push(singleError ? { ok: false, error: singleError.message || String(singleError) } : { ok: true });
    } catch (err) {
      results.push({ ok: false, error: err.message });
    }
  }
  return results;
}

// Sends many independent emails (each a full { from, to, subject, text,
// replyTo } object — see buildUpdateEmail/buildAgentEmail below), chunked
// to stay under Resend's per-batch cap, with only a few chunks in flight
// at once. Returns one { ok, error? } per input email, same order as
// input, so callers can do their own per-item bookkeeping (mark sent,
// revert to draft, notify) from the results.
export async function sendEmailBatch(emails) {
  if (emails.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push({ start: i, items: emails.slice(i, i + BATCH_SIZE) });
  }

  const results = new Array(emails.length).fill(null);
  await runWithConcurrencyLimit(chunks, BATCH_CONCURRENCY, async (chunk) => {
    const chunkResults = await sendOneBatch(chunk.items);
    chunkResults.forEach((r, j) => (results[chunk.start + j] = r));
  });
  return results;
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

function buildAgentEmail({ to, subject, message }) {
  return {
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    text: message,
  };
}

// Generic agent-facing notification email — distinct from sendUpdateEmail
// (which is addressed to the client) so the subject line can be whatever
// fits the notification, rather than always "Your weekly update from...".
export async function sendAgentEmail(args) {
  const { error } = await resend.emails.send(buildAgentEmail(args));
  if (error) throw new Error(`Email failed: ${error.message || error}`);
}

// Payload builders for callers that need to batch many update/agent
// emails through sendEmailBatch instead of sending one at a time (see
// the two cron routes under app/api/cron/).
export { buildUpdateEmail, buildAgentEmail };

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
