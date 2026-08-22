"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2, UserPlus, Ban } from "lucide-react";
import { createAgencyWithAgent, addAgentToAgency, deleteAgent, deleteAgency } from "./actions";

const cardStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

const primaryButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--lh-navy)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "none",
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  color: "var(--lh-slate)",
  cursor: "pointer",
};

const dangerButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "1px solid var(--lh-red)",
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: 12.5,
  color: "var(--lh-red)",
  cursor: "pointer",
};

function StatusBadge({ subscriptionStatus, stripeCustomerId }) {
  const isManual = !stripeCustomerId;
  const label = isManual ? `Manual (${subscriptionStatus || "active"})` : subscriptionStatus || "unknown";
  const color =
    !isManual && (subscriptionStatus === "active" || subscriptionStatus === "trialing")
      ? "var(--lh-green)"
      : isManual
      ? "var(--lh-slate)"
      : "var(--lh-red)";

  return (
    <span
      className="lh-mono"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "white",
        background: color,
        borderRadius: 20,
        padding: "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function AgentRow({ agent }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAgent(agent.id);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't delete that agent.");
      setConfirming(false);
    }
    setDeleting(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0", borderTop: "1px solid var(--lh-line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: "var(--lh-navy)", fontWeight: 500 }}>
            {agent.full_name || "(no name)"}
            {agent.is_platform_owner && (
              <span className="lh-mono" style={{ fontSize: 10, color: "var(--lh-teal)", marginLeft: 6 }}>
                OWNER
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--lh-slate)" }}>{agent.email}</div>
        </div>
        <span className="lh-mono" style={{ fontSize: 11, color: "var(--lh-slate-light)", flexShrink: 0 }}>
          {agent.journeyCount} {agent.journeyCount === 1 ? "Journey" : "Journeys"}
        </span>
        {agent.banned && (
          <span
            className="lh-mono"
            style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "var(--lh-red)", flexShrink: 0 }}
          >
            <Ban size={11} /> SUSPENDED
          </span>
        )}
        {!agent.is_platform_owner && !confirming && (
          <button onClick={() => setConfirming(true)} title="Delete agent" style={{ ...secondaryButtonStyle, padding: "6px 9px" }}>
            <Trash2 size={13} color="var(--lh-slate-light)" />
          </button>
        )}
      </div>
      {confirming && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 2 }}>
          <p style={{ fontSize: 12, color: "var(--lh-slate)", margin: 0 }}>
            Delete {agent.full_name}'s login? Blocked if they still own any Journeys.
          </p>
          {error && <div style={{ fontSize: 12, color: "var(--lh-red)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleDelete} disabled={deleting} style={dangerButtonStyle}>
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={deleting} style={secondaryButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAgentForm({ agencyId, onDone }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      await addAgentToAgency({ agencyId, fullName, email });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err.message || "Couldn't add that agent.");
    }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="lh-focus"
        style={inputStyle}
        placeholder="Full name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="lh-focus"
        style={inputStyle}
        placeholder="Email"
      />
      {error && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleAdd} disabled={saving} style={primaryButtonStyle}>
          {saving ? "Adding..." : "Send invite"}
        </button>
        <button onClick={onDone} disabled={saving} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AgencyCard({ agency }) {
  const router = useRouter();
  const isOwnAgency = agency.agents.some((a) => a.is_platform_owner);
  const [expanded, setExpanded] = useState(false);
  const [addingAgent, setAddingAgent] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAgency = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAgency(agency.id);
      router.refresh();
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete that agency.");
    }
    setDeleting(false);
  };

  return (
    <div style={cardStyle}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lh-display" style={{ fontSize: 15.5, fontWeight: 600, color: "var(--lh-navy)" }}>
            {agency.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--lh-slate-light)" }}>
            {agency.agents.length} {agency.agents.length === 1 ? "agent" : "agents"} · signed up{" "}
            {new Date(agency.created_at).toLocaleDateString()}
          </div>
        </div>
        <StatusBadge subscriptionStatus={agency.subscription_status} stripeCustomerId={agency.stripe_customer_id} />
        <ChevronDown
          size={16}
          color="var(--lh-slate-light)"
          style={{ transition: "transform 150ms ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {agency.agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}

          {!addingAgent ? (
            <button
              onClick={() => setAddingAgent(true)}
              style={{ ...secondaryButtonStyle, display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}
            >
              <UserPlus size={13} /> Add an agent to this agency
            </button>
          ) : (
            <AddAgentForm agencyId={agency.id} onDone={() => setAddingAgent(false)} />
          )}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--lh-line)" }}>
            {isOwnAgency ? (
              <p style={{ fontSize: 12, color: "var(--lh-slate-light)", margin: 0 }}>
                This is your own agency — it can't be deleted from here.
              </p>
            ) : !confirmingDelete ? (
              <button onClick={() => setConfirmingDelete(true)} style={dangerButtonStyle}>
                <Trash2 size={13} /> Delete this agency
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
                <p style={{ fontSize: 12.5, color: "var(--lh-red)", margin: 0 }}>
                  This permanently deletes every agent, Journey, document, and login under{" "}
                  <strong>{agency.name}</strong>. This can't be undone.
                </p>
                <label style={{ fontSize: 12, color: "var(--lh-navy-soft)" }}>
                  Type <strong>{agency.name}</strong> to confirm.
                </label>
                <input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="lh-focus"
                  style={inputStyle}
                />
                {deleteError && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{deleteError}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleDeleteAgency}
                    disabled={deleting || confirmText.trim() !== agency.name.trim()}
                    style={{
                      ...dangerButtonStyle,
                      opacity: deleting || confirmText.trim() !== agency.name.trim() ? 0.5 : 1,
                    }}
                  >
                    {deleting ? "Deleting..." : "Permanently delete"}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmText("");
                    }}
                    disabled={deleting}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NewAgencyForm({ onDone }) {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await createAgencyWithAgent({ agencyName, fullName, email, subscriptionStatus });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err.message || "Couldn't create that agency.");
    }
    setSaving(false);
  };

  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-navy)" }}>Agency name</label>
      <input
        value={agencyName}
        onChange={(e) => setAgencyName(e.target.value)}
        className="lh-focus"
        style={inputStyle}
        placeholder="e.g. Sunrise Realty"
      />
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-navy)" }}>Agent's full name</label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="lh-focus"
        style={inputStyle}
        placeholder="e.g. Jane Smith"
      />
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-navy)" }}>Agent's email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="lh-focus"
        style={inputStyle}
        placeholder="jane@sunriserealty.com"
      />
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lh-navy)" }}>Status</label>
      <select
        value={subscriptionStatus}
        onChange={(e) => setSubscriptionStatus(e.target.value)}
        className="lh-focus"
        style={inputStyle}
      >
        <option value="active">Active</option>
        <option value="trialing">Trialing</option>
        <option value="comped">Comped</option>
      </select>
      <p style={{ fontSize: 11.5, color: "var(--lh-slate)", margin: 0 }}>
        No Stripe subscription gets created — this shows up as "Manual" in the list. The agent gets
        a welcome email with a link to set their own password.
      </p>
      {error && <div style={{ fontSize: 12.5, color: "var(--lh-red)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={handleCreate} disabled={saving} style={primaryButtonStyle}>
          {saving ? "Creating..." : "Create agency & send invite"}
        </button>
        <button onClick={onDone} disabled={saving} style={secondaryButtonStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminConsole({ agencies }) {
  const [creatingAgency, setCreatingAgency] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!creatingAgency ? (
        <button
          onClick={() => setCreatingAgency(true)}
          style={{ ...primaryButtonStyle, alignSelf: "flex-start" }}
        >
          <Plus size={13} /> Add new agency
        </button>
      ) : (
        <NewAgencyForm onDone={() => setCreatingAgency(false)} />
      )}

      {agencies.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--lh-slate-light)" }}>No agencies yet.</div>
      )}

      {agencies.map((agency) => (
        <AgencyCard key={agency.id} agency={agency} />
      ))}
    </div>
  );
}
