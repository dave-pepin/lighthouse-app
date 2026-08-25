// Temporary — verifies the Sentry pipeline actually delivers a real
// error end-to-end. Lives under /api/cron/ only to reuse that path's
// existing public (auth-bypassed) carve-out in the middleware — this
// isn't an actual cron job. Remove after confirming it shows up in the
// Sentry dashboard.
export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return new Response("NEXT_PUBLIC_SENTRY_DSN is NOT set in this deployment's runtime.", { status: 200 });
  }
  throw new Error(`Lighthouse Sentry pipeline test — safe to ignore/resolve (DSN present: ${dsn.slice(0, 20)}...)`);
}
