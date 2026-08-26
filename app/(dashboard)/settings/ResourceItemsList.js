"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Image as ImageIcon, FileText, File, Link2, ExternalLink, Upload, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addResourceLink, addResourceFile, removeResourceItem } from "./actions";

const FILE_TYPE_ICONS = {
  video: Video,
  photo: ImageIcon,
  document: FileText,
  other: File,
};

const FILE_TYPE_LABELS = {
  video: "Video",
  photo: "Photo",
  document: "Document",
  other: "File",
};

const inputStyle = {
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 12.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
};

const smallButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  background: "var(--lh-navy)",
  color: "white",
  border: "none",
  borderRadius: 7,
  padding: "6px 11px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const cancelButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--lh-slate)",
  fontSize: 12,
  cursor: "pointer",
  padding: "6px 4px",
};

function ItemRow({ item, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeResourceItem(item.id);
      onRemoved?.();
      router.refresh();
    } catch {
      setRemoving(false);
    }
  };

  const Icon = item.kind === "link" ? Link2 : FILE_TYPE_ICONS[item.fileType] || File;
  const href = item.kind === "link" ? item.url : item.signedUrl;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 9px",
        background: "var(--lh-fog)",
        border: "1px solid var(--lh-line)",
        borderRadius: 8,
      }}
    >
      <Icon size={14} color="var(--lh-teal)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--lh-navy)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {item.label}
        </a>
      ) : (
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--lh-slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </span>
      )}
      {item.kind === "link" && <ExternalLink size={11} color="var(--lh-slate-light)" style={{ flexShrink: 0 }} />}
      <button
        onClick={handleRemove}
        disabled={removing}
        title="Remove"
        className="lh-focus"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          color: "var(--lh-slate-light)",
          cursor: removing ? "default" : "pointer",
          flexShrink: 0,
          padding: 2,
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// A per-section repository of extra items on top of the section's
// existing single note + single postcard image — any number of uploaded
// files (video/photo/document/other) or plain website links. Used
// identically across all four Harbor resource sections in
// SettingsForm.js, parameterized only by `section`.
export default function ResourceItemsList({ agencyId, section, items = [] }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState(null); // null | "link" | "file"
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [fileType, setFileType] = useState("photo");
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setMode(null);
    setLabel("");
    setUrl("");
    setFileType("photo");
    setPendingFile(null);
    setError("");
  };

  const handleAddLink = async () => {
    setSaving(true);
    setError("");
    try {
      await addResourceLink(agencyId, section, label, url);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't add that link.");
    }
    setSaving(false);
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
    if (!label) {
      setLabel(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleAddFile = async () => {
    if (!pendingFile) {
      setError("Choose a file first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const path = `${agencyId}/resource-items/${section}-${Date.now()}-${pendingFile.name}`;
      const { error: uploadError } = await supabase.storage.from("harbor-resources").upload(path, pendingFile);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that file.");
      }
      await addResourceFile(agencyId, section, label, fileType, path);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't add that file.");
    }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {mode === null && (
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={() => setMode("link")}
            className="lh-focus"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--lh-teal)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
          >
            <Plus size={13} /> Add a link
          </button>
          <button
            onClick={() => setMode("file")}
            className="lh-focus"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--lh-teal)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
          >
            <Plus size={13} /> Add a file
          </button>
        </div>
      )}

      {mode === "link" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--lh-fog)", border: "1px solid var(--lh-line)", borderRadius: 8, padding: 10 }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="lh-focus"
            style={inputStyle}
            placeholder="Label, e.g. County assessor lookup"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="lh-focus"
            style={inputStyle}
            placeholder="https://..."
          />
          {error && <div style={{ fontSize: 11.5, color: "#B4472A" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddLink} disabled={saving} className="lh-focus" style={smallButtonStyle}>
              {saving ? "Adding..." : "Add link"}
            </button>
            <button onClick={resetForm} disabled={saving} className="lh-focus" style={cancelButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "file" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--lh-fog)", border: "1px solid var(--lh-line)", borderRadius: 8, padding: 10 }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="lh-focus"
            style={inputStyle}
            placeholder="Label, e.g. Backyard drainage guide"
          />
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="lh-focus"
            style={{ ...inputStyle, background: "var(--lh-paper)" }}
          >
            {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
          <button
            onClick={handlePickFile}
            className="lh-focus"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--lh-paper)", border: "1px dashed var(--lh-line)", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "var(--lh-slate)", cursor: "pointer" }}
          >
            <Upload size={13} /> {pendingFile ? pendingFile.name : "Choose a file"}
          </button>
          {error && <div style={{ fontSize: 11.5, color: "#B4472A" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddFile} disabled={saving} className="lh-focus" style={smallButtonStyle}>
              {saving ? "Uploading..." : "Add file"}
            </button>
            <button onClick={resetForm} disabled={saving} className="lh-focus" style={cancelButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
