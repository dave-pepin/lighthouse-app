"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Backs the Sidebar's "My agency" / "Covering: X" switcher. Doesn't
// verify the grant here — getEffectiveAgency (lib/effectiveAgency.js)
// re-checks it's still active on every page load, so a stale or expired
// cookie value just silently falls back to the agent's own agency.
export async function setActiveAgency(agencyId) {
  const cookieStore = await cookies();
  if (!agencyId) {
    cookieStore.delete("active_agency_id");
  } else {
    cookieStore.set("active_agency_id", agencyId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  revalidatePath("/", "layout");
}
