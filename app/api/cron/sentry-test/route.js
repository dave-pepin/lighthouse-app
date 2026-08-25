// Temporary — verifies the Sentry pipeline actually delivers a real
// error end-to-end. Lives under /api/cron/ only to reuse that path's
// existing public (auth-bypassed) carve-out in the middleware — this
// isn't an actual cron job. Remove after confirming it shows up in the
// Sentry dashboard.
export async function GET() {
  throw new Error("Lighthouse Sentry pipeline test — safe to ignore/resolve");
}
