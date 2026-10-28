"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

// Shared body for the app's error.js boundaries — shown in place of a page
// that failed to render, instead of Next.js's bare crash screen. "Try
// again" re-fetches and re-renders just that page (the refresh matters
// when it was the server render that failed).
export default function ErrorFallback({ error, reset }) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "64px 16px" }}>
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "var(--lh-paper)",
          border: "1px solid var(--lh-line)",
          borderRadius: 14,
          padding: "26px 24px",
          textAlign: "center",
        }}
      >
        <h1 className="lh-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px", color: "var(--lh-navy)" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--lh-slate)", margin: "0 0 18px", lineHeight: 1.5 }}>
          This page didn&apos;t load properly. It&apos;s usually a momentary hiccup — try again, and if it keeps
          happening, reload the page.
        </p>
        <button
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          disabled={retrying}
          className="lh-focus"
          style={{
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {retrying ? "Trying…" : "Try again"}
        </button>
      </div>
    </div>
  );
}
