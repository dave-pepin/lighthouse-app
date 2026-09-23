import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Plain server-rendered Previous/Next + "Page X of Y" — no client-side
// state, just links to ?page=N, so it works from any Server Component
// list page (Bridge, Harbor) without needing "use client".
export default function Pagination({ basePath, currentPage, pageSize, totalCount }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const linkStyle = (enabled) => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid var(--lh-line)",
    fontSize: 13,
    fontWeight: 600,
    color: enabled ? "var(--lh-navy-soft)" : "var(--lh-slate-light)",
    textDecoration: "none",
    pointerEvents: enabled ? "auto" : "none",
    opacity: enabled ? 1 : 0.5,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginTop: 26,
      }}
    >
      <Link
        href={hasPrev ? `${basePath}?page=${currentPage - 1}` : "#"}
        aria-disabled={!hasPrev}
        className="lh-focus"
        style={linkStyle(hasPrev)}
      >
        <ChevronLeft size={14} /> Previous
      </Link>
      <span style={{ fontSize: 13, color: "var(--lh-slate)" }}>
        Page {currentPage} of {totalPages}
      </span>
      <Link
        href={hasNext ? `${basePath}?page=${currentPage + 1}` : "#"}
        aria-disabled={!hasNext}
        className="lh-focus"
        style={linkStyle(hasNext)}
      >
        Next <ChevronRight size={14} />
      </Link>
    </div>
  );
}
