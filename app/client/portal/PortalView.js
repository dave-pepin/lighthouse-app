import { Anchor, Eye, Share2 } from "lucide-react";
import CourseLine from "@/components/CourseLine";
import StageTag from "@/components/StageTag";
import ClientSignOutButton from "@/components/ClientSignOutButton";
import ClientMilestoneList from "./ClientMilestoneList";
import HarborSection, { ResourceCard } from "./HarborSection";
import TrackedDocumentLink from "./TrackedDocumentLink";
import RequestedDocumentUpload from "./RequestedDocumentUpload";

// The actual portal layout — shared by the real client-facing page and
// the agent-facing preview, so they can never drift apart. `previewMode`
// swaps the sign-out control (which would otherwise sign the *agent* out
// of their own session) for a plain "Close preview" link, and shows a
// banner making it obvious this isn't the client's own session.
export default function PortalView({
  journey,
  milestonesWithVideo,
  documentsWithLinks,
  propertyPhotosWithLinks,
  latestUpdate,
  nextId,
  currentMilestoneLabel,
  inHarbor,
  guideName,
  harborResources,
  referralNote,
  justArrived,
  pendingDocumentRequests = [],
  hasMultipleJourneys = false,
  previewMode = false,
  closePreviewHref = "/bridge",
}) {
  const mainContent = (
    <>
      {propertyPhotosWithLinks.length > 0 && (
        <div style={{ margin: "20px 0" }}>
          <img
            src={propertyPhotosWithLinks[0].url}
            alt="Your property"
            style={{
              width: "100%",
              height: 260,
              objectFit: "cover",
              borderRadius: 16,
              border: "1px solid var(--lh-line)",
              background: "var(--lh-fog)",
            }}
          />
          {propertyPhotosWithLinks.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, overflowX: "auto" }}>
              {propertyPhotosWithLinks.slice(1).map((p) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt="Your property"
                  style={{
                    width: 168,
                    height: 122,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid var(--lh-line)",
                    background: "var(--lh-fog)",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ margin: "22px 0 30px" }}>
        <CourseLine stageIndex={journey.stage_index} statusLevel={journey.status_level} role={journey.role} />
      </div>

      {inHarbor && (
        <HarborSection
          journeyId={journey.id}
          guideName={guideName}
          justArrived={justArrived}
          resources={harborResources}
        />
      )}

      {latestUpdate && (
        <section
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 10px" }}>
            Latest Update
          </h2>
          {journey.property_address && (
            <div
              className="lh-display"
              style={{ fontSize: 15.5, fontWeight: 600, color: "var(--lh-navy)", marginBottom: 12 }}
            >
              {journey.property_address}
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--lh-navy-soft)", margin: 0 }}>
            {latestUpdate.draft_text}
          </p>
        </section>
      )}

      <section
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 20,
        }}
      >
        <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 12px" }}>
          Your Progress
        </h2>
        <ClientMilestoneList
          milestones={milestonesWithVideo}
          documents={documentsWithLinks}
          nextId={nextId}
          journeyId={journey.id}
          previewMode={previewMode}
        />
      </section>

      {pendingDocumentRequests.length > 0 && (
        <section
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 12px" }}>
            Requested from you
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingDocumentRequests.map((request) => (
              <RequestedDocumentUpload key={request.id} request={request} previewMode={previewMode} />
            ))}
          </div>
        </section>
      )}

      {documentsWithLinks.filter((d) => !d.milestone_id).length > 0 && (
        <section
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <h2 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 12px" }}>
            Documents
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documentsWithLinks
              .filter((d) => !d.milestone_id)
              .map((d) => (
                <TrackedDocumentLink key={d.id} doc={d} journeyId={journey.id} previewMode={previewMode} />
              ))}
          </div>
        </section>
      )}
    </>
  );

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
          Previewing {journey.client_name}&apos;s portal — this is read-only and they won&apos;t be notified.
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                <a
                  href="/client/portal"
                  className="lh-focus"
                  style={{ fontSize: 12.5, color: "var(--lh-slate)", textDecoration: "underline" }}
                >
                  Switch Journey
                </a>
              )}
              <ClientSignOutButton />
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: referralNote ? 1080 : 760, margin: "0 auto", padding: "36px 32px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>
              Your {journey.role} Journey
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--lh-slate)", marginTop: 2 }}>
              Welcome back, {journey.client_name.split(" ")[0]}.
            </p>
          </div>
          <StageTag stage={journey.stage} statusLevel={journey.status_level} currentLabel={currentMilestoneLabel} />
        </div>

        {referralNote ? (
          <div className="lh-portal-layout">
            <div className="lh-portal-main">{mainContent}</div>
            <div className="lh-portal-sidebar">
              <ResourceCard
                icon={<Share2 size={17} color="var(--lh-teal)" strokeWidth={1.75} />}
                title="Know someone buying or selling?"
              >
                {referralNote}
              </ResourceCard>
            </div>
          </div>
        ) : (
          mainContent
        )}
      </div>
    </div>
  );
}
