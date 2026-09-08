import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

const TITLE = "Lighthouse — Guide Every Client From Offer to Close";
const DESCRIPTION =
  "Lighthouse helps real estate agents and teams keep clients informed automatically — from accepted offer to closing day and beyond. Milestones, updates, and a client portal, built for real estate.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Logged-out visitors land on the public marketing page instead of being
// bounced straight to /login — this is the only route in the app meant
// to be reachable without an account. Logged-in behavior is unchanged:
// agents go to their Bridge, clients to their portal.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile ? "/bridge" : "/client/portal");
}
