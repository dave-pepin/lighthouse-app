export const metadata = {
  title: "Privacy Policy — Lighthouse",
};

const sectionStyle = { marginBottom: 26 };
const headingStyle = { fontSize: 17, fontWeight: 600, margin: "0 0 8px" };
const pStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px" };
const listStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px", paddingLeft: 22 };

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lh-fog)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 80px" }}>
        <h1 className="lh-display" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", marginBottom: 34 }}>
          Last updated: July 20, 2026
        </p>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Overview</h2>
          <p style={pStyle}>
            Lighthouse is a client-communication tool used by real estate agents to guide
            buyers and sellers through their transaction — sharing progress updates,
            milestones, and documents. This policy explains what information we collect
            about agents and their clients, how it is used, and the choices available to you.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Information We Collect</h2>
          <p style={pStyle}>Depending on your role, we collect:</p>
          <ul style={listStyle}>
            <li>Contact information: name, email address, and phone number.</li>
            <li>
              Transaction details entered by your agent: role (buying or selling), stage of
              the transaction, milestones, next actions, and related notes.
            </li>
            <li>Documents you or your agent upload related to the transaction.</li>
            <li>Weekly update messages sent to you and delivery status of those messages.</li>
            <li>Login credentials, for clients who are given portal access.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>How We Use Your Information</h2>
          <p style={pStyle}>We use this information solely to:</p>
          <ul style={listStyle}>
            <li>Send weekly transaction updates and milestone notifications by email and/or text message.</li>
            <li>Provide the client portal, so you can check progress and access shared documents.</li>
            <li>Let your agent track and manage your transaction on their end.</li>
          </ul>
          <p style={pStyle}>We do not sell your information, and we do not use it for advertising.</p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>SMS Messaging &amp; Consent</h2>
          <p style={pStyle}>
            If you receive text message updates, it is because your real estate agent
            obtained your consent directly — typically during an in-person or phone
            consultation when your transaction began — and entered your phone number into
            Lighthouse on your behalf. These messages are transactional: they relate only to
            your active home purchase or sale (e.g., milestone updates, document requests).
            We do not send promotional or marketing text messages.
          </p>
          <p style={pStyle}>
            Message frequency varies based on your transaction&apos;s activity. Message and data
            rates may apply. You can opt out at any time by replying <strong>STOP</strong> to
            any message, or by telling your agent directly. Reply <strong>HELP</strong> for
            assistance.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Email Communications</h2>
          <p style={pStyle}>
            Email updates and portal invitations are sent using Resend. You can ask your
            agent to stop email updates at any time.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Third-Party Services</h2>
          <p style={pStyle}>We rely on the following service providers to operate Lighthouse:</p>
          <ul style={listStyle}>
            <li><strong>Supabase</strong> — database, authentication, and document storage.</li>
            <li><strong>Twilio</strong> — delivery of SMS text messages.</li>
            <li><strong>Resend</strong> — delivery of email messages.</li>
          </ul>
          <p style={pStyle}>
            These providers process data solely to deliver the service described above and
            are not permitted to use it for their own purposes.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Data Retention &amp; Security</h2>
          <p style={pStyle}>
            We retain transaction data for as long as your agent&apos;s account remains active,
            or as needed to comply with legal obligations. Access to client data is
            restricted to your agent and their brokerage.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Your Rights</h2>
          <p style={pStyle}>
            You may request a copy of the information we hold about you, ask us to correct
            it, or ask us to delete it, by contacting your agent or using the details below.
            You may also opt out of SMS or email updates at any time.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this policy from time to time. Material changes will be reflected
            by updating the "Last updated" date above.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Contact Us</h2>
          <p style={pStyle}>
            Questions about this policy or your data can be directed to your agent, or to{" "}
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
