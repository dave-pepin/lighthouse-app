"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { stagesForRole, stageLabel } from "@/components/CourseLine";
import { createJourney } from "./actions";

const inputStyle = {
  width: "100%",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

const labelStyle = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--lh-slate)",
  marginBottom: 5,
  display: "block",
};

export default function NewJourneyPage() {
  const [updatePreference, setUpdatePreference] = useState("both");
  const [role, setRole] = useState("Buying");
  const [stage, setStage] = useState(stagesForRole("Buying")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError("");
    try {
      await createJourney(formData);
    } catch (err) {
      // NEXT_REDIRECT is thrown on success — let it propagate.
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 32px 60px" }}>
      <Link
        href="/bridge"
        className="lh-focus"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--lh-slate)",
          fontSize: 13,
          textDecoration: "none",
          marginBottom: 22,
          width: "fit-content",
        }}
      >
        <ChevronLeft size={15} /> Back to the Bridge
      </Link>

      <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>
        New Journey
      </h1>
      <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 28 }}>
        Set up a new client to start guiding through their transaction.
      </p>

      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>Client name</label>
          <input name="client_name" required style={inputStyle} placeholder="e.g. Priya & Sam Waller" />
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <label style={labelStyle}>Role</label>
            <select
              name="role"
              required
              style={inputStyle}
              value={role}
              onChange={(e) => {
                const newRole = e.target.value;
                setRole(newRole);
                setStage(stagesForRole(newRole)[0]);
              }}
            >
              <option value="Buying">Buying</option>
              <option value="Selling">Selling</option>
            </select>
          </div>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <label style={labelStyle}>Starting stage</label>
            <select name="stage" required style={inputStyle} value={stage} onChange={(e) => setStage(e.target.value)}>
              {stagesForRole(role)
                .filter((s) => s !== "Harbor")
                .map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Is this transaction cash or financed?</label>
          <select name="financing_type" required style={inputStyle} defaultValue="financed">
            <option value="financed">Financed (loan involved)</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Property address (optional)</label>
          <input name="property_address" style={inputStyle} placeholder="123 Main St, Springfield" />
        </div>

        <div>
          <label style={labelStyle}>Next action (optional)</label>
          <input name="next_action" style={inputStyle} placeholder="e.g. Share three new listings" />
        </div>

        <div
          style={{
            background: "var(--lh-teal-soft)",
            border: "1px solid #BFE0DC",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12.5,
            color: "var(--lh-teal)",
          }}
        >
          We&apos;ll automatically set up the standard <strong>{role}</strong>{" "}
          milestone checklist for this client, in order, across every stage —
          adjusted for a cash or financed transaction as selected above.
        </div>

        {/* Update preference */}
        <div>
          <label style={labelStyle}>How should they receive weekly updates?</label>
          <select
            name="update_preference"
            required
            style={inputStyle}
            value={updatePreference}
            onChange={(e) => setUpdatePreference(e.target.value)}
          >
            <option value="email">Email only</option>
            <option value="sms">Text only</option>
            <option value="both">Both</option>
          </select>
        </div>

        {(updatePreference === "email" || updatePreference === "both") && (
          <div>
            <label style={labelStyle}>Client email</label>
            <input
              name="client_email"
              type="email"
              required
              style={inputStyle}
              placeholder="client@example.com"
            />
          </div>
        )}

        {(updatePreference === "sms" || updatePreference === "both") && (
          <div>
            <label style={labelStyle}>Client phone</label>
            <input
              name="client_phone"
              type="tel"
              required
              style={inputStyle}
              placeholder="555-0100"
            />
          </div>
        )}

        {(updatePreference === "email" || updatePreference === "both") && (
          <div>
            <label style={labelStyle}>Additional email (optional)</label>
            <input
              name="client_email_2"
              type="email"
              style={inputStyle}
              placeholder="e.g. spouse@example.com"
            />
          </div>
        )}

        {(updatePreference === "sms" || updatePreference === "both") && (
          <div>
            <label style={labelStyle}>Additional phone (optional)</label>
            <input
              name="client_phone_2"
              type="tel"
              style={inputStyle}
              placeholder="555-0100"
            />
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: "#B4472A" }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="lh-focus"
          style={{
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
            marginTop: 6,
          }}
        >
          {submitting ? "Creating..." : "Create Journey"}
        </button>
      </form>
    </div>
  );
}
