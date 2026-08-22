import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import TeamList from "./TeamList";

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/client/portal");

  const admin = createAdminClient();

  // Every agent in this agency — fetched through the admin client and
  // explicitly scoped to the caller's own agency_id (rather than relying
  // on unverified RLS for reading other agents' rows).
  const { data: agents } = await admin
    .from("users")
    .select("id, full_name, email")
    .eq("agency_id", profile.agency_id)
    .order("full_name", { ascending: true });

  // Pull each agent's current login status from Supabase Auth. A small
  // team's worth of calls here is fine; this would want batching if this
  // ever grows to a large roster.
  const agentsWithStatus = await Promise.all(
    (agents || []).map(async (agent) => {
      const { data } = await admin.auth.admin.getUserById(agent.id);
      const bannedUntil = data?.user?.banned_until;
      const revoked = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
      return { ...agent, revoked };
    })
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 32px 60px" }}>
      <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>
        Team
      </h1>
      <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 28 }}>
        Every agent in your agency. Revoking access blocks their login only — their
        clients and Journeys stay exactly as they are.
      </p>

      <TeamList agents={agentsWithStatus} currentUserId={user.id} />
    </div>
  );
}
