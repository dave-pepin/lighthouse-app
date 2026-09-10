import { Anchor, Eye, FileText } from "lucide-react";
import ClientSignOutButton from "@/components/ClientSignOutButton";
import TitleDocumentUpload from "./TitleDocumentUpload";

// The title company's whole portal — documents only, no milestones,
// updates, or anything else, matching their scoped access. Shared by the
// real title-company-facing page and the agent-facing preview
// (app/title-preview/[id]/page.js), same reasoning as the client portal's
// PortalView: `previewMode` swaps the sign-out control (which would
// otherwise sign the *agent* out of their own session) for a plain "Close
// preview" link, shows a banner, and disables the upload control.
export default function TitlePortalView({
  journey,
  companyName,
  documentsWithLinks,
  hasMultipleJourneys = false,
  previewMode = false,
  closePreviewHref = "/bridge",
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lh-fog)" }}>
      {previewMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "9px 16px",
            background: "var(--lh-navy)",
            color: "white",
            fontSize: 12.5,
          }}
        >
          <Eye size={13} />
          Previewing {companyName}&apos;s portal — this is read-only and they won&apos;t be notified.
        </div>
      )}

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
          {previewMode ? (
            <a
              href={closePreviewHref}
              className="lh-focus"
              style={{ fontSize: 12.5, color: "var(--lh-slate)", textDecoration: "underline" }}
            >
              Close preview
            </a>
          ) : (
            <>
              {hasMultipleJourneys && (
                <a href="/title/portal" className="lh-focus" style={{ fontSize: 12.5, color: "var(--lh-slate)" }}>
                  Switch Journey
                </a>
              )}
              <ClientSignOutButton />
            </>
          )}
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
            {!previewMode && <TitleDocumentUpload journeyId={journey.id} />}
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
