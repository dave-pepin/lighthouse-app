"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { grantDelegateAccess, revokeDelegateAccess } from "./actions";

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--lh-navy)",
  marginBottom: 4,
  display: "block",
};

const helpStyle = {
  fontSize: 12,
  color: "var(--lh-slate)",
  marginBottom: 12,
  lineHeight: 1.45,
};

const inputStyle = {
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

const fieldGroupStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

const primaryButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--lh-navy)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

function formatRange(startsAt, endsAt) {
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(startsAt)} - ${fmt(endsAt)}`;
}

export default function DelegateAccessForm({ grants }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState(null);

  const handleGrant = async () => {
    setSaving(true);
    setError("");
    try {
      await grantDelegateAccess(email, startsAt, endsAt);
      setEmail("");
      setStartsAt("");
      setEndsAt("");
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't grant that access.");
    }
    setSaving(false);
  };

  const handleRevoke = async (grantId) => {
    setRevokingId(grantId);
    try {
      await revokeDelegateAccess(grantId);
      router.refresh();
    } catch {
      // Nothing more useful to show — the list will just still show it,
      // and they can try again.
    }
    setRevokingId(null);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>Delegate access</label>
      <p style={helpStyle}>
        Give a colleague at a different agency time-boxed access to see and edit your Journeys —
        e.g. covering your business while you&apos;re away. They can view, upload, and edit
        milestones/documents/photos, but can&apos;t send anything to your clients (no invites,
        updates, or document requests). Access ends automatically after the date you pick.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@theiragency.com"
          className="lh-focus"
          style={{ ...inputStyle, flex: "2 1 220px" }}
        />
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="lh-focus"
          style={{ ...inputStyle, flex: "1 1 130px" }}
        />
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="lh-focus"
          style={{ ...inputStyle, flex: "1 1 130px" }}
        />
      </div>

      {error && <div style={{ fontSize: 13, color: "var(--lh-red)", marginBottom: 10 }}>{error}</div>}

      <button
        onClick={handleGrant}
        disabled={saving || !email || !startsAt || !endsAt}
        className="lh-focus"
        style={{ ...primaryButtonStyle, opacity: saving || !email || !startsAt || !endsAt ? 0.6 : 1 }}
      >
        <Check size={14} /> {saving ? "Granting..." : "Grant access"}
      </button>

      {grants.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {grants.map((g) => (
            <div
              key={g.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 13,
                padding: "8px 0",
                borderTop: "1px solid var(--lh-line)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: "var(--lh-navy)" }}>{g.delegateName}</span>
                <span style={{ color: "var(--lh-slate)" }}> — {formatRange(g.starts_at, g.ends_at)}</span>
              </div>
              <button
                onClick={() => handleRevoke(g.id)}
                disabled={revokingId === g.id}
                className="lh-focus"
                title="Revoke access"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "1px solid var(--lh-line)",
                  borderRadius: 7,
                  padding: "3px 9px",
                  fontSize: 11.5,
                  color: "var(--lh-slate)",
                  cursor: "pointer",
                }}
              >
                <X size={12} /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
