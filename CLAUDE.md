# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lighthouse is a Next.js 15 (App Router) + Supabase app for real estate agents to guide clients through a
transaction ("Journey") from offer to close, and beyond into an ongoing post-closing relationship ("Harbor").
Agents track milestones, send weekly SMS/email updates, and clients follow along in a read-only portal.

## Commands

```
npm install
npm run dev      # start dev server at localhost:3000
npm run build
npm run start
npm run lint
```

There is no test suite configured. Database changes are plain `.sql` files in the repo root (see below), run
by hand in the Supabase SQL Editor — there's no migration runner or ORM.

## Environment

Copy `.env.local.example` to `.env.local`. Required for full functionality: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`,
`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_MESSAGING_SERVICE_SID`, `OPENAI_API_KEY` (AI-suggested update
text), and `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET` (self-serve agent signup billing).
`lib/anthropic.js` is dead code — the AI suggestion feature actually runs through `lib/openai.js`.

Error monitoring (Sentry) is wired up via `instrumentation.js`/`instrumentation-client.js`/
`sentry.server.config.js`/`sentry.edge.config.js` and `NEXT_PUBLIC_SENTRY_DSN` — safe to omit locally (errors
just won't be reported), but should be set in every deployed environment. `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/
`SENTRY_PROJECT` are optional and only needed for uploading source maps (readable stack traces in production).

## Data model & multi-tenancy

Three user kinds share Supabase Auth but are distinguished by which tables reference them:
- **Agent**: has a row in `public.users`, belongs to an `agency` (`users.agency_id`). Agencies are the billing
  unit (Stripe subscription lives on `agencies`).
- **Client**: no `public.users` row. Only exists once invited — `journeys.client_user_id` points at their Auth
  user. Middleware (`lib/supabase/middleware.js`) tells the two apart post-login by checking for a `users` row.
- **Admin/service-role**: `lib/supabase/admin.js`, server-only, bypasses RLS. Used for Storage signed URLs,
  Auth Admin API calls (inviting clients, banning/restoring logins, deleting users), and short-link lookups
  (`short_links` has no RLS policies since visitors hit it unauthenticated).

Core tables: `agencies`, `users` (agents), `journeys`, `milestones`, `documents`, `property_photos`,
`weekly_updates`, `videos` (agency-wide reusable library) + `milestone_video_defaults`, `short_links`.

**Journeys** are the central object: one per client transaction, with a `role` (`Buying`/`Selling`, genuinely
different pipelines — see `lib/milestoneTemplates.js` and `components/CourseLine.js`'s `STAGES_BY_ROLE`) and a
`stage` that advances automatically as milestones complete (`maybeAdvanceStage` in
`app/(dashboard)/journey/[id]/actions.js`). The **Bridge** (`/bridge`) is the active-Journey dashboard; the
**Harbor** stage is the shared terminal destination for both pipelines and also names the closed-Journey list
(`/harbor`) and the client-facing post-closing resources section. Milestones are seeded from
`MILESTONE_TEMPLATES` on Journey creation and are only visible to the client once an agent sets a `due_date`
on them (see `loadPortalData.js`) — that's a deliberate gate, not an oversight.

Server actions are colocated per route as `actions.js` files (`"use server"`) rather than centralized —
`app/(dashboard)/journey/[id]/actions.js` is the largest and covers most Journey/milestone/document mutations.

## Client-facing communication is opt-in, not automatic

No message ever goes to a client until an agent explicitly clicks "Invite client to portal"
(`inviteClient` in `journey/[id]/actions.js`). Journey creation does not text or email anyone. This is
deliberate — both to let agents set up a Journey before they're ready to involve the client, and because the
Twilio A2P 10DLC opt-in confirmation SMS has to fire from one single, deliberate trigger. Follow this pattern
for any new client-facing notification: gate it behind an explicit agent action, not a side effect of a save.

Every outbound SMS carries the STOP/HELP opt-out footer (`lib/notify.js`) — required by Twilio, not optional.

## Short links (`/i/[code]`)

Supabase invite/magic links are one-time-use and get silently burned by email security scanners or browser
link-preview/preload features that fetch a URL without a real click. `app/i/[code]/route.js` exists solely to
absorb that: its `GET` shows an interstitial page with a `<form method="POST">` (not a plain `<a href>`, which
prefetchers still trigger), and only the `POST` — reachable only by an actual click — redirects to the real
Supabase link. `createShortLink` (`lib/shortLinks.js`) wraps any one-time link headed to a client or new agent
for exactly this reason. Don't "simplify" this back to a direct redirect.

## Billing (Stripe)

Self-serve agent signup (`app/signup/actions.js`) only starts Stripe Checkout — it does not create any
account. The agency + agent login are created solely in the `checkout.session.completed` webhook handler
(`app/api/webhooks/stripe/route.js`), reading signup details back out of session metadata, so a login can
never exist without a completed payment. The same webhook keeps `agencies.subscription_status` and every
agent's login-ban state in sync on subscription updates/cancellations.

## Auth/session

`middleware.js` (root) delegates to `lib/supabase/middleware.js`, which refreshes the session on every request
and redirects unauthenticated visitors to `/login`, with explicit carve-outs for the login/signup/set-password
pages, `/privacy` and `/terms` (must stay public for A2P 10DLC review), `/i/*` short links, and the Stripe
webhook. Post-login, it routes agents to `/bridge` and clients to `/client/portal` based on the presence of a
`public.users` row.

Three Supabase client constructors, each for a specific context — don't cross them:
- `lib/supabase/client.js` — browser, Client Components.
- `lib/supabase/server.js` — Server Components/Actions/Route Handlers, cookie-based session, RLS-scoped.
- `lib/supabase/admin.js` — server-only, service-role key, bypasses RLS. Never import into a Client Component.

## Styling

No Tailwind or CSS-in-JS — plain global CSS in `app/globals.css` using `lh-*` prefixed classes and CSS custom
properties (`--lh-navy`, `--lh-teal`, `--lh-gold`, etc.) for the design system. Fonts: Fraunces (display,
`.lh-display`), Inter (body default), IBM Plex Mono (`.lh-mono`).
