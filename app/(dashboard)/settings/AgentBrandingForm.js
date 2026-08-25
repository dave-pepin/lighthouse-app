"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAgentBrandingImage, updateAgentBrandColor } from "./actions";

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

// One upload slot — a photo or a logo. Mirrors SettingsForm.js's
// ResourceImage: no optimistic local preview, just upload then
// router.refresh() to pick up the fresh signed URL from the server.
function BrandingImageSlot({ userId, field, url, label, round, onChanged }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handlePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const path = `${userId}/${field}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("agent-branding").upload(path, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that image.");
      }
      await setAgentBrandingImage(field, path);
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't upload that image.");
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    setUploading(true);
    setError("");
    try {
      await setAgentBrandingImage(field, null);
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't remove that image.");
    }
    setUploading(false);
  };

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
      {url ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={url}
            alt=""
            style={{
              width: round ? 72 : 160,
              height: round ? 72 : 90,
              objectFit: "cover",
              borderRadius: round ? "50%" : 8,
              border: "1px solid var(--lh-line)",
              background: "var(--lh-fog)",
            }}
          />
          <button
            onClick={handleRemove}
            disabled={uploading}
            title="Remove image"
            className="lh-focus"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "rgba(22, 50, 79, 0.8)",
              border: "none",
              borderRadius: 16,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: uploading ? "default" : "pointer",
              padding: 0,
            }}
          >
            <X size={12} color="white" />
          </button>
        </div>
      ) : (
        <button
          onClick={handlePick}
          disabled={uploading}
          className="lh-focus"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--lh-fog)",
            border: "1px dashed var(--lh-line)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12.5,
            color: "var(--lh-slate)",
            cursor: uploading ? "default" : "pointer",
          }}
        >
          <ImagePlus size={14} />
          {uploading ? "Uploading..." : `Add ${label.toLowerCase()}`}
        </button>
      )}
      {error && <div style={{ fontSize: 11.5, color: "#B4472A", marginTop: 5 }}>{error}</div>}
    </div>
  );
}

export default function AgentBrandingForm({ userId, photoUrl, logoUrl, brandColor }) {
  const router = useRouter();
  const [color, setColor] = useState(brandColor || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSaveColor = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateAgentBrandColor(color);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't save that color.");
    }
    setSaving(false);
  };

  const handleClearColor = async () => {
    setColor("");
    setSaving(true);
    setError("");
    try {
      await updateAgentBrandColor(null);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't clear that color.");
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 className="lh-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>
        Your Branding
      </h2>
      <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 20 }}>
        Shown to your clients as a small footer on their portal. Leave any of these blank to leave
        it out entirely.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={fieldGroupStyle}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <BrandingImageSlot userId={userId} field="profile_photo_path" url={photoUrl} label="Your photo" round />
            <BrandingImageSlot userId={userId} field="logo_path" url={logoUrl} label="Your logo" />
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Brand color</label>
          <p style={helpStyle}>
            A small accent on your portal footer only — this doesn&apos;t change the rest of your
            clients&apos; portal.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              type="color"
              value={color || "#2F6F6B"}
              onChange={(e) => setColor(e.target.value)}
              className="lh-focus"
              style={{ width: 40, height: 36, border: "1px solid var(--lh-line)", borderRadius: 8, padding: 2, cursor: "pointer" }}
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="No color set"
              className="lh-focus"
              style={{ ...inputStyle, width: 120 }}
            />
            <button onClick={handleSaveColor} disabled={saving} className="lh-focus" style={primaryButtonStyle}>
              {saving ? "Saving..." : "Save"}
            </button>
            {brandColor && (
              <button
                onClick={handleClearColor}
                disabled={saving}
                className="lh-focus"
                style={{ background: "none", border: "none", color: "var(--lh-slate)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}
              >
                Clear
              </button>
            )}
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--lh-teal)", fontSize: 13, fontWeight: 600 }}>
                <Check size={14} /> Saved
              </span>
            )}
          </div>
          {error && <div style={{ fontSize: 13, color: "var(--lh-red)", marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
