import { Mail, Phone, Printer, MapPin, BadgeCheck } from "lucide-react";

// Combines the street address with city/state/zip onto one display line
// — any of these can be set independently, so this only joins the
// pieces that are actually present.
function formatFullAddress(agentBranding) {
  const cityStateZip = [
    [agentBranding.officeCity, agentBranding.officeState].filter(Boolean).join(", "),
    agentBranding.officeZip,
  ]
    .filter(Boolean)
    .join(" ");
  return [agentBranding.officeAddress, cityStateZip].filter(Boolean).join(", ");
}

// Whether there's anything to show at all — reply-to email deliberately
// isn't part of this check on its own — it already existed for a
// different purpose (routing email replies) before this feature, so its
// mere presence shouldn't silently opt an agent into a public-facing
// footer. It still shows as an extra line once one of these
// purpose-built fields has already opted them in.
export function hasAgentBranding(agentBranding) {
  return !!(
    agentBranding?.photoUrl ||
    agentBranding?.logoUrl ||
    agentBranding?.officeAddress ||
    agentBranding?.officeCity ||
    agentBranding?.officeState ||
    agentBranding?.officeZip ||
    agentBranding?.cellPhone ||
    agentBranding?.officePhone ||
    agentBranding?.faxNumber ||
    (agentBranding?.licenseNumbers && agentBranding.licenseNumbers.length > 0)
  );
}

// The actual footer markup — shared by the real client portal
// (PortalView.js) and its live preview in Settings (AgentBrandingForm.js),
// so the two can never drift apart. Styled like an email signature:
// photo, a colored divider, name + contact lines, then the logo.
export default function AgentBrandingFooter({ agentBranding }) {
  if (!agentBranding) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
      {agentBranding.photoUrl && (
        <img
          src={agentBranding.photoUrl}
          alt={agentBranding.fullName || "Your agent"}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid var(--lh-line)",
            flexShrink: 0,
          }}
        />
      )}

      {agentBranding.photoUrl &&
        ((agentBranding.showName && agentBranding.fullName) || agentBranding.email || agentBranding.cellPhone) && (
          <div
            style={{
              width: 2,
              alignSelf: "stretch",
              minHeight: 56,
              background: agentBranding.brandColor || "var(--lh-line)",
              flexShrink: 0,
            }}
          />
        )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {agentBranding.showName && agentBranding.fullName && (
          <span className="lh-display" style={{ fontSize: 16.5, fontWeight: 600, color: "var(--lh-navy)" }}>
            {agentBranding.fullName}
          </span>
        )}
        {agentBranding.cellPhone && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <Phone size={12} strokeWidth={1.75} /> {agentBranding.cellPhone}
          </span>
        )}
        {agentBranding.officePhone && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <Phone size={12} strokeWidth={1.75} /> {agentBranding.officePhone} (office)
          </span>
        )}
        {agentBranding.faxNumber && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <Printer size={12} strokeWidth={1.75} /> {agentBranding.faxNumber} (fax)
          </span>
        )}
        {agentBranding.email && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <Mail size={12} strokeWidth={1.75} /> {agentBranding.email}
          </span>
        )}
        {formatFullAddress(agentBranding) && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <MapPin size={12} strokeWidth={1.75} /> {formatFullAddress(agentBranding)}
          </span>
        )}
        {agentBranding.licenseNumbers && agentBranding.licenseNumbers.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lh-slate)" }}>
            <BadgeCheck size={12} strokeWidth={1.75} /> Lic. {agentBranding.licenseNumbers.join(" · ")}
          </span>
        )}
      </div>

      {agentBranding.logoUrl && (
        <img
          src={agentBranding.logoUrl}
          alt=""
          style={{ height: 48, width: "auto", maxWidth: 180, objectFit: "contain", marginLeft: 8 }}
        />
      )}
    </div>
  );
}
