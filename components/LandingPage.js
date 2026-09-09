import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  Lock,
  Smartphone,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import CourseLine from "./CourseLine";
import StageTag from "./StageTag";
import LandingDemo from "./LandingDemo";

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "var(--lh-navy)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 22px",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "none",
  color: "var(--lh-navy)",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "11px 20px",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const sectionHeadingStyle = {
  fontSize: 30,
  fontWeight: 600,
  margin: "0 0 12px",
  textAlign: "center",
  textWrap: "balance",
};

const sectionSubStyle = {
  fontSize: 15.5,
  color: "var(--lh-slate)",
  textAlign: "center",
  maxWidth: 620,
  margin: "0 auto 40px",
  lineHeight: 1.6,
};

const cardStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 14,
  padding: "22px 24px",
};

function FeatureCard({ icon, title, children }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "var(--lh-teal-soft)",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div className="lh-display" style={{ fontSize: 16.5, fontWeight: 600, marginBottom: 5 }}>
        {title}
      </div>
      <p style={{ fontSize: 13.5, color: "var(--lh-slate)", lineHeight: 1.55, margin: 0 }}>{children}</p>
    </div>
  );
}

function FaqItem({ question, children, defaultOpen = false }) {
  return (
    <div style={{ borderBottom: "1px solid var(--lh-line)" }}>
      <input type="checkbox" className="lh-faq-checkbox" id={`faq-${question}`} defaultChecked={defaultOpen} />
      <label className="lh-faq-question" htmlFor={`faq-${question}`}>
        <span className="lh-display" style={{ fontSize: 15.5, fontWeight: 600 }}>
          {question}
        </span>
        <ChevronDown className="lh-faq-chevron" size={17} />
      </label>
      <div className="lh-faq-answer">{children}</div>
    </div>
  );
}

