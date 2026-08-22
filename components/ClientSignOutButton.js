"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClientSignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="lh-focus"
      style={{
        background: "none",
        border: "none",
        padding: 0,
        fontSize: 12.5,
        color: "var(--lh-slate)",
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      Sign out
    </button>
  );
}
