"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// The app-wide spot for a failure from an action that was fired without
// waiting on it (lib/runAction.js's fireAction) — a checkbox, a due date, a
// reorder. Mounted once in the root layout; shows the latest message until
// dismissed or it times out.
export default function ActionErrorNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onError = (e) => setMessage(e.detail);
    window.addEventListener("lh-action-error", onError);
    return () => window.removeEventListener("lh-action-error", onError);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "min(440px, calc(100vw - 32px))",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "var(--lh-paper)",
        border: "1px solid var(--lh-red)",
        borderLeftWidth: 4,
        borderRadius: 10,
        padding: "11px 12px",
        boxShadow: "0 6px 20px rgba(22, 50, 79, 0.14)",
        fontSize: 13,
        color: "var(--lh-navy)",
      }}
    >
      <span style={{ flex: 1 }}>
        <strong style={{ color: "var(--lh-red)" }}>Couldn&apos;t save.</strong> {message}
      </span>
      <button
        onClick={() => setMessage("")}
        aria-label="Dismiss"
        className="lh-focus"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
      >
        <X size={15} color="var(--lh-slate)" />
      </button>
    </div>
  );
}
