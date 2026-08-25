// Temporary — verifies the Sentry pipeline actually delivers a real
// error end-to-end. Lives under /api/cron/ only to reuse that path's
// existing public (auth-bypassed) carve-out in the middleware — this
// isn't an actual cron job. Remove after confirming it shows up in the
// Sentry dashboard.
export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const knownGood = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return new Response(
    JSON.stringify({
      dsnPresent: !!dsn,
      dsnPrefix: dsn ? dsn.slice(0, 24) : null,
      knownGoodPresent: !!knownGood,
      vercelEnv: process.env.VERCEL_ENV || null,
      nodeEnv: process.env.NODE_ENV || null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
