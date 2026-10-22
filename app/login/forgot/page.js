"use client";

import { useState } from "react";
import Link from "next/link";
import { Anchor } from "lucide-react";
import { requestPasswordReset } from "../actions";

// Lives under /login so the middleware's existing public carve-out for the
// login page covers it too.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send the reset email.");
    }
    setLoading(false);
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
          maxWidth: "calc(100vw - 32px)",
          boxSizing: "border-box",
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

        {sent ? (
          <p style={{ fontSize: 13.5, color: "var(--lh-navy-soft)", margin: 0, lineHeight: 1.5 }}>
            If there&apos;s a Lighthouse account for <strong>{email.trim()}</strong>, we&apos;ve emailed it a link to
            set a new password. It expires soon, so use it when it arrives. Check your spam folder if you don&apos;t
            see it in a few minutes.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--lh-slate)", margin: 0, lineHeight: 1.5 }}>
              Forgot your password, or your invite link stopped working? Enter your email and we&apos;ll send a new
              link to set your password.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="lh-focus"
              style={{
                border: "1px solid var(--lh-line)",
                borderRadius: 8,
                padding: "9px 11px",
                fontSize: 14,
              }}
            />
            {error && <div style={{ fontSize: 12.5, color: "#B4472A" }}>{error}</div>}
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
              {loading ? "Sending..." : "Email me a link"}
            </button>
          </>
        )}

        <Link href="/login" className="lh-focus" style={{ fontSize: 12.5, color: "var(--lh-slate)", textAlign: "center" }}>
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
