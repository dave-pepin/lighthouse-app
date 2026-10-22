import Link from "next/link";
import { calculateCommission, summarizeCommissions, formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/commission";

// The Bridge's income snapshot, sized for the Sidebar under the nav (see
// SidebarPortal; on mobile the Bridge shows it inline instead): each
// Journey under contract with what the agent stands to make on it, then
// totals comparing the live pipeline against what closed this calendar
// year. Figures come from journey_financials (the Journey page's
// CommissionPanel); the math lives in lib/commission.js. See
// bridge/page.js for which Journeys count as under contract or closed.
export default function BusinessTracker({ underContract, closed, year }) {
  const pending = summarizeCommissions(underContract);
  const done = summarizeCommissions(closed);
  const pct = (v) => (v == null ? "—" : formatPercent(v));

  const rows = [
    { label: "Deals", pending: pending.count, done: done.count },
    { label: "Volume", pending: formatCompactCurrency(pending.volume), done: formatCompactCurrency(done.volume) },
    { label: "Avg. rate", pending: pct(pending.averagePercent), done: pct(done.averagePercent) },
    { label: "Referrals", pending: formatCompactCurrency(pending.referralFees), done: formatCompactCurrency(done.referralFees) },
    { label: "Earned", pending: formatCompactCurrency(pending.net), done: formatCompactCurrency(done.net), strong: true },
  ];

  const sectionLabel = {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--lh-slate-light)",
    letterSpacing: 0.3,
  };

  return (
    <section
      style={{
        background: "var(--lh-paper)",
        border: "1px solid var(--lh-line)",
        borderRadius: 10,
        padding: "10px 11px",
        fontSize: 11.5,
      }}
    >
      <h2 className="lh-mono" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--lh-navy)", letterSpacing: 0.3, margin: "0 0 8px" }}>
        BUSINESS TRACKER
      </h2>

      <div className="lh-mono" style={sectionLabel}>
        UNDER CONTRACT
      </div>
      {underContract.length === 0 ? (
        <p style={{ color: "var(--lh-slate-light)", margin: "3px 0 0" }}>Nothing right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {underContract.map((j) => {
            const { net } = calculateCommission(j.financials);
            // Street line only — the full address won't fit at this width.
            const street = j.property_address?.split(",")[0].trim();
            return (
              <Link
                key={j.id}
                href={`/journey/${j.id}`}
                title={j.property_address || j.client_name}
                className="lh-focus"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 6,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--lh-line)",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: street ? "var(--lh-navy)" : "var(--lh-slate)",
                  }}
                >
                  {street || j.client_name}
                </span>
                <span
                  className="lh-mono"
                  style={{
                    flexShrink: 0,
                    fontWeight: 600,
                    color: net == null ? "var(--lh-slate-light)" : "var(--lh-teal)",
                  }}
                >
                  {net == null ? "—" : formatCurrency(Math.round(net))}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr>
            <th />
            {[
              ["PENDING", "Under contract now"],
              ["CLOSED", `Closed in ${year}`],
            ].map(([h, title]) => (
              <th
                key={h}
                scope="col"
                className="lh-mono"
                title={title}
                style={{ ...sectionLabel, textAlign: "right", padding: "0 0 3px 6px" }}
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
                  padding: "4px 0",
                  whiteSpace: "nowrap",
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
                    padding: "4px 0 4px 6px",
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
      <p style={{ fontSize: 10.5, color: "var(--lh-slate-light)", margin: "6px 0 0" }}>Closed = closed in {year}.</p>
    </section>
  );
}
