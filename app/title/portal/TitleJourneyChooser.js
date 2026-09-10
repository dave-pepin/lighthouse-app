import { Anchor } from "lucide-react";
import ClientSignOutButton from "@/components/ClientSignOutButton";

// Shown when the same title company login has been invited to more than
// one Journey (an agent may reuse the same contact across deals). Mirrors
// app/client/portal/JourneyChooser.js.
export default function TitleJourneyChooser({ journeys }) {
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
          You have documents access on more than one Journey.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {journeys.map((j) => (
            <a
              key={j.journeyId}
              href={`/title/portal?journey=${j.journeyId}`}
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
                  {j.clientName}
                </div>
                <div style={{ fontSize: 13, color: "var(--lh-slate)", marginTop: 2 }}>
                  {j.propertyAddress || "Address not set yet"}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
