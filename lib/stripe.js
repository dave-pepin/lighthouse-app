import Stripe from "stripe";

// A single configured Stripe client, same pattern as the Resend/Twilio
// clients in lib/notify.js. No apiVersion override — this lets the
// installed stripe package use its own default (each SDK release is
// built against a specific, compatible Stripe API version), rather than
// risking a stale/mistyped version string here going out of sync.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
