import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminConsole from "./AdminConsole";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) {
    redirect("/bridge");
  }

  const admin = createAdminClient();

  const [{ data: agencies }, { data: agents }, { data: journeys }] = await Promise.all([
    admin
      .from("agencies")
      .select("id, name, subscription_status, stripe_customer_id, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("users")
      .select("id, agency_id, full_name, email, is_platform_owner")
      .order("full_name", { ascending: true }),
    admin.from("journeys").select("id, agent_id"),
  ]);

  // Login-ban status lives on the Auth user, not the users table.
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const bannedById = new Map(
    (authList?.users || []).map((u) => [
      u.id,
      !!u.banned_until && new Date(u.banned_until) > new Date(),
    ])
  );

  const journeyCountByAgent = {};
  for (const j of journeys || []) {
    journeyCountByAgent[j.agent_id] = (journeyCountByAgent[j.agent_id] || 0) + 1;
  }

  const agentsByAgency = {};
  for (const a of agents || []) {
    if (!agentsByAgency[a.agency_id]) agentsByAgency[a.agency_id] = [];
    agentsByAgency[a.agency_id].push({
      ...a,
      banned: bannedById.get(a.id) || false,
      journeyCount: journeyCountByAgent[a.id] || 0,
    });
  }

  const agenciesWithAgents = (agencies || []).map((agency) => ({
    ...agency,
    agents: agentsByAgency[agency.id] || [],
  }));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 32px 60px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>
          Admin
        </h1>
        <a href="/bridge" style={{ fontSize: 13, color: "var(--lh-slate)" }}>
          ← Back to your Bridge
        </a>
      </div>
      <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 28 }}>
        Every agency signed up for Lighthouse, across all customers.
      </p>
      <AdminConsole agencies={agenciesWithAgents} />
    </div>
  );
}
