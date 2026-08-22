"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone } from "lucide-react";
import { updateAgentContactInfo, provisionMyPhoneNumber, releaseMyPhoneNumber } from "./actions";

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--lh-navy)",
  marginBottom: 4,
  display: "block",
};

const helpStyle = {
  fontSize: 12,
  color: "var(--lh-slate)",
  marginBottom: 8,
  lineHeight: 1.45,
};

const inputStyle = {
  width: "100%",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

const fieldGroupStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

const primaryButtonStyle = {
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
};

const secondaryButtonStyle = {
  background: "none",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13.5,
  color: "var(--lh-slate)",
  cursor: "pointer",
};

const dangerButtonStyle = {
  background: "none",
  border: "1px solid var(--lh-red)",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13.5,
  color: "var(--lh-red)",
  cursor: "pointer",
};

function PhoneNumberSection({ smsPhoneNumber }) {
  const router = useRouter();
  const [areaCode, setAreaCode] = useState("");
  const [confirmingProvision, setConfirmingProvision] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState("");

  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  const handleProvision = async () => {
    setProvisioning(true);
    setProvisionError("");
    try {
      await provisionMyPhoneNumber(areaCode);
      setConfirmingProvision(false);
      router.refresh();
    } catch (err) {
      setProvisionError(err.message || "Couldn't get a number.");
    }
    setProvisioning(false);
  };

  const handleRelease = async () => {
    setReleasing(true);
    setReleaseError("");
    try {
      await releaseMyPhoneNumber();
      setConfirmingRelease(false);
      router.refresh();
    } catch (err) {
      setReleaseError(err.message || "Couldn't release that number.");
    }
    setReleasing(false);
  };

  if (smsPhoneNumber) {
    return (
      <>
        <p style={helpStyle}>
          Your updates and invites text clients from <strong>{smsPhoneNumber}</strong>. Before this
          was set, they went out from the shared Lighthouse number instead.
        </p>
        {!confirmingRelease ? (
          <button onClick={() => setConfirmingRelease(true)} style={dangerButtonStyle}>
            Release this number
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12.5, color: "var(--lh-red)", margin: 0 }}>
              This gives the number back to Twilio for good — you'd get a different number if you
              provision another one later. Your texts fall back to the shared Lighthouse number in
              the meantime.
            </p>
            {releaseError && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{releaseError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleRelease} disabled={releasing} style={dangerButtonStyle}>
                {releasing ? "Releasing..." : "Yes, release it"}
              </button>
              <button
                onClick={() => setConfirmingRelease(false)}
                disabled={releasing}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <p style={helpStyle}>
        Get a real phone number dedicated to you — texts to clients will come from it instead of
        the shared Lighthouse number. It works immediately, no approval wait. This adds about
        $1.15/mo in Twilio charges for as long as you keep it.
      </p>
      {!confirmingProvision ? (
        <button onClick={() => setConfirmingProvision(true)} style={primaryButtonStyle}>
          <Phone size={13} /> Get a texting number
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12.5, color: "var(--lh-navy-soft)" }}>
            Preferred area code (optional)
          </label>
          <input
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            className="lh-focus"
            style={{ ...inputStyle, maxWidth: 120 }}
            placeholder="e.g. 512"
          />
          {provisionError && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{provisionError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleProvision} disabled={provisioning} style={primaryButtonStyle}>
              {provisioning ? "Getting your number..." : "Confirm & get my number"}
            </button>
            <button
              onClick={() => setConfirmingProvision(false)}
              disabled={provisioning}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AgentContactForm({ smsPhoneNumber, replyToEmail }) {
  const [email, setEmail] = useState(replyToEmail || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSaveEmail = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateAgentContactInfo({ replyToEmail: email });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save those changes.");
    }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Your dedicated texting number</label>
        <PhoneNumberSection smsPhoneNumber={smsPhoneNumber} />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Reply-to email</label>
        <p style={helpStyle}>
          Weekly updates and invites still send from Lighthouse's address (with your name shown as
          the sender), but any reply a client sends will land here instead of the platform's inbox.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="lh-focus"
          style={inputStyle}
          placeholder="you@youragency.com"
        />
        {error && <div style={{ fontSize: 13, color: "var(--lh-red)", marginTop: 8 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button onClick={handleSaveEmail} disabled={saving} className="lh-focus" style={primaryButtonStyle}>
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--lh-teal)", fontSize: 13, fontWeight: 600 }}
            >
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
