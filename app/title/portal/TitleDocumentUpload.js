"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTitleCompanyDocumentUploadUrl, recordTitleCompanyDocument } from "./actions";

// Lets a title company contact add a document to the Journey they were
// invited to — unlike the client portal's RequestedDocumentUpload, this
// isn't tied to a specific document_requests row, since a title company
// can upload freely rather than only fulfilling something the agent asked
// for. Same admin-mediated signed-upload mechanics though.
export default function TitleDocumentUpload({ journeyId }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { path, token } = await getTitleCompanyDocumentUploadUrl(journeyId, file.name);
      const { error: uploadError } = await supabase.storage.from("documents").uploadToSignedUrl(path, token, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that file.");
      }
      await recordTitleCompanyDocument(journeyId, file.name, path);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't upload that file.");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={handleClick}
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
          padding: "8px 14px",
          fontSize: 13,
          cursor: uploading ? "default" : "pointer",
          opacity: uploading ? 0.6 : 1,
          alignSelf: "flex-start",
        }}
      >
        <Upload size={13} /> {uploading ? "Uploading..." : "Upload a document"}
      </button>
      <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
      {error && <div style={{ fontSize: 12, color: "var(--lh-red)" }}>{error}</div>}
    </div>
  );
}
