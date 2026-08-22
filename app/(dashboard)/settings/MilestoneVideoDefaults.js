"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createVideo } from "@/app/(dashboard)/journey/[id]/actions";
import { setMilestoneVideoDefault } from "./actions";
import { flattenTemplateForRole } from "@/lib/milestoneTemplates";

const fieldGroupStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

function defaultsKey(role, stage, label) {
  return `${role}::${stage}::${label}`;
}

export default function MilestoneVideoDefaults({ agencyId, videoLibrary, videoDefaults }) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [library, setLibrary] = useState(videoLibrary);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [activeRole, setActiveRole] = useState("Buying");

  const [assignments, setAssignments] = useState(() => {
    const map = {};
    for (const d of videoDefaults) {
      map[defaultsKey(d.role, d.stage, d.label)] = d.video_id;
    }
    return map;
  });
  const [rowError, setRowError] = useState("");

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const path = `${agencyId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("milestone-videos").upload(path, file);
      if (uploadErr) {
        throw new Error(uploadErr.message || "Couldn't upload that video.");
      }
      const video = await createVideo(uploadTitle || file.name, path);
      setLibrary((cur) => [{ ...video, url: null }, ...cur]);
      setUploadTitle("");
      router.refresh();
    } catch (err) {
      setUploadError(err.message || "Couldn't upload that video.");
    }
    setUploading(false);
  };

  const handleAssign = async (role, stage, label, videoId) => {
    const key = defaultsKey(role, stage, label);
    const previous = assignments[key];
    setAssignments((cur) => ({ ...cur, [key]: videoId || undefined }));
    setRowError("");
    try {
      await setMilestoneVideoDefault(role, stage, label, videoId || null);
    } catch (err) {
      setAssignments((cur) => ({ ...cur, [key]: previous }));
      setRowError(err.message || "Couldn't save that.");
    }
  };

  const rows = flattenTemplateForRole(activeRole);
  let lastStage = null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={fieldGroupStyle}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--lh-navy)", marginBottom: 4, display: "block" }}>
          Your video library
        </label>
        <p style={{ fontSize: 12, color: "var(--lh-slate)", marginBottom: 10, lineHeight: 1.45 }}>
          Upload a video once here, then assign it to whichever milestone(s) it applies to below.
        </p>

        {library.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {library.map((v) => (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--lh-navy-soft)",
                  background: "var(--lh-fog)",
                  border: "1px solid var(--lh-line)",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                <Video size={14} color="var(--lh-slate)" strokeWidth={1.75} />
                <span style={{ flex: 1 }}>{v.title}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Video title (e.g. What to expect at inspection)"
            className="lh-focus"
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              border: "1px solid var(--lh-line)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: "none" }} />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="lh-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--lh-navy)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? "default" : "pointer",
              opacity: uploading ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <Upload size={13} /> {uploading ? "Uploading..." : "Upload video"}
          </button>
        </div>
        {uploadError && <div style={{ fontSize: 11.5, color: "#B4472A", marginTop: 6 }}>{uploadError}</div>}
      </div>

      <div style={fieldGroupStyle}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["Buying", "Selling"].map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className="lh-focus"
              style={{
                background: activeRole === role ? "var(--lh-navy)" : "none",
                color: activeRole === role ? "white" : "var(--lh-slate)",
                border: activeRole === role ? "none" : "1px solid var(--lh-line)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {role}
            </button>
          ))}
        </div>

        {rowError && <div style={{ fontSize: 11.5, color: "#B4472A", marginBottom: 10 }}>{rowError}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((row) => {
            const showStageHeader = row.stage !== lastStage;
            lastStage = row.stage;
            const key = defaultsKey(activeRole, row.stage, row.label);
            const currentVideoId = assignments[key] || "";

            return (
              <div key={key}>
                {showStageHeader && (
                  <div
                    className="lh-mono"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "var(--lh-slate-light)",
                      letterSpacing: 0.3,
                      margin: "14px 0 4px",
                    }}
                  >
                    {row.stage.toUpperCase()}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "5px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--lh-navy-soft)", flex: "1 1 140px", minWidth: 0 }}>
                    {row.label}
                    {row.variantNote && (
                      <span style={{ color: "var(--lh-slate-light)", fontSize: 11.5 }}> ({row.variantNote})</span>
                    )}
                  </span>
                  <select
                    value={currentVideoId}
                    onChange={(e) => handleAssign(activeRole, row.stage, row.label, e.target.value)}
                    className="lh-focus"
                    style={{
                      fontSize: 12.5,
                      border: "1px solid var(--lh-line)",
                      borderRadius: 7,
                      padding: "5px 8px",
                      fontFamily: "inherit",
                      color: "var(--lh-navy-soft)",
                      background: "var(--lh-paper)",
                      maxWidth: 220,
                    }}
                  >
                    <option value="">No video</option>
                    {library.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                  {currentVideoId && (
                    <button
                      onClick={() => handleAssign(activeRole, row.stage, row.label, "")}
                      title="Remove"
                      className="lh-focus"
                      style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex" }}
                    >
                      <X size={13} color="var(--lh-slate-light)" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
