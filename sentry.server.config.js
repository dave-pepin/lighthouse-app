import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Error monitoring only, deliberately — performance tracing is a
  // separate Sentry feature with its own overhead/volume, and wasn't
  // what was asked for here.
  tracesSampleRate: 0,
});
