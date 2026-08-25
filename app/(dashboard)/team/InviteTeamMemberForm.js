"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check } from "lucide-react";
import { inviteTeamMember } from "./actions";

const inputStyle = {
  flex: "1 1 180px",
  minWidth: 0,
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

export default function InviteTeamMemberForm() {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      await inviteTeamMember(name, email);
      setMessage(`Invite sent to ${email} — they'll get an email to set up their account.`);
      setName("");
      setEmail("");
      setInviting(false);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't send that invite.");
    }
    setSending(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {!inviting ? (
        <button
          onClick={() => {
            setInviting(true);
            setMessage("");
          }}
          className="lh-focus"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <UserPlus size={14} /> Invite team member
        </button>
      ) : (
        <div
          style={{
            background: "var(--lh-paper)",
            border: "1px solid var(--lh-line)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their name"
              className="lh-focus"
              style={inputStyle}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Their email"
              className="lh-focus"
              style={inputStyle}
            />
          </div>
          {error && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSend}
              disabled={sending || !name.trim() || !email.trim()}
              className="lh-focus"
              style={{
                background: "var(--lh-navy)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                opacity: sending || !name.trim() || !email.trim() ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send invite"}
            </button>
            <button
              onClick={() => {
                setInviting(false);
                setError("");
              }}
              disabled={sending}
              className="lh-focus"
              style={{ background: "none", border: "1px solid var(--lh-line)", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "var(--lh-slate)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--lh-teal)", fontSize: 13, marginTop: 10 }}>
          <Check size={14} /> {message}
        </div>
      )}
    </div>
  );
}
