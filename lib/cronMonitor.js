import * as Sentry from "@sentry/nextjs";

// Sending a Sentry Cron Monitor check-in from anywhere but real
// production (a developer's local server, a Preview deployment) teaches
// Sentry to expect check-ins from that environment forever on the same
// schedule — and since nothing ever actually runs there again, it
// becomes permanent "missed check-in" noise with no way to turn it off
// from code. Only report check-ins from genuine production traffic;
// everywhere else just runs the job with no monitor wrapping.
export async function withProductionMonitor(slug, fn, config) {
  if (process.env.VERCEL_ENV !== "production") {
    return fn();
  }
  return Sentry.withMonitor(slug, fn, config);
}
