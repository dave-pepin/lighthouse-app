import { Anchor, FileText } from "lucide-react";
import ClientSignOutButton from "@/components/ClientSignOutButton";
import TitleDocumentUpload from "./TitleDocumentUpload";

// The title company's whole portal — documents only, no milestones,
// updates, or anything else, matching their scoped access.
export default function TitlePortalView({ journey, companyName, documentsWithLinks, hasMultipleJourneys }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {hasMultipleJourneys && (
            <a href="/title/portal" className="lh-focus" style={{ fontSize: 12.5, color: "var(--lh-slate)" }}>
              Switch Journey
            </a>
          )}
          <ClientSignOutButton />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px 60px" }}>
        <p style={{ fontSize: 12.5, color: "var(--lh-slate-light)", margin: "0 0 4px" }}>{companyName}</p>
        <h1 className="lh-display" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
          {journey.client_name}
        </h1>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 28 }}>
          {journey.property_address || "Address not set yet"}
        </p>

        <div
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="lh-display" style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
              Documents
            </h2>
            <TitleDocumentUpload journeyId={journey.id} />
          </div>

          {documentsWithLinks.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--lh-slate-light)" }}>No documents yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {documentsWithLinks.map((d) => (
                <a
                  key={d.id}
                  href={d.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lh-focus"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 13.5,
                    color: "var(--lh-navy)",
                    textDecoration: "none",
                  }}
                >
                  <FileText size={16} color="var(--lh-slate)" strokeWidth={1.75} />
                  <span style={{ flex: 1, textDecoration: "underline" }}>{d.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
