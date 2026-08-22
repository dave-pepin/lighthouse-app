import Link from "next/link";
import { Anchor, Mail } from "lucide-react";

// Stripe redirects here right after a successful Checkout. The actual
// account isn't created yet at this point — that happens moments later
// when Stripe's webhook reaches the app — so this page just sets
// expectations rather than promising something that may not have
// finished yet.
export default function SignupSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--lh-fog)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "36px 30px",
          width: 380,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <Anchor size={20} color="var(--lh-navy)" strokeWidth={1.75} />
          <span className="lh-display" style={{ fontSize: 21, fontWeight: 600 }}>
            Lighthouse
          </span>
        </div>
        <Mail size={28} color="var(--lh-teal)" strokeWidth={1.75} style={{ marginBottom: 10 }} />
        <h1 className="lh-display" style={{ fontSize: 19, fontWeight: 600, margin: "0 0 8px" }}>
          Payment received
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--lh-slate)", lineHeight: 1.55, margin: "0 0 20px" }}>
          Check your email in the next few minutes for a link to set your password and get
          started. If it doesn&apos;t show up, check your spam folder.
        </p>
        <Link
          href="/login"
          className="lh-focus"
          style={{ fontSize: 12.5, color: "var(--lh-teal)", textDecoration: "underline" }}
        >
          Already set your password? Sign in
        </Link>
      </div>
    </div>
  );
}
