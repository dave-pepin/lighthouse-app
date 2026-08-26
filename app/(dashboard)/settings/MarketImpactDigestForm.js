"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updateMarketImpactReportFrequency } from "./actions";

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

// "" represents "off" (a null frequency) — same convention as
// OverdueDigestForm's threshold select.
function toSelectValue(frequency) {
  return frequency || "";
}

export default function MarketImpactDigestForm({ frequency }) {
  const [value, setValue] = useState(toSelectValue(frequency));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateMarketImpactReportFrequency(value === "" ? null : value);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save that preference.");
    }
    setSaving(false);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>Market Impact Reports</label>
      <p style={helpStyle}>
        A recurring reminder email listing every closed client whose closing anniversary has come
        back around — a natural nudge to reach out with a market update on their home. Based on
        their Journey&apos;s actual closing date, not today&apos;s date.
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
        <option value="quarterly">Quarterly</option>
        <option value="semiannual">Every 6 months</option>
        <option value="annual">Annually</option>
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
