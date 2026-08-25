"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updateOverdueDigestPreference } from "./actions";

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
  marginBottom: 8,
  lineHeight: 1.45,
};

const selectStyle = {
  width: "100%",
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

// The <select> value is always a string; "" represents "off" (a null
// threshold), everything else parses straight to the integer column.
function toSelectValue(thresholdDays) {
  return thresholdDays === null || thresholdDays === undefined ? "" : String(thresholdDays);
}

export default function OverdueDigestForm({ thresholdDays }) {
  const [value, setValue] = useState(toSelectValue(thresholdDays));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateOverdueDigestPreference(value === "" ? null : Number(value));
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save that preference.");
    }
    setSaving(false);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>Overdue milestone alerts</label>
      <p style={helpStyle}>
        A daily email listing your not-yet-done milestones, once they reach this point relative to
        their due date. It keeps reminding you once a day until each one is marked done or its due
        date changes.
      </p>
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        className="lh-focus"
        style={selectStyle}
      >
        <option value="">Off</option>
        <option value="0">The day it&apos;s due</option>
        <option value="1">1 day after it&apos;s due</option>
        <option value="2">2 days after it&apos;s due</option>
        <option value="3">3 days after it&apos;s due</option>
      </select>
      {error && <div style={{ fontSize: 13, color: "var(--lh-red)", marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button onClick={handleSave} disabled={saving} className="lh-focus" style={primaryButtonStyle}>
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span
            style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--lh-teal)", fontSize: 13, fontWeight: 600 }}
          >
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
