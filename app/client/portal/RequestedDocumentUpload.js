"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getClientDocumentUploadUrl, fulfillDocumentRequest } from "./actions";

// One row per document an agent has asked this client for. Uploads go
// through a signed Storage URL (minted server-side by
// getClientDocumentUploadUrl) rather than a direct authenticated upload,
// since the "documents" bucket's access rules are dashboard-configured
// and this sidesteps depending on their exact wording. previewMode (an
// agent looking at their client's portal) disables the picker entirely —
// there's no login to upload as.
export default function RequestedDocumentUpload({ request, previewMode }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = () => {
    if (previewMode || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { path, token } = await getClientDocumentUploadUrl(request.id);
      const { error: uploadError } = await supabase.storage.from("documents").uploadToSignedUrl(path, token, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that file.");
      }
      await fulfillDocumentRequest(request.id, file.name, path);
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't upload that file.");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <FileText size={16} color="var(--lh-slate)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13.5, color: "var(--lh-navy)" }}>{request.label}</span>
        <button
          onClick={handleClick}
          disabled={previewMode || uploading}
          className="lh-focus"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 7,
            padding: "5px 10px",
            fontSize: 12,
            cursor: previewMode || uploading ? "default" : "pointer",
            opacity: previewMode || uploading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <Upload size={12} /> {uploading ? "Uploading..." : "Upload"}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
      </div>
      {error && <div style={{ fontSize: 12, color: "var(--lh-red)" }}>{error}</div>}
    </div>
  );
}
