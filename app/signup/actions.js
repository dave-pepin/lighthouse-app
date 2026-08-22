"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Starts a paid signup: collects the agent's basic info, then hands off
// to Stripe Checkout to actually take payment. The agency + login don't
// get created here — that happens in the Stripe webhook once payment
// actually succeeds (see app/api/webhooks/stripe/route.js), so nobody
// ever ends up with a working account that never paid.
export async function startAgentCheckout(formData) {
  const fullName = formData.get("full_name")?.toString().trim();
  const agencyName = formData.get("agency_name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();

  if (!fullName || !agencyName || !email) {
    throw new Error("All fields are required.");
  }

  if (!process.env.STRIPE_PRICE_ID) {
    throw new Error("Billing isn't set up yet — check back soon.");
  }

  const admin = createAdminClient();

  // Don't let someone pay against an email that's already an agent here —
  // point them at login instead of creating a second, confusing account.
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    throw new Error("An account already exists for that email — try signing in instead.");
  }

  // Reuse an existing Stripe customer for this email if there's already
  // one on file (e.g. they started checkout before and abandoned it),
  // rather than piling up duplicate customer records for the same person.
  const existingCustomers = await stripe.customers.list({ email, limit: 1 });
  const customer =
    existingCustomers.data[0] || (await stripe.customers.create({ email, name: fullName }));

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    // Lets a promo code (created in the Stripe dashboard) comp someone at
    // 100% off — the one deliberate escape hatch for "free" access,
    // without needing a second, parallel non-Stripe signup path.
    allow_promotion_codes: true,
    success_url: `${origin}/signup/success`,
    cancel_url: `${origin}/signup`,
    // Read back by the webhook once checkout.session.completed fires —
    // that's the moment the actual agency + login get created.
    metadata: {
      full_name: fullName,
      agency_name: agencyName,
      email,
    },
  });

  if (!session.url) {
    throw new Error("Couldn't start checkout — try again in a moment.");
  }

  redirect(session.url);
}
