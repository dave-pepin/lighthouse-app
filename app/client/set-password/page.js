"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";
import { notifyClientActivated } from "./actions";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase's invite/magic links land here with the session tokens in
    // the URL fragment (e.g. #access_token=...&refresh_token=...). Only
    // the browser can read that part of the URL, so we pick it up here
    // and turn it into a real logged-in session.
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        setReady(true);
        // Clean the sensitive tokens out of the visible URL.
        window.history.replaceState(null, "", window.location.pathname);
      });
    } else {
      // Maybe there's already a session (e.g. link was already used once).
      supabase.auth.getUser().then(({ data }) => {
        setReady(!!data?.user);
        if (!data?.user) {
          setError("This link has expired or already been used. Ask your agent to resend it.");
        }
      });
    }
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    try {
      await notifyClientActivated();
    } catch (err) {
      // Best-effort — never block the client from reaching their portal
      // over an internal notification failing.
      Sentry.captureException(err);
    }
    router.push("/client/portal");
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
      <div
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "32px 30px",
          width: 340,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Anchor size={20} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 21, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", marginBottom: 20 }}>
          Set a password to access your home journey.
        </p>

        {ready ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="lh-focus"
              style={{ border: "1px solid var(--lh-line)", borderRadius: 8, padding: "9px 11px", fontSize: 14 }}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="lh-focus"
              style={{ border: "1px solid var(--lh-line)", borderRadius: 8, padding: "9px 11px", fontSize: 14 }}
            />
            {error && <div style={{ fontSize: 12.5, color: "#B4472A" }}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="lh-focus"
              style={{
                background: "var(--lh-navy)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {submitting ? "Saving..." : "Set password & continue"}
            </button>
          </form>
        ) : (
          <div style={{ fontSize: 13.5, color: error ? "#B4472A" : "var(--lh-slate)" }}>
            {error || "Checking your invite link..."}
          </div>
        )}
      </div>
    </div>
  );
}
