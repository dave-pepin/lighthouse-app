"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Anchor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);
    router.push(profile ? "/bridge" : "/client/portal");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lh-fog)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "32px 30px",
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Anchor size={20} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 21, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", margin: 0 }}>
          Sign in to reach the Bridge.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="lh-focus"
          style={{
            border: "1px solid var(--lh-line)",
            borderRadius: 8,
            padding: "9px 11px",
            fontSize: 14,
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="lh-focus"
          style={{
            border: "1px solid var(--lh-line)",
            borderRadius: 8,
            padding: "9px 11px",
            fontSize: 14,
          }}
        />

        {error && (
          <div style={{ fontSize: 12.5, color: "#B4472A" }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="lh-focus"
          style={{
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <Link href="/signup" className="lh-focus" style={{ fontSize: 12.5, color: "var(--lh-slate)", textAlign: "center" }}>
          New agent? Create an account
        </Link>
      </form>
    </div>
  );
}
