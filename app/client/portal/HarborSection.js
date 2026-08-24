"use client";

import { useEffect } from "react";
import { CheckCircle2, Wrench, Landmark, Users, TrendingUp } from "lucide-react";
import { markHarborSeen } from "./actions";

// Shared with PortalView's persistent referral sidebar card, which
// renders regardless of Harbor stage — DEFAULTS.referralNote and
// ResourceCard are exported for that reuse.
export const DEFAULTS = {
  trustedContractors: "Ask your Guide for a trusted recommendation anytime — plumbers, electricians, handymen, and more.",
  maintenanceNote: "A few things worth checking each season: HVAC filters, gutters before and after fall, smoke detector batteries, and exterior caulking.",
  propertyTaxNote: "Property tax bills and assessment info are usually available through your county assessor's website. Reach out if you'd like help finding the right link.",
  referralNote: "Know someone starting their own home buying or selling journey? Send them your Guide's way — a referral is one of the best compliments you can give.",
};

// entranceDelay is only meaningful the first time (justArrived) — every
// element fades in staggered, one after another, instead of all at once.
function Beat({ justArrived, entranceDelay, className = "", style = {}, children }) {
  return (
    <div
      className={justArrived ? `lh-harbor-enter ${className}` : className}
      style={justArrived ? { ...style, animationDelay: `${entranceDelay}ms` } : style}
    >
      {children}
    </div>
  );
}

// `icon` takes an already-rendered element (e.g. <Share2 .../>), not a
// component reference — this card is also used directly from the
// Server Component PortalView.js, and passing a raw component type as a
// prop across that server/client boundary isn't allowed by React, only
// a rendered element is.
export function ResourceCard({ icon, title, imageUrl, children }) {
  return (
    <div
      style={{
        background: "var(--lh-fog)",
        border: "1px solid var(--lh-line)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        gap: 11,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1, display: "flex" }}>{icon}</span>
      <div>
        <div className="lh-display" style={{ fontSize: 14, fontWeight: 600, color: "var(--lh-navy)", marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--lh-navy-soft)", whiteSpace: "pre-line" }}>
          {children}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{
              display: "block",
              maxWidth: "100%",
              marginTop: 10,
              borderRadius: 8,
              border: "1px solid var(--lh-line)",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function HarborSection({ journeyId, guideName, justArrived, resources }) {
  useEffect(() => {
    if (justArrived) {
      markHarborSeen(journeyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trustedContractors = resources?.trustedContractors || DEFAULTS.trustedContractors;
  const maintenanceNote = resources?.maintenanceNote || DEFAULTS.maintenanceNote;
  const propertyTaxNote = resources?.propertyTaxNote || DEFAULTS.propertyTaxNote;
  const homeValueNote = resources?.homeValueNote || null;

  return (
    <div style={{ margin: "6px 0 26px" }}>
      <Beat
        justArrived={justArrived}
        entranceDelay={0}
        style={{ display: "inline-flex", marginBottom: 14 }}
      >
        <span
          className={justArrived ? "lh-harbor-pulse" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--lh-teal-soft)",
            border: "1px solid #BFE0DC",
            borderRadius: 20,
            padding: "4px 11px",
          }}
        >
          <CheckCircle2 size={14} color="var(--lh-teal)" strokeWidth={2} />
          <span className="lh-mono" style={{ fontSize: 11, color: "var(--lh-teal)", fontWeight: 600, letterSpacing: 0.2 }}>
            CLOSING DAY · COMPLETE
          </span>
        </span>
      </Beat>

      <Beat justArrived={justArrived} entranceDelay={350}>
        <section
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 16,
            padding: "26px 28px",
            marginBottom: 18,
          }}
        >
          <h2 className="lh-display" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px", color: "var(--lh-navy)" }}>
            Welcome to The Harbor
          </h2>
          <p
            className="lh-display"
            style={{ fontSize: 17, fontStyle: "italic", color: "var(--lh-teal)", margin: "0 0 16px" }}
          >
            You made it home.
          </p>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--lh-navy-soft)", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0 }}>
              Your Journey may be complete, but our relationship doesn&apos;t end at the closing table.
            </p>
            <p style={{ margin: 0 }}>
              The Harbor is your permanent home inside Lighthouse. Your completed Journey, important
              documents, and milestones will remain here whenever you need them.
            </p>
            <p style={{ margin: 0 }}>
              You&apos;ll also find resources to help you long after closing — from seasonal home
              maintenance and trusted local professionals to property tax information and tools to help
              you keep track of your home over time.
            </p>
            <p style={{ margin: 0 }}>And, of course, I&apos;m still here.</p>
            <p style={{ margin: 0 }}>
              Whether you have a question about your home next month, need a contractor three years from
              now, or simply want some real estate advice, you can always reach out.
            </p>
            <p style={{ margin: 0 }}>Welcome home. I&apos;m glad I got to help you get here.</p>
          </div>
          <p className="lh-display" style={{ fontSize: 14, fontStyle: "italic", color: "var(--lh-navy)", margin: "16px 0 0" }}>
            — {guideName}
          </p>
        </section>
      </Beat>

      <Beat justArrived={justArrived} entranceDelay={700}>
        <p style={{ fontSize: 12.5, color: "var(--lh-slate)", margin: "0 0 14px" }}>
          Your original Journey, dates, and documents are still right below — nothing goes away.
        </p>
      </Beat>

      <Beat justArrived={justArrived} entranceDelay={950}>
        <div style={{ marginBottom: 8 }}>
          <h3 className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 12px", color: "var(--lh-navy)" }}>
            Homeowner Resources
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ResourceCard
              icon={<Wrench size={17} color="var(--lh-teal)" strokeWidth={1.75} />}
              title="Seasonal maintenance"
              imageUrl={resources?.maintenanceImageUrl}
            >
              {maintenanceNote}
            </ResourceCard>
            <ResourceCard
              icon={<Users size={17} color="var(--lh-teal)" strokeWidth={1.75} />}
              title="Trusted contractors"
              imageUrl={resources?.trustedContractorsImageUrl}
            >
              {trustedContractors}
            </ResourceCard>
            <ResourceCard
              icon={<Landmark size={17} color="var(--lh-teal)" strokeWidth={1.75} />}
              title="Property tax information"
              imageUrl={resources?.propertyTaxImageUrl}
            >
              {propertyTaxNote}
            </ResourceCard>
            {homeValueNote && (
              <ResourceCard
                icon={<TrendingUp size={17} color="var(--lh-teal)" strokeWidth={1.75} />}
                title="Your home's value"
                imageUrl={resources?.homeValueImageUrl}
              >
                {homeValueNote}
              </ResourceCard>
            )}
          </div>
        </div>
      </Beat>
    </div>
  );
}
