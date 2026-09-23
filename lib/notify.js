import { Resend } from "resend";
import twilio from "twilio";
import { runWithConcurrencyLimit } from "@/lib/concurrency";
import { withRetry } from "@/lib/retry";

const resend = new Resend(process.env.RESEND_API_KEY);

// A momentary rate-limit or provider-side 5xx is worth one quick retry
// before giving up — a bad recipient or malformed request never is, so
// these deliberately only cover the transient cases.
function isRetryableResendError(error) {
  if (!error) return true; // thrown network/fetch failure, not Resend's own {error} shape
  const status = error.statusCode || error.status;
  return error.name === "rate_limit_exceeded" || status === 429 || (status >= 500 && status < 600);
}

function isRetryableTwilioError(err) {
  return err.status === 429 || (err.status >= 500 && err.status < 600);
}

// Converts Resend's { data, error } return shape into a thrown exception
// (tagging the original error object on it) so withRetry — which only
// knows how to retry a *thrown* failure — can actually decide whether to
// retry it, then unwraps back to the original shape for the caller.
async function callResend(fn, isRetryable) {
  return withRetry(
    async () => {
      const { data, error } = await fn();
      if (error) {
        const err = new Error(error.message || String(error));
        err.resendError = error;
        throw err;
      }
      return data;
    },
    { isRetryable: (err) => isRetryable(err.resendError) }
  );
}

// Every direct resend.emails.send() callsite in this file (sendUpdateEmail,
// sendAgentEmail, sendInviteEmail, sendAgentWelcomeEmail,
// sendTitleCompanyInviteEmail) funnels through here — one place to retry
// a transient failure instead of five near-identical copies of the same
// try/throw shape.
async function sendResendEmail(payload) {
  await callResend(() => resend.emails.send(payload), isRetryableResendError);
}

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
  try {
    await sendResendEmail(buildUpdateEmail(args));
  } catch (err) {
    throw new Error(`Email failed: ${err.message}`);
  }
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
  try {
    await callResend(() => withRateLimit(() => resend.batch.send(emails)), isRetryableResendError);
    return emails.map(() => ({ ok: true }));
  } catch {
    // Whole-batch failure (validation or otherwise) — fall back to one
    // call per email so a single bad address doesn't take the rest down.
  }

  const results = [];
  for (const email of emails) {
    try {
      await callResend(() => withRateLimit(() => resend.emails.send(email)), isRetryableResendError);
      results.push({ ok: true });
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

// Same shape as the Resend token bucket above, applied to Twilio instead —
// added proactively (no confirmed real-world failure yet, unlike Resend)
// because sendUpdateSms had no backpressure at all: a cron loop fires one
// create() call per recipient, bounded only by the outer
// CONCURRENCY_LIMIT=10 in the cron routes, which is enough in-flight
// requests at once to risk tripping Twilio's own API rate limit at
// "hundreds of agents" scale.
const MAX_SMS_CALLS_PER_SECOND = 5;
let smsTokensAvailable = MAX_SMS_CALLS_PER_SECOND;
setInterval(() => {
  smsTokensAvailable = MAX_SMS_CALLS_PER_SECOND;
}, 1000).unref();

async function withSmsRateLimit(fn) {
  while (smsTokensAvailable <= 0) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  smsTokensAvailable--;
  return fn();
}

// fromNumber is an agent's own dedicated Twilio number (see
// users.sms_phone_number) — every such number is provisioned under the
// same shared 10DLC campaign, so no extra per-agent compliance step is
// needed. Falls back to the shared messaging service for agents who
// don't have their own number yet.
export async function sendUpdateSms({ to, message, fromNumber }) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    await withRetry(
      () =>
        withSmsRateLimit(() =>
          client.messages.create({
            body: `${message}${SMS_OPT_OUT_FOOTER}`,
            to,
            ...(fromNumber
              ? { from: fromNumber }
              : { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }),
          })
        ),
      { isRetryable: isRetryableTwilioError }
    );
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
  try {
    await sendResendEmail(buildAgentEmail(args));
  } catch (err) {
    throw new Error(`Email failed: ${err.message}`);
  }
}

// Payload builders for callers that need to batch many update/agent
// emails through sendEmailBatch instead of sending one at a time (see
// the two cron routes under app/api/cron/).
export { buildUpdateEmail, buildAgentEmail };

export async function sendInviteEmail({ to, agentName, clientName, inviteLink, replyToEmail }) {
  try {
    await sendResendEmail({
      from: agentFromAddress(agentName),
      to,
      replyTo: replyToEmail || undefined,
      subject: `${agentName} invited you to your Lighthouse portal`,
      text: `Hi ${clientName},\n\n${agentName} has set up a personal portal for you to follow along with your home transaction — see your progress, upcoming steps, and any shared documents anytime.\n\nSet up your account here:\n${inviteLink}\n\nThis link will expire soon, so please set up your account when you get a chance.`,
    });
  } catch (err) {
    throw new Error(`Invite email failed: ${err.message}`);
  }
}

// Sent once, right after a new agent's payment succeeds — gets them from
// "just paid" to "has a working login."
export async function sendAgentWelcomeEmail({ to, fullName, setPasswordLink }) {
  try {
    await sendResendEmail({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: "Welcome to Lighthouse — set your password",
      text: `Hi ${fullName},\n\nThanks for signing up for Lighthouse. Set your password here to get into your account:\n${setPasswordLink}\n\nThis link will expire soon, so please set it up when you get a chance.`,
    });
  } catch (err) {
    throw new Error(`Welcome email failed: ${err.message}`);
  }
}

// Addressed to a title/escrow company's contact, not a consumer — no
// SMS counterpart and no Twilio opt-in confirmation, since that machinery
// exists specifically for consumer messaging (see sendInviteSms).
export async function sendTitleCompanyInviteEmail({ to, agentName, companyName, propertyAddress, inviteLink, replyToEmail }) {
  try {
    await sendResendEmail({
      from: agentFromAddress(agentName),
      to,
      replyTo: replyToEmail || undefined,
      subject: `${agentName} invited you to a Lighthouse document portal`,
      text: `Hi ${companyName},\n\n${agentName} has invited you to securely exchange documents for ${propertyAddress}.\n\nSet up your account here:\n${inviteLink}\n\nThis link will expire soon, so please set up your account when you get a chance.`,
    });
  } catch (err) {
    throw new Error(`Invite email failed: ${err.message}`);
  }
}

export async function sendInviteSms({ to, agentName, inviteLink, fromNumber }) {
  await sendUpdateSms({
    to,
    message: `Hi! ${agentName} set up your Lighthouse portal to follow your home transaction. Set your password here: ${inviteLink}`,
    fromNumber,
  });
}
