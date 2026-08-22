"use client";

import { useState } from "react";
import Link from "next/link";
import { Anchor } from "lucide-react";
import { startAgentCheckout } from "./actions";

const inputStyle = {
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--lh-slate)",
  marginBottom: 4,
  display: "block",
};

export default function SignupPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError("");
    try {
      await startAgentCheckout(formData);
    } catch (err) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lh-fog)",
        padding: "40px 20px",
      }}
    >
      <form
        action={handleSubmit}
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "32px 30px",
          width: 380,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Anchor size={20} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 21, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", margin: 0 }}>
          Set up a new agent account. You'll get your own private workspace —
          your clients stay separate from every other agent on Lighthouse.
        </p>

        <div>
          <label style={labelStyle}>Your name</label>
          <input name="full_name" required style={{ ...inputStyle, width: "100%" }} placeholder="Jane Smith" />
        </div>

        <div>
          <label style={labelStyle}>Brokerage / agency name</label>
          <input name="agency_name" required style={{ ...inputStyle, width: "100%" }} placeholder="Smith Realty Group" />
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input name="email" type="email" required style={{ ...inputStyle, width: "100%" }} placeholder="jane@example.com" />
        </div>

        <p style={{ fontSize: 12, color: "var(--lh-slate-light)", margin: 0, lineHeight: 1.5 }}>
          Next you&apos;ll be taken to a secure payment page to start your subscription.
          Once that&apos;s done, we&apos;ll email you a link to set your password and get started.
        </p>

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
          {submitting ? "Continuing to payment..." : "Continue to payment"}
        </button>

        <Link href="/login" className="lh-focus" style={{ fontSize: 12.5, color: "var(--lh-slate)", textAlign: "center" }}>
          Already have an account? Sign in
        </Link>
      </form>
    </div>
  );
}