function PricingCard({ plan, forWhom, price, features, cta, ctaHref, featured, badge }) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: featured ? "2px solid var(--lh-navy)" : cardStyle.border,
        position: "relative",
      }}
    >
      {badge && (
        <span
          className="lh-mono"
          style={{
            position: "absolute",
            top: -12,
            left: 24,
            background: "var(--lh-navy)",
            color: "white",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.3,
            padding: "3px 10px",
            borderRadius: 20,
          }}
        >
          {badge}
        </span>
      )}
      <div>
        <div className="lh-display" style={{ fontSize: 19, fontWeight: 600 }}>
          {plan}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--lh-slate)", marginTop: 2 }}>{forWhom}</div>
      </div>
      <div className="lh-display" style={{ fontSize: 30, fontWeight: 600 }}>
        {price}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--lh-navy-soft)" }}>
            <CheckCircle2 size={15} color="var(--lh-teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="lh-focus"
        style={{
          ...(featured ? primaryButtonStyle : secondaryButtonStyle),
          justifyContent: "center",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: "var(--lh-fog)", minHeight: "100vh" }}>
      <nav className="lh-landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Anchor size={20} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 20, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link href="/login" className="lh-focus" style={{ fontSize: 14, color: "var(--lh-slate)", textDecoration: "none" }}>
            Sign in
          </Link>
          <Link href="/signup" className="lh-focus" style={{ ...primaryButtonStyle, padding: "9px 16px", fontSize: 14 }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="lh-landing-section" style={{ paddingBottom: 40 }}>
        <div className="lh-landing-hero">
          <div>
            <h1
              className="lh-display"
              style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.15, margin: "0 0 18px", textWrap: "balance" }}
            >
              Every client deserves a clear view of their transaction.
            </h1>
            <p style={{ fontSize: 16.5, color: "var(--lh-slate)", lineHeight: 1.65, margin: "0 0 28px", maxWidth: 480 }}>
              Lighthouse keeps buyers and sellers informed automatically — from accepted offer to
              closing day, and every relationship after. Less manual updating. Fewer anxious phone
              calls. More referrals.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="lh-focus" style={primaryButtonStyle}>
                Get Started <ArrowRight size={16} />
              </Link>
              <Link href="#how-it-works" className="lh-focus" style={secondaryButtonStyle}>
                See How It Works
              </Link>
            </div>
          </div>

          {/* A real preview built from the actual product's own components
              (CourseLine, StageTag) fed sample data — not a screenshot, so
              it's honest about being illustrative, but pixel-accurate to
              what a client's Journey actually looks like. */}
          <div style={{ ...cardStyle, padding: "22px 24px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: "1 1 100px", minWidth: 0 }}>
                <div className="lh-display" style={{ fontSize: 17, fontWeight: 600 }}>
                  Sarah Chen
                </div>
                <div style={{ fontSize: 12.5, color: "var(--lh-slate)", marginTop: 1 }}>Buying</div>
              </div>
              <StageTag stage="Inspection" statusLevel="on_course" currentLabel="Appraisal" />
            </div>
            <CourseLine stageIndex={3} statusLevel="on_course" role="Buying" compact />
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--lh-line)",
                fontSize: 12.5,
                color: "var(--lh-slate)",
              }}
            >
              Next: Appraisal completed
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="lh-landing-section" style={{ paddingTop: 0, paddingBottom: 40 }}>
        <div className="lh-landing-trust-strip">
          <span style={{ fontSize: 14, color: "var(--lh-navy-soft)", display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={16} color="var(--lh-teal)" /> Bank-level data security
          </span>
          <span style={{ fontSize: 14, color: "var(--lh-navy-soft)", display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={16} color="var(--lh-teal)" /> Automated SMS &amp; email updates clients actually read
          </span>
          <span style={{ fontSize: 14, color: "var(--lh-navy-soft)", display: "flex", alignItems: "center", gap: 8 }}>
            <Home size={16} color="var(--lh-teal)" /> Built specifically for real estate transactions, not a generic CRM
          </span>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="lh-landing-section">
        <h2 className="lh-display" style={sectionHeadingStyle}>
          From accepted offer to closing day, automatically.
        </h2>
        <p style={sectionSubStyle}>
          A real estate transaction management system built around how deals actually move — not a
          generic project board.
        </p>
        <div className="lh-landing-steps">
          {[
            {
              n: "1",
              title: "Create a Journey",
              body: "Start a Buying or Selling journey for your client in seconds. Lighthouse builds the milestone checklist automatically based on their situation.",
            },
            {
              n: "2",
              title: "Check off milestones as you go",
              body: "Your client's status updates automatically. No manual emails needed.",
            },
            {
              n: "3",
              title: "Review it, then send",
              body: "Draft a quick note — Lighthouse can even help write it in your voice. Nothing reaches your client until you approve it, then it goes out by email and text in one click.",
            },
          ].map((step) => (
            <div key={step.n} style={{ textAlign: "center" }}>
              <div
                className="lh-display"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--lh-navy)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontWeight: 600,
                  margin: "0 auto 16px",
                }}
              >
                {step.n}
              </div>
              <div className="lh-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                {step.title}
              </div>
              <p style={{ fontSize: 14, color: "var(--lh-slate)", lineHeight: 1.6, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>

        {/* A real, animated walkthrough of the 3 steps above — built from
            the same real UI components the product uses, not a screen
            recording. See components/LandingDemo.js. */}
        <div style={{ marginTop: 48 }}>
          <LandingDemo />
        </div>
      </div>

      {/* Features — for agents */}
      <div className="lh-landing-section" style={{ paddingBottom: 20 }}>
        <h2 className="lh-display" style={{ ...sectionHeadingStyle, marginBottom: 8 }}>
          For agents
        </h2>
        <p style={sectionSubStyle}>Everything you need to run every active client relationship from one place.</p>
        <div className="lh-landing-features-grid">
          <FeatureCard icon={<LayoutDashboard size={17} color="var(--lh-teal)" />} title="Bridge Dashboard">
            See every active client at a glance, reorder by priority, and flag status with a simple
            on-course / caution / danger indicator.
          </FeatureCard>
          <FeatureCard icon={<ListChecks size={17} color="var(--lh-teal)" />} title="Auto-generated Milestones">
            Every journey gets the right checklist automatically — buying vs. selling, cash vs.
            financed.
          </FeatureCard>
          <FeatureCard icon={<Sparkles size={17} color="var(--lh-teal)" />} title="Weekly Update Assistant">
            Draft client updates faster with AI-assisted suggestions that match your own tone.
          </FeatureCard>
          <FeatureCard icon={<FileText size={17} color="var(--lh-teal)" />} title="Document Sharing">
            Attach and share files tied to any milestone or transaction.
          </FeatureCard>
          <FeatureCard icon={<Users size={17} color="var(--lh-teal)" />} title="Team Management">
            Manage your whole team's access from one place.
          </FeatureCard>
        </div>
      </div>

      {/* Features — for clients */}
      <div className="lh-landing-section" style={{ paddingTop: 20 }}>
        <h2 className="lh-display" style={{ ...sectionHeadingStyle, marginBottom: 8 }}>
          For clients
        </h2>
        <p style={sectionSubStyle}>A calm, clear view of the transaction — no app to download, no login they'll forget.</p>
        <div className="lh-landing-features-grid">
          <FeatureCard icon={<Eye size={17} color="var(--lh-teal)" />} title="Live Progress View">
            Clients log in anytime to see exactly where their transaction stands.
          </FeatureCard>
          <FeatureCard icon={<Video size={17} color="var(--lh-teal)" />} title="Milestone Videos">
            Short explainer videos help clients understand each stage — they only play on click,
            never auto-play.
          </FeatureCard>
          <FeatureCard icon={<Anchor size={17} color="var(--lh-teal)" />} title="The Harbor">
            After closing, clients don't just disappear — they land in an ongoing home-ownership hub
            with reminders and your continued presence. Populate it yourself with your own
            branded guides, videos, and links — trusted contractors, seasonal maintenance, property
            tax info, home value tools, whatever you want your name attached to.
          </FeatureCard>
        </div>
      </div>

      {/* Security */}
      <div className="lh-landing-section">
        <h2 className="lh-display" style={{ ...sectionHeadingStyle, marginBottom: 8 }}>
          Protected data. And you're always in control.
        </h2>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                icon: CheckCircle2,
                text: "Lighthouse never contacts a client on its own — you create and approve every message before anything sends. No surprises, no auto-pilot.",
              },
              {
                icon: Lock,
                text: "All data is encrypted and access-controlled — agents only ever see their own agency's clients.",
              },
              {
                icon: Lock,
                text: "Payments are processed securely through Stripe; Lighthouse never stores card details.",
              },
              {
                icon: Lock,
                text: "Client portal access is scoped per-transaction — no client can see another client's information.",
              },
            ].map(({ icon: Icon, text }) => (
              <li key={text} style={{ display: "flex", gap: 10, fontSize: 15, color: "var(--lh-navy-soft)", lineHeight: 1.6 }}>
                <Icon size={17} color="var(--lh-teal)" style={{ flexShrink: 0, marginTop: 3 }} />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pricing */}
      <div className="lh-landing-section">
        <h2 className="lh-display" style={{ ...sectionHeadingStyle, marginBottom: 8 }}>
          One simple price. Solo or with your whole team.
        </h2>
        <p style={sectionSubStyle}>
          Every agent has their own $12.99/mo account. Team leads can invite teammates in at no
          extra cost, so the whole team shares the same client Journeys.
        </p>
        <div style={{ maxWidth: 380, margin: "0 auto" }}>
          <PricingCard
            plan="Lighthouse"
            forWhom="Every agent, solo or leading a team"
            price="$12.99/mo"
            features={[
              "Full feature set — no limits by plan",
              "Invite teammates into your team at no extra cost",
              "Email & SMS updates",
              "Customizable overdue-milestone reminders",
            ]}
            cta="Get Started"
            ctaHref="/signup"
            featured
          />
        </div>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", textAlign: "center", marginTop: 24 }}>
          Running a larger brokerage?{" "}
          <a href="mailto:dave@davepepin.com" className="lh-focus" style={{ color: "var(--lh-navy)", fontWeight: 600 }}>
            Call for volume pricing and dedicated support.
          </a>
        </p>
      </div>

      {/* FAQ */}
      <div className="lh-landing-section" style={{ maxWidth: 760 }}>
        <h2 className="lh-display" style={{ ...sectionHeadingStyle, marginBottom: 30 }}>
          Frequently asked questions
        </h2>
        <div>
          <FaqItem question="Does Lighthouse work for both buyers and sellers?" defaultOpen>
            Yes — each has its own tailored milestone pipeline.
          </FaqItem>
          <FaqItem question="Will my clients need to download an app?">
            No — the client portal works right in their browser, no install needed.
          </FaqItem>
          <FaqItem question="Can I customize the update messages?">
            Yes, and Lighthouse learns your tone over time to help draft them faster.
          </FaqItem>
          <FaqItem question="Is my clients' data secure?">
            Yes — see the Security section above.
          </FaqItem>
          <FaqItem question="What happens after closing?">
            Clients move into the Harbor — an ongoing relationship space, not a dead end.
          </FaqItem>
        </div>
      </div>

      <footer className="lh-landing-footer" style={{ borderTop: "1px solid var(--lh-line)" }}>
        <span style={{ fontSize: 13, color: "var(--lh-slate)" }}>
          © {new Date().getFullYear()} Lighthouse App, LLC
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy" className="lh-focus" style={{ fontSize: 13, color: "var(--lh-slate)", textDecoration: "none" }}>
            Privacy
          </Link>
          <Link href="/terms" className="lh-focus" style={{ fontSize: 13, color: "var(--lh-slate)", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/login" className="lh-focus" style={{ fontSize: 13, color: "var(--lh-slate)", textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
