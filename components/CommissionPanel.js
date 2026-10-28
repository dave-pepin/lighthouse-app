"use client";

import { useState } from "react";
import { setJourneyFinancials } from "@/app/(dashboard)/journey/[id]/actions";
import { calculateCommission, formatCurrency, parseAmount } from "@/lib/commission";
import { runAction } from "@/lib/runAction";

const toDraft = (value) => (value == null ? "" : String(Number(value)));

const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--lh-slate)", marginBottom: 3, display: "block" };

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--lh-line)",
  borderRadius: 7,
  padding: "6px 8px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
  background: "var(--lh-paper)",
};

// Sale price + commission terms beside the property address on the Journey
// page, with the commission worked out live as the agent types. Feeds the
// Bridge's Business Tracker. Agent-only: the numbers live in
// journey_financials, which clients/title companies can't read.
export default function CommissionPanel({ journeyId, financials }) {
  const [salePrice, setSalePrice] = useState(toDraft(financials?.sale_price));
  const [commissionType, setCommissionType] = useState(financials?.commission_type || "percent");
  const [commissionPercent, setCommissionPercent] = useState(toDraft(financials?.commission_percent));
  const [commissionFlat, setCommissionFlat] = useState(toDraft(financials?.commission_flat));
  const [referralPercent, setReferralPercent] = useState(toDraft(financials?.referral_percent));
  const [officeSplitPercent, setOfficeSplitPercent] = useState(toDraft(financials?.office_split_percent));
  const [saved, setSaved] = useState({
    salePrice,
    commissionType,
    commissionPercent,
    commissionFlat,
    referralPercent,
    officeSplitPercent,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed = {
    salePrice: parseAmount(salePrice),
    commissionPercent: parseAmount(commissionPercent),
    commissionFlat: parseAmount(commissionFlat),
    referralPercent: parseAmount(referralPercent),
    officeSplitPercent: parseAmount(officeSplitPercent),
  };
  const invalid = Object.values(parsed).some(Number.isNaN);

  const result = invalid
    ? null
    : calculateCommission({
        sale_price: parsed.salePrice,
        commission_type: commissionType,
        commission_percent: parsed.commissionPercent,
        commission_flat: parsed.commissionFlat,
        referral_percent: parsed.referralPercent,
        office_split_percent: parsed.officeSplitPercent,
      });

  const draft = { salePrice, commissionType, commissionPercent, commissionFlat, referralPercent, officeSplitPercent };
  const dirty = Object.keys(draft).some((k) => draft[k] !== saved[k]);

  const handleSave = async () => {
    if (invalid) {
      setError("Use numbers only, like 450000 or 2.5.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await runAction(setJourneyFinancials(journeyId, { ...parsed, commissionType }));
      setSaved(draft);
    } catch (err) {
      setError(err.message || "Couldn't save that.");
    }
    setSaving(false);
  };

  return (
    <div style={{ flex: "1 1 280px", minWidth: 0, maxWidth: 420 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ gridColumn: "1 / -1" }}>
          <span style={labelStyle}>Price under contract</span>
          <input
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            inputMode="decimal"
            placeholder="$450,000"
            className="lh-focus"
            style={inputStyle}
          />
        </label>

        <div>
          <span style={labelStyle}>Commission</span>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value)}
              aria-label="Commission type"
              className="lh-focus"
              style={{ ...inputStyle, width: "auto", padding: "6px 4px", flexShrink: 0 }}
            >
              <option value="percent">%</option>
              <option value="flat">$ flat</option>
            </select>
            {commissionType === "percent" ? (
              <input
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                inputMode="decimal"
                placeholder="3"
                aria-label="Commission percentage"
                className="lh-focus"
                style={inputStyle}
              />
            ) : (
              <input
                value={commissionFlat}
                onChange={(e) => setCommissionFlat(e.target.value)}
                inputMode="decimal"
                placeholder="$10,000"
                aria-label="Flat commission"
                className="lh-focus"
                style={inputStyle}
              />
            )}
          </div>
        </div>

        <label>
          <span style={labelStyle}>Referral fee %</span>
          <input
            value={referralPercent}
            onChange={(e) => setReferralPercent(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="lh-focus"
            style={inputStyle}
          />
        </label>

        <label>
          <span style={labelStyle} title="The share of your commission that goes to your office, e.g. 40 if you keep 60%">
            Office split %
          </span>
          <input
            value={officeSplitPercent}
            onChange={(e) => setOfficeSplitPercent(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="lh-focus"
            style={inputStyle}
          />
        </label>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--lh-line)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          fontSize: 12.5,
          color: "var(--lh-slate)",
        }}
      >
        <Line label="Gross commission" value={result?.gross} />
        {result?.referralFee > 0 && <Line label="Referral fee" value={-result.referralFee} />}
        {result?.officeSplit > 0 && <Line label="Office split" value={-result.officeSplit} />}
        <Line label="Your commission" value={result?.net} strong />
      </div>

      {(dirty || error) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          {error && <span style={{ fontSize: 11.5, color: "#B4472A", marginRight: "auto" }}>{error}</span>}
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="lh-focus"
              style={{
                background: "var(--lh-navy)",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={strong ? { fontWeight: 600, color: "var(--lh-navy)" } : undefined}>{label}</span>
      <span
        className="lh-mono"
        style={{
          fontWeight: strong ? 700 : 500,
          color: value == null ? "var(--lh-slate-light)" : strong ? "var(--lh-teal)" : "var(--lh-navy-soft)",
        }}
      >
        {value == null ? "—" : value < 0 ? `−${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}
