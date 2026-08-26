import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBarProfile from "@/components/TopBarProfile";
import { getEffectiveAgency, getActiveDelegateGrants } from "@/lib/effectiveAgency";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName = "";
  let guidanceCount = 0;
  let isPlatformOwner = false;
  let effectiveAgency = null;
  let delegateGrants = [];

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, is_platform_owner")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      // This is a client account, not an agent — send them to their portal.
      redirect("/client/portal");
    }

    fullName = profile.full_name || "";
    isPlatformOwner = !!profile.is_platform_owner;

    effectiveAgency = await getEffectiveAgency(supabase, user.id);
    delegateGrants = await getActiveDelegateGrants(supabase, user.id);

    const { count } = await supabase
      .from("journeys")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", effectiveAgency.agencyId)
      .in("status_level", ["caution", "danger"]);
    guidanceCount = count || 0;
  }

  return (
    <div className="lh-app-shell">
      <Sidebar
        guidanceCount={guidanceCount}
        fullName={fullName}
        isPlatformOwner={isPlatformOwner}
        effectiveAgency={effectiveAgency}
        delegateGrants={delegateGrants}
      />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div className="lh-dashboard-topbar">
          <TopBarProfile fullName={fullName} />
        </div>
        {children}
      </div>
    </div>
  );
}
