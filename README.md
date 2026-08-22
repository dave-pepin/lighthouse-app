# Lighthouse

A real Next.js + Supabase app, wired up to the Bridge/Harbor prototype design.

## 1. Install dependencies

Open a terminal, navigate into this folder, and run:

```
npm install
```

## 2. Add your Supabase credentials

Copy `.env.local.example` to a new file named `.env.local`:

```
cp .env.local.example .env.local
```

It already has your Project URL and publishable key filled in from our setup —
just double check they match what's in Supabase under **Settings → API**.

## 3. Run it locally

```
npm run dev
```

Then open **http://localhost:3000** in your browser. You should land on the
login page.

## 4. Log in

Use the email/password you created earlier in Supabase under
**Authentication → Users**.

## 5. Add a test Journey

There's no "create Journey" form yet in this first version — for now, add
Journeys directly in Supabase's Table Editor, or run `seed-sample-journey.sql`
in the SQL Editor (edit the email at the top to match your own first).

## What's real vs. what's still a placeholder

- **Real:** login/logout, reading Journeys/milestones/documents from your
  database, toggling milestones, uploading documents to Supabase Storage,
  editing and approving weekly updates, creating new Journeys from the UI,
  emailing and texting clients via Resend and Twilio, and a full read-only
  **client portal** clients can log into to see their progress, milestones,
  latest update, and shared documents.
- **Requires setup:** Resend, Twilio, and now the Supabase **service role
  key** (used only server-side, to create client logins when you invite
  them) all need to be added to `.env.local`. See below.

## Setting up the client portal

1. Run `add-client-portal-migration.sql` in the Supabase SQL Editor.
2. In Supabase, go to **Settings → API**, find the **service_role** secret
   key, and paste it into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`. Treat
   this like a password — it bypasses all database security rules.
3. On any Journey's detail page, click **"Invite client to portal"** — this
   emails them a link to set a password. Once they do, they can log in at
   the same `/login` page and land on their own read-only portal.

## Project structure

```
app/
  login/              Sign-in page
  (dashboard)/        Everything behind login
    layout.js         Sidebar + auth-aware shell
    bridge/           Active Journeys dashboard
    harbor/           Closed Journeys
    journey/[id]/     Journey detail, milestones, documents, weekly update
components/           Shared UI (CourseLine, StageTag, JourneyCard, Sidebar)
lib/supabase/         Supabase client setup (browser, server, middleware)
middleware.js         Redirects signed-out users to /login
```
