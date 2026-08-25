import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileNames: true,
  // No SENTRY_AUTH_TOKEN configured yet — the plugin just skips the
  // source-map upload step until one's added (Sentry Settings → Auth
  // Tokens), it doesn't fail the build.
});
