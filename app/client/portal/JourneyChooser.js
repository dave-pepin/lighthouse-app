import { Anchor } from "lucide-react";
import StageTag from "@/components/StageTag";
import ClientSignOutButton from "@/components/ClientSignOutButton";

// Shown instead of the normal portal when a client's login is tied to more
// than one active Journey (e.g. selling their current home while also
// buying a new one). Picking one takes them to the regular portal, scoped
// to that Journey via ?journey=<id>.
export default function JourneyChooser({ journeys }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lh-fog)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderBottom: "1px solid var(--lh-line)",
          background: "var(--lh-paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Anchor size={18} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 19, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <ClientSignOutButton />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px 60px" }}>
        <h1 className="lh-display" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>
          Which Journey would you like to view?
        </h1>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 26 }}>
          You have more than one active Journey with us.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {journeys.map((j) => (
            <a
              key={j.id}
              href={`/client/portal?journey=${j.id}`}
              className="lh-focus lh-anim"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "var(--lh-paper)",
                border: "1px solid var(--lh-line)",
                borderRadius: 14,
                padding: "18px 20px",
                textDecoration: "none",
              }}
            >
              <div>
                <div className="lh-display" style={{ fontSize: 16.5, fontWeight: 600, color: "var(--lh-navy)" }}>
                  {j.role} Journey
                </div>
                <div style={{ fontSize: 13, color: "var(--lh-slate)", marginTop: 2 }}>
                  {j.property_address || "Address not set yet"}
                </div>
              </div>
              <StageTag stage={j.stage} statusLevel={j.status_level} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
