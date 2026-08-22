"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { setAgentAccess } from "./actions";

function AgentRow({ agent, isSelf, onChanged }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleToggle = async (revoke) => {
    setUpdating(true);
    setError("");
    try {
      await setAgentAccess(agent.id, revoke);
      setConfirming(false);
      onChanged();
    } catch (err) {
      setError(err.message || "Couldn't update that agent's access.");
    }
    setUpdating(false);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        rowGap: 8,
        padding: "12px 4px",
        borderBottom: "1px solid var(--lh-line)",
      }}
    >
      <UserCircle2 size={26} color="var(--lh-slate-light)" strokeWidth={1.5} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--lh-navy)" }}>
          {agent.full_name || "Unnamed agent"}
          {isSelf && <span style={{ fontWeight: 400, color: "var(--lh-slate-light)" }}> (you)</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--lh-slate)" }}>{agent.email || "No email on file"}</div>
        {error && <div style={{ fontSize: 11.5, color: "#B4472A", marginTop: 3 }}>{error}</div>}
      </div>

      <span
        className="lh-mono"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: agent.revoked ? "var(--lh-red)" : "var(--lh-teal)",
          whiteSpace: "nowrap",
        }}
      >
        {agent.revoked ? "REVOKED" : "ACTIVE"}
      </span>

      {isSelf ? (
        <span style={{ fontSize: 12, color: "var(--lh-slate-light)", width: 118, textAlign: "right" }}>—</span>
      ) : !confirming ? (
        <button
          onClick={() => (agent.revoked ? handleToggle(false) : setConfirming(true))}
          disabled={updating}
          className="lh-focus"
          style={{
            background: "none",
            border: `1px solid ${agent.revoked ? "var(--lh-teal)" : "var(--lh-red)"}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12.5,
            color: agent.revoked ? "var(--lh-teal)" : "var(--lh-red)",
            cursor: updating ? "default" : "pointer",
            opacity: updating ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {updating ? "Working..." : agent.revoked ? "Restore access" : "Revoke access"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => handleToggle(true)}
            disabled={updating}
            className="lh-focus"
            style={{
              background: "var(--lh-red)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: updating ? "default" : "pointer",
              opacity: updating ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={updating}
            className="lh-focus"
            style={{
              background: "none",
              border: "1px solid var(--lh-line)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12.5,
              color: "var(--lh-slate)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeamList({ agents, currentUserId }) {
  const router = useRouter();

  return (
    <div>
      {agents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          isSelf={agent.id === currentUserId}
          onChanged={() => router.refresh()}
        />
      ))}
      {agents.length === 0 && (
        <div style={{ fontSize: 14, color: "var(--lh-slate)" }}>No agents found.</div>
      )}
    </div>
  );
}
