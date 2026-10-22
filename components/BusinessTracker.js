import Link from "next/link";
import { Briefcase } from "lucide-react";
import { calculateCommission, summarizeCommissions, formatCurrency, formatPercent } from "@/lib/commission";

const money = (value) => formatCurrency(value);

// The Bridge's income snapshot: each Journey under contract with what the
// agent stands to make on it, then totals comparing the live pipeline
// against what actually closed this calendar year. Figures come from
// journey_financials, entered in the Journey page's CommissionPanel; the
// math lives in lib/commission.js. See bridge/page.js for which Journeys
// count as under contract or closed.
export default function BusinessTracker({ underContract, closed, year }) {
  const pending = summarizeCommissions(underContract);
  const done = summarizeCommissions(closed);

  const rows = [
    { label: "Transactions", pending: pending.count, done: done.count },
    { label: "Sales volume", pending: money(pending.volume), done: money(done.volume) },
    {
      label: "Avg. commission",
      pending: pending.averagePercent == null ? "—" : formatPercent(pending.averagePercent),
      done: done.averagePercent == null ? "—" : formatPercent(done.averagePercent),
    },
    { label: "Referral fees paid", pending: money(pending.referralFees), done: money(done.referralFees) },
    { label: "Your commission", pending: money(pending.net), done: money(done.net), strong: true },
  ];

  return (
    <section
      style={{
        marginTop: 28,
        background: "var(--lh-paper)",
        border: "1px solid var(--lh-line)",
        borderRadius: 14,
        padding: "16px 20px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Briefcase size={15} color="var(--lh-navy)" strokeWidth={1.75} />
        <h2 className="lh-mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--lh-navy)", letterSpacing: 0.3, margin: 0 }}>
          BUSINESS TRACKER
        </h2>
      </div>

      <div className="lh-mono" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--lh-slate-light)", letterSpacing: 0.3, marginBottom: 4 }}>
        UNDER CONTRACT
      </div>
      {underContract.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--lh-slate-light)", margin: "4px 0 0" }}>Nothing under contract right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {underContract.map((j) => {
            const { net } = calculateCommission(j.financials);
            return (
              <Link
                key={j.id}
                href={`/journey/${j.id}`}
                className="lh-focus"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  padding: "7px 0",
                  borderBottom: "1px solid var(--lh-line)",
                  textDecoration: "none",
                  fontSize: 13.5,
                }}
              >
                <span style={{ minWidth: 0, color: "var(--lh-navy)", overflowWrap: "anywhere" }}>
                  {j.property_address || <span style={{ color: "var(--lh-slate-light)" }}>No address yet</span>}
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--lh-slate)" }}>{j.client_name}</span>
                </span>
                <span
                  className="lh-mono"
                  style={{
                    flexShrink: 0,
                    fontWeight: 600,
                    fontSize: net == null ? 11.5 : 13.5,
                    color: net == null ? "var(--lh-slate-light)" : "var(--lh-teal)",
                  }}
                >
                  {net == null ? "Add commission" : money(net)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
        <thead>
          <tr>
            <th />
            {["Under contract", `Closed in ${year}`].map((h) => (
              <th
                key={h}
                scope="col"
                className="lh-mono"
                style={{
                  textAlign: "right",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--lh-slate-light)",
                  letterSpacing: 0.3,
                  padding: "0 0 6px 10px",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} style={{ borderTop: "1px solid var(--lh-line)" }}>
              <th
                scope="row"
                style={{
                  textAlign: "left",
                  fontWeight: r.strong ? 700 : 500,
                  color: r.strong ? "var(--lh-navy)" : "var(--lh-slate)",
                  padding: "7px 0",
                }}
              >
                {r.label}
              </th>
              {[r.pending, r.done].map((v, i) => (
                <td
                  key={i}
                  className="lh-mono"
                  style={{
                    textAlign: "right",
                    padding: "7px 0 7px 10px",
                    fontWeight: r.strong ? 700 : 500,
                    color: r.strong ? "var(--lh-teal)" : "var(--lh-navy-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
