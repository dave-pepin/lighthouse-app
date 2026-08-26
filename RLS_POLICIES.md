# Row Level Security policies (reference snapshot)

Every table's RLS policies are configured directly in the Supabase
dashboard — there's no migration runner tracking them, so this file is a
**manually-refreshed reference snapshot**, not a source of truth Supabase
actually reads. It exists so a future change (a new table, a new agent-
facing feature) can be checked against what's *actually* enforced instead
of guessing, the way several migrations earlier in this build-out had to
flag their own policies as "assumption to verify."

**Last captured:** 2026-08-26, after applying
`add-agency-delegates-migration.sql` (see below — the app's first
cross-agency data-sharing mechanism between ordinary agents), on top of
`add-property-photos-update-policy-migration.sql` and
`fix-document-requests-agency-policy-migration.sql`.

**To refresh this file** after any dashboard-side policy change, run in
the Supabase SQL Editor and update this file from the result:
```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## The shared shape

Almost everything here reduces to one rule: **an agent can reach a row if
it belongs to their own agency; a client can reach a row if it belongs to
their own Journey.** Most tables scope through `journeys.agency_id`
(directly, or via a `journey_id` foreign key), either through the
`auth_agency_id()` helper function or an equivalent inline subquery
(`select agency_id from users where id = auth.uid()`) — both forms exist
in the dashboard today; they're equivalent, just written two different
ways depending on when each policy was added.

`short_links` and `rate_limit_hits` deliberately have **no policies at
all** (RLS enabled, zero grants) — the first because short-link visitors
aren't authenticated yet (see `app/i/[code]/route.js`), the second
because it's purely an internal counter only the admin/service-role
client ever touches (see `add-rate-limit-migration.sql`).

## Per table

**`agencies`**
- `agents can view their own agency` (SELECT) — `id = <caller's agency_id>`
- `agents can update their own agency` (UPDATE) — same condition
- `agency members can view their agency` (SELECT) — same condition again, via `auth_agency_id()`. Redundant with the first policy (same effective access, written twice) — harmless, but worth collapsing to one if this table's policies are ever touched again.

**`users`**
- `agency members can view each other` (SELECT) — `agency_id = auth_agency_id()`
- No UPDATE policy — deliberate. Agents update their own `users` row (`reply_to_email`, `sms_phone_number`, `overdue_digest_threshold_days`) only through the admin client (see the comment on `updateAgentContactInfo` in `app/(dashboard)/settings/actions.js`), precisely because this policy doesn't exist yet.

**`journeys`**
- `agents can view their agency's journeys` (SELECT) — `agency_id = <caller's agency_id>`
- `agents can update their agency's journeys` (UPDATE) — same
- `agents can insert journeys for their agency` (INSERT) — `with_check` on the same condition
- `agents can delete their own journeys` (DELETE) — narrower: `agent_id = auth.uid()` (only the owning agent, not the whole agency)
- `clients can view their own journey` (SELECT) — `client_user_id = auth.uid()`

**`milestones`, `weekly_updates`** — same shape: one `ALL` policy for agents scoped by `journey_id IN (... WHERE journeys.agency_id = <caller's agency_id>)`, one client `SELECT` scoped by `client_user_id = auth.uid()` (weekly_updates' client policy also requires `status = 'sent'` — clients never see drafts). `weekly_updates` additionally has a standalone agent `SELECT` that's redundant with its own `ALL` policy.

**`documents`** — same shape, but split into a separate agent `SELECT` and an agent `ALL` (both present, `ALL` supersedes the `SELECT`) plus the client `SELECT`.

**`property_photos`** — agent `SELECT`/`INSERT`/`DELETE`, all scoped by `journey_id IN (... WHERE journeys.agency_id = <caller's agency_id>)`, plus client `SELECT`. **Was missing agent `UPDATE`** — fixed by `add-property-photos-update-policy-migration.sql` (see top of this file).

**`document_requests`** — agent `SELECT` (now scoped via `journeys.agency_id`, fixed by `fix-document-requests-agency-policy-migration.sql`), client `SELECT` scoped by `client_user_id = auth.uid()`. Deliberately **no INSERT/UPDATE policies at all** — every write goes through the admin client after an application-level ownership check (see `requestDocument`/`cancelDocumentRequest` in `app/(dashboard)/journey/[id]/actions.js`, and `getClientDocumentUploadUrl`/`fulfillDocumentRequest` in `app/client/portal/actions.js`).

**`milestone_video_defaults`, `videos`** — agency-scoped SELECT/INSERT (both), plus UPDATE/DELETE for `milestone_video_defaults` only (matches that `videos` has no update/delete action anywhere in the app today).

**`agency_delegates`** (new) — lets an agent grant a colleague at a *different* agency time-boxed access to their own agency's data (e.g. covering the business while away), without changing that colleague's actual `agency_id`. Agency members can SELECT/INSERT/DELETE grants for their own `agency_id`; a delegate can SELECT their own grant rows. A `stable` SQL function, `is_active_agency_delegate(target_agency_id)`, checks for a currently-active (`now() between starts_at and ends_at`) grant and is used inside the additive policies below — none of them replace or modify the existing agent policies documented above, they just add a second way in.

- **`agencies`** — delegate SELECT, scoped to just seeing the covered agency's name (for the switcher/banner) — no UPDATE.
- **`journeys`** — delegate SELECT + UPDATE only (no INSERT/DELETE — a delegate can't create or delete Journeys).
- **`milestones`, `documents`, `property_photos`** — delegate SELECT + INSERT + UPDATE + DELETE (view/upload/edit), scoped via `journey_id IN (... WHERE is_active_agency_delegate(agency_id))`.
- **`weekly_updates`, `document_requests`** — delegate **SELECT only**, deliberately. Both tables' write paths (`approveAndSend`/`scheduleUpdate`, `requestDocument`) send a client-facing message, and `inviteClient` similarly invites a new client login — none of the three has ever had a real application-level agency-ownership check (they rely on an initial RLS-gated read, then proceed via the admin client, which bypasses RLS). Since relaxing `journeys` SELECT for delegates would otherwise let a delegate reach all three anyway, `lib/agencyAccess.js`'s `assertRealAgencyMember` guards all three explicitly — the actual security boundary for "no sending messages" is that check, not RLS alone.

Known open item from building this: the `property-photos`/`documents` **storage bucket** policies aren't tracked anywhere in this repo (dashboard-configured, unlike the table-level RLS above) — if a delegate's file upload/download doesn't work in practice, that's a separate bucket-policy fix, not a gap in the migration itself.

## Known gaps / follow-ups

- `agencies`'s duplicate SELECT policy and `weekly_updates`'s redundant standalone SELECT (see above) are harmless but worth collapsing next time either table's policies are touched.
- If a future feature ever needs to update a `users` row via the regular RLS-scoped client instead of the admin client, that policy doesn't exist yet and will need adding.
