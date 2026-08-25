import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShortLink } from "@/lib/shortLinks";
import { sendAgentWelcomeEmail } from "@/lib/notify";
import { releasePhoneNumber } from "@/lib/twilioNumbers";

const INDEFINITE_BAN = "876000h";

// Creates the actual agency + agent login the moment payment succeeds —
// this is the only place a new paid agent account gets created. Reads
// the signup details back out of the Checkout Session's metadata (set in
// app/signup/actions.js).
async function handleCheckoutCompleted(admin, session, origin) {
  const fullName = session.metadata?.full_name;
  const agencyName = session.metadata?.agency_name;
  const email = session.metadata?.email;

  if (!fullName || !agencyName || !email) {
    console.error("Stripe checkout.session.completed missing signup metadata", session.id);
    return;
  }

  // Stripe can redeliver the same event — don't create a second agency
  // for a subscription that's already been provisioned.
  const { data: existingAgency } = await admin
    .from("agencies")
    .select("id")
    .eq("stripe_subscription_id", session.subscription)
    .maybeSingle();
  if (existingAgency) return;

  const redirectTo = `${origin}/agent/set-password`;

  // Same technique as inviteClient's client invites — generateLink with
  // type "invite" both creates the Auth user and hands back a one-time
  // link, sidestepping the separate admin.createUser() SDK bug noted in
  // the original self-serve signup code.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (linkError || !linkData?.user?.id) {
    throw new Error(`Couldn't create the agent's login: ${linkError?.message || "unknown error"}`);
  }

  const newUserId = linkData.user.id;

  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({
      name: agencyName,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: "active",
    })
    .select()
    .single();

  if (agencyError) {
    // Don't leave a dangling auth user with no profile if this step fails.
    await admin.auth.admin.deleteUser(newUserId);
    throw new Error(agencyError.message);
  }

  const { error: userError } = await admin.from("users").insert({
    id: newUserId,
    agency_id: agency.id,
    full_name: fullName,
    role: "agent",
    email,
  });

  if (userError) {
    await admin.auth.admin.deleteUser(newUserId);
    throw new Error(userError.message);
  }

  const setPasswordLink = await createShortLink(admin, linkData.properties.action_link, origin);
  await sendAgentWelcomeEmail({ to: email, fullName, setPasswordLink });
}

// Keeps agencies.subscription_status in sync, and blocks or restores
// login for every agent in that agency to match — the same ban_duration
// mechanism as the manual "Suspend"/"Restore" controls on the Team page,
// just driven by Stripe instead of a button click.
async function handleSubscriptionChange(admin, subscription) {
  const { data: agency } = await admin
    .from("agencies")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (!agency) return null;

  await admin.from("agencies").update({ subscription_status: subscription.status }).eq("id", agency.id);

  const inGoodStanding = subscription.status === "active" || subscription.status === "trialing";
  const banDuration = inGoodStanding ? "none" : INDEFINITE_BAN;

  const { data: agents } = await admin.from("users").select("id").eq("agency_id", agency.id);
  for (const agent of agents || []) {
    try {
      await admin.auth.admin.updateUserById(agent.id, { ban_duration: banDuration });
    } catch (err) {
      console.error(`Couldn't update access for agent ${agent.id}:`, err.message);
    }
  }

  return agency.id;
}

// Only called for an actual subscription cancellation (not a transient
// past_due) — a lapsed-but-maybe-resuming agency keeps their number, but
// a canceled one shouldn't keep costing Twilio money for a number nobody
// can use anymore.
async function releaseAgencyPhoneNumbers(admin, agencyId) {
  const { data: agents } = await admin
    .from("users")
    .select("id, twilio_phone_number_sid")
    .eq("agency_id", agencyId)
    .not("twilio_phone_number_sid", "is", null);

  for (const agent of agents || []) {
    try {
      await releasePhoneNumber(agent.twilio_phone_number_sid);
      await admin
        .from("users")
        .update({ sms_phone_number: null, twilio_phone_number_sid: null })
        .eq("id", agent.id);
    } catch (err) {
      console.error(`Couldn't release phone number for agent ${agent.id}:`, err.message);
      Sentry.captureException(err);
    }
  }
}

export async function POST(request) {
  // Stripe's signature check needs the exact raw request body — reading
  // it as text here, rather than request.json(), is what makes that
  // possible in a Next.js Route Handler.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Webhook requests come straight from Stripe's servers to the deployed
  // domain, so this is always the real production host.
  const origin = `https://${request.headers.get("host")}`;

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(admin, event.data.object, origin);
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const agencyId = await handleSubscriptionChange(admin, event.data.object);
      if (agencyId && event.type === "customer.subscription.deleted") {
        await releaseAgencyPhoneNumbers(admin, agencyId);
      }
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    Sentry.captureException(err);
    // A non-2xx response tells Stripe to retry — appropriate here, since
    // these are mostly transient failures (a DB hiccup, an email
    // provider blip) rather than "this event doesn't apply."
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
