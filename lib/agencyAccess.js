// Guards the handful of actions that always send a client-facing message
// (weekly update send/schedule, client invite, document request — the
// last one notifies the client immediately on creation) regardless of
// what table-level RLS otherwise permits. Delegate access (see
// add-agency-delegates-migration.sql) deliberately grants no INSERT/UPDATE
// on weekly_updates/document_requests, but inviteClient and approveAndSend
// still go through the admin client (which bypasses RLS entirely) after
// only an initial RLS-gated read, so this is the actual security boundary
// for those two.
export async function assertRealAgencyMember(supabase, userId, agencyId) {
  const { data } = await supabase.from("users").select("id").eq("id", userId).eq("agency_id", agencyId).maybeSingle();
  if (!data) {
    throw new Error("You don't have permission to do this while covering this agency.");
  }
}
