import { ChevronDown } from "lucide-react";

// A CSS-only collapsible card (no JS) — the checkbox + label + sibling
// selector pattern. On desktop this renders exactly like a plain
// ResourceCard always expanded (the collapse rules only exist inside the
// mobile media query in globals.css, so desktop ignores checkbox state
// entirely). On mobile it starts collapsed behind a tappable summary
// line, since a full-height card was pushing everything else down.
export default function ReferralCard({ icon, title, children }) {
  return (
    <div className="lh-referral-card">
      <input type="checkbox" id="referral-expand" className="lh-referral-checkbox" />
      <label htmlFor="referral-expand" className="lh-referral-label">
        <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
        <span className="lh-display lh-referral-title">{title}</span>
        <ChevronDown size={15} className="lh-referral-chevron" />
      </label>
      <div className="lh-referral-content">{children}</div>
    </div>
  );
}
