"use client";

import { FileText } from "lucide-react";
import { recordDocumentViewed } from "./actions";

// PortalView (which renders the general Documents section) is a Server
// Component, so its links can't carry an onClick directly — this small
// Client Component exists just to record that the client actually opened
// a document, the same way MilestoneDocumentLink does for per-milestone
// attachments.
export default function TrackedDocumentLink({ doc, journeyId, previewMode }) {
  return (
    <a
      href={doc.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="lh-focus"
      onClick={() => {
        if (!previewMode && journeyId) {
          recordDocumentViewed(journeyId, doc.id);
        }
      }}
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
      <span style={{ flex: 1, textDecoration: "underline" }}>{doc.name}</span>
    </a>
  );
}
