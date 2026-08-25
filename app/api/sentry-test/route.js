// Temporary — verifies the Sentry pipeline actually delivers a real
// error end-to-end. Remove after confirming it shows up in the Sentry
// dashboard.
export async function GET() {
  throw new Error("Lighthouse Sentry pipeline test — safe to ignore/resolve");
}
