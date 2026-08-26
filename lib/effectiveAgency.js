import { cookies } from "next/headers";

// Which agency's data the signed-in agent should currently see: their own
// by default, or — if they've picked "Covering: X" from the Sidebar
// switcher and that grant is still within its time window — the covered
// agency instead. Neither the Bridge nor Journey pages filter by
// agency_id in application code beyond this; once delegate RLS policies
// make a second agency's rows visible to the same auth.uid(), this is
// what actually decides which single agency's Journeys a page shows,
// rather than silently mixing both together.
export async function getEffectiveAgency(supabase, userId) {
  const { data: profile } = await supabase.from("users").select("agency_id, full_name").eq("id", userId).single();

  const selected = (await cookies()).get("active_agency_id")?.value;

  if (selected && selected !== profile.agency_id) {
    const { data: grant } = await supabase
      .from("agency_delegates")
      .select("agency_id, ends_at, agencies(name)")
      .eq("agency_id", selected)
      .eq("delegate_user_id", userId)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .maybeSingle();

    if (grant) {
      return {
        agencyId: grant.agency_id,
        agencyName: grant.agencies?.name || "another agency",
        isDelegate: true,
        endsAt: grant.ends_at,
        ownAgencyId: profile.agency_id,
      };
    }
  }

  return { agencyId: profile.agency_id, agencyName: null, isDelegate: false, ownAgencyId: profile.agency_id };
}

// Every currently-active delegate grant for this agent — populates the
// Sidebar switcher's options alongside "My agency".
export async function getActiveDelegateGrants(supabase, userId) {
  const { data } = await supabase
    .from("agency_delegates")
    .select("agency_id, ends_at, agencies(name)")
    .eq("delegate_user_id", userId)
    .lte("starts_at", new Date().toISOString())
    .gte("ends_at", new Date().toISOString());

  return (data || []).map((g) => ({ agencyId: g.agency_id, agencyName: g.agencies?.name || "another agency", endsAt: g.ends_at }));
}
