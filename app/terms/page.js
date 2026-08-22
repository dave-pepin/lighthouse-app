export const metadata = {
  title: "Terms & Conditions — Lighthouse",
};

const sectionStyle = { marginBottom: 26 };
const headingStyle = { fontSize: 17, fontWeight: 600, margin: "0 0 8px" };
const pStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px" };
const listStyle = { fontSize: 14.5, lineHeight: 1.65, color: "var(--lh-navy-soft)", margin: "0 0 10px", paddingLeft: 22 };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--lh-fog)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 80px" }}>
        <h1 className="lh-display" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px" }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: 13, color: "var(--lh-slate)", marginBottom: 34 }}>
          Last updated: July 20, 2026
        </p>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Acceptance of Terms</h2>
          <p style={pStyle}>
            By using Lighthouse — whether as an agent managing client transactions or a
            client accessing the portal or receiving updates — you agree to these Terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Description of Service</h2>
          <p style={pStyle}>
            Lighthouse helps real estate agents track a client&apos;s home buying or selling
            transaction and share progress with that client through a portal, email, and
            SMS text message updates.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Client Portal Access</h2>
          <p style={pStyle}>
            Clients may be invited by their agent to a portal account to view transaction
            progress and shared documents. You are responsible for keeping your login
            credentials secure.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>SMS &amp; Email Communications</h2>
          <p style={pStyle}>
            If you provide consent to your agent to receive text message updates, you will
            receive transactional messages related to your active transaction only — never
            promotional or marketing messages. Message frequency varies. Message and data
            rates may apply. Reply <strong>STOP</strong> at any time to opt out of text
            messages, or <strong>HELP</strong> for assistance. You may also ask your agent
            directly to stop email or SMS updates at any time. See our{" "}
            <a href="/privacy" style={{ color: "var(--lh-teal)" }}>Privacy Policy</a> for
            more detail on how messaging consent works.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Acceptable Use</h2>
          <p style={pStyle}>You agree not to:</p>
          <ul style={listStyle}>
            <li>Use Lighthouse for any purpose other than managing or following a real estate transaction.</li>
            <li>Upload documents you do not have the right to share.</li>
            <li>Attempt to access another client&apos;s or agent&apos;s data without authorization.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Disclaimers</h2>
          <p style={pStyle}>
            Lighthouse is a communication and tracking tool. It does not provide legal,
            financial, or real estate advice, and does not replace the professional
            judgment of your agent or other transaction professionals.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Limitation of Liability</h2>
          <p style={pStyle}>
            Lighthouse is provided "as is." To the fullest extent permitted by law, we are
            not liable for any delay or failure of a message to be delivered, or for
            decisions made based on information shown in the app.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Changes to These Terms</h2>
          <p style={pStyle}>
            We may update these Terms from time to time. Continued use of Lighthouse after
            a change means you accept the updated Terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 className="lh-display" style={headingStyle}>Contact Us</h2>
          <p style={pStyle}>
            Questions about these Terms can be directed to your agent, or to{" "}
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
