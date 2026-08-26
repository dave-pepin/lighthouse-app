"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Lives in a sticky bar above every dashboard page (see
// app/(dashboard)/layout.js and .lh-dashboard-topbar in globals.css) —
// always reachable without scrolling, unlike the old bottom-of-sidebar
// placement it replaces on desktop. Small enough that duplicating the
// tiny bit of sign-out logic Sidebar.js also has is simpler than
// threading it through as a prop.
export default function TopBarProfile({ fullName }) {
  const router = useRouter();
  const supabase = createClient();

  const initials = (fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: "var(--lh-paper)",
        border: "1px solid var(--lh-line)",
        borderRadius: 999,
        padding: "5px 14px 5px 5px",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "var(--lh-navy)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-navy)", whiteSpace: "nowrap" }}>
        {fullName}
      </span>
      <button
        onClick={handleSignOut}
        className="lh-focus"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 12,
          color: "var(--lh-slate)",
          cursor: "pointer",
          textDecoration: "underline",
          whiteSpace: "nowrap",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
