export const metadata = {
  title: "SMS Consent & Opt-In Process — Lighthouse",
};

const sectionStyle = { marginBottom: 26 };
const headingStyle = { fontSize: 17, fontWeight: 600, margin: "0 0 8px" };
const pStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px" };
const listStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px", paddingLeft: 22 };
const sampleMessageStyle = {
  fontSize: 13.5,
  lineHeight: 1.6,
  color: "var(--lh-navy-soft)",
  background: "var(--lh-fog)",
  border: "1px solid var(--lh-line)",
  borderRadius: 10,
  padding: "14px 16px",
  margin: "0 0 10px",
  fontFamily: "inherit",
};

export default function SmsConsentPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lh-fog)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 80px" }}>
        <h1 className="lh-display" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px" }}>
          SMS Consent &amp; Opt-In Process
        </h1>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", marginBottom: 34 }}>
          Last updated: September 23, 2026
        </p>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Overview</h2>
          <p style={pStyle}>
            Lighthouse is used by real estate agents to send text message updates to their
            own clients about an active home purchase or sale — appraisal status, document
            requests, closing dates, and similar milestones. This page explains exactly how
            a client consents to receive those messages, since that consent is given
            verbally during a consultation rather than through a website form.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Step 1: Verbal Consent</h2>
          <p style={pStyle}>
            During an in-person or phone consultation — typically when a client first
            engages the agent to buy or sell a home — the agent verbally explains that
            Lighthouse will send text updates about the transaction: status updates,
            milestones, and action items. The agent tells the client that message
            frequency varies and that message and data rates may apply, and confirms the
            client&apos;s mobile phone number. The agent only enters that number into
            Lighthouse after the client affirmatively agrees to receive texts.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Step 2: SMS Opt-In Confirmation</h2>
          <p style={pStyle}>
            Once the agent enters the number, the client receives this text as the very
            first message, asking them to confirm in writing:
          </p>
          <p style={sampleMessageStyle}>
            Hi Sarah, this is Dave. Welcome to LIGHTHOUSE, your personal home buying
            journey. I&apos;ll use Lighthouse to keep you informed with weekly updates,
            milestones, and any action items throughout your transaction. Reply{" "}
            <strong>YES</strong> to opt in to receive text updates about your journey.
            Reply <strong>STOP</strong> at any time to opt out.
          </p>
          <p style={pStyle}>
            No further messages are sent unless the client replies <strong>YES</strong>.
            This is a genuine double opt-in: verbal agreement first, then a written,
            client-initiated confirmation over SMS itself.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Ongoing Messages</h2>
          <p style={pStyle}>
            After opting in, the client receives transactional updates only — never
            promotional or marketing content. A typical update looks like this:
          </p>
          <p style={sampleMessageStyle}>
            Good morning Jon and Sarah! Your journey to 10224 130th St. is still on
            course. There are no action items for you this week. Your appraisal is
            expected by July 22 and we&apos;re still scheduled for your August 5 closing.
            I&apos;ve posted your full weekly update in Lighthouse if you&apos;d like to
            follow along. Have a great week! – Dave. Reply STOP to unsubscribe, HELP for
            help. Msg &amp; data rates may apply.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Disclosures</h2>
          <ul style={listStyle}>
            <li>Message frequency varies based on the transaction&apos;s activity.</li>
            <li>Message and data rates may apply.</li>
            <li>
              Reply <strong>STOP</strong> at any time to opt out, or <strong>HELP</strong>{" "}
              for assistance — honored immediately.
            </li>
            <li>
              We do not share, sell, or provide a client&apos;s mobile phone number or
              messaging consent data to third parties or affiliates for marketing or
              promotional purposes.
            </li>
            <li>
              Full details: our{" "}
              <a href="/privacy" style={{ color: "var(--lh-teal)" }}>Privacy Policy</a>{" "}
              and{" "}
              <a href="/terms" style={{ color: "var(--lh-teal)" }}>Terms &amp; Conditions</a>.
            </li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Contact Us</h2>
          <p style={pStyle}>
            Questions about this process can be directed to{" "}
            <a href="mailto:dave@davepepin.com" style={{ color: "var(--lh-teal)" }}>
              dave@davepepin.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
