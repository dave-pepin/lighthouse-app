"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateAgencyResources, setAgencyResourceImage } from "./actions";

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

const textareaStyle = {
  width: "100%",
  minHeight: 84,
  border: "1px solid var(--lh-line)",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--lh-navy)",
  resize: "vertical",
};

const fieldGroupStyle = {
  background: "var(--lh-paper)",
  border: "1px solid var(--lh-line)",
  borderRadius: 12,
  padding: "16px 18px",
};

function ResourceImage({ agencyId, field, url, onChanged }) {
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
      const path = `${agencyId}/${field}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("harbor-resources")
        .upload(path, file);
      if (uploadError) {
        throw new Error(uploadError.message || "Couldn't upload that image.");
      }
      await setAgencyResourceImage(agencyId, field, path);
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
      await setAgencyResourceImage(agencyId, field, null);
      onChanged?.();
      router.refresh();
    } catch (err) {
      setError(err.message || "Couldn't remove that image.");
    }
    setUploading(false);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {url ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={url}
            alt=""
            style={{
              width: 160,
              height: 110,
              objectFit: "cover",
              borderRadius: 8,
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
              top: 5,
              right: 5,
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
          {uploading ? "Uploading..." : "Add an image (postcard, guide, etc.)"}
        </button>
      )}
      {error && <div style={{ fontSize: 11.5, color: "#B4472A", marginTop: 5 }}>{error}</div>}
    </div>
  );
}

export default function SettingsForm({ agency, imageUrls = {} }) {
  const [trustedContractors, setTrustedContractors] = useState(agency?.trusted_contractors || "");
  const [maintenanceNote, setMaintenanceNote] = useState(agency?.maintenance_note || "");
  const [propertyTaxNote, setPropertyTaxNote] = useState(agency?.property_tax_note || "");
  const [referralNote, setReferralNote] = useState(agency?.referral_note || "");
  const [homeValueNote, setHomeValueNote] = useState(agency?.home_value_note || "");
  const [updateToneNotes, setUpdateToneNotes] = useState(agency?.update_tone_notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateAgencyResources(agency.id, {
        trustedContractors,
        maintenanceNote,
        propertyTaxNote,
        referralNote,
        homeValueNote,
        updateToneNotes,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save those changes.");
    }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Your voice, for AI-suggested messages</label>
        <p style={helpStyle}>
          When you tap "Suggest" on a weekly update, this is how the AI tries to sound. By default it
          aims for casual and low-key — like a text to a friend, "no big deal," never salesy. Add notes
          here if you want it closer to your own voice. It also learns from your own past sent updates
          automatically, so this is optional.
        </p>
        <textarea
          value={updateToneNotes}
          onChange={(e) => setUpdateToneNotes(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder={"e.g. I use short sentences and never use exclamation points. I sign things off casually, like \"talk soon\" instead of \"best.\""}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Referring someone to you</label>
        <p style={helpStyle}>
          How you&apos;d like past clients to reach out when they know someone buying or selling. Left
          blank, clients will see a general "send them your way" note.
        </p>
        <textarea
          value={referralNote}
          onChange={(e) => setReferralNote(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder="e.g. Just have them call or text me directly at..."
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Trusted contractors</label>
        <p style={helpStyle}>
          Plumbers, electricians, handymen — whoever you&apos;d actually recommend. Left blank, clients
          will see a note to ask you directly for a recommendation. You can also attach an image below
          (a postcard, flyer, or printed guide).
        </p>
        <textarea
          value={trustedContractors}
          onChange={(e) => setTrustedContractors(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder={"e.g.\nJim's Plumbing — (555) 111-2222\nBright Spark Electric — (555) 333-4444"}
        />
        <ResourceImage
          agencyId={agency.id}
          field="trusted_contractors_image"
          url={imageUrls.trustedContractorsImageUrl}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Seasonal maintenance</label>
        <p style={helpStyle}>
          A general checklist or reminder about upkeep through the year. Left blank, clients will see
          generic seasonal tips. You can also attach an image below (a postcard, flyer, or printed
          guide).
        </p>
        <textarea
          value={maintenanceNote}
          onChange={(e) => setMaintenanceNote(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder="e.g. Check HVAC filters every season, clean gutters each fall, test smoke detectors twice a year..."
        />
        <ResourceImage
          agencyId={agency.id}
          field="maintenance_image"
          url={imageUrls.maintenanceImageUrl}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Property tax information</label>
        <p style={helpStyle}>
          Local assessor links, due dates, or anything specific to your area. Left blank, clients will
          see a general pointer to their county assessor. You can also attach an image below (a
          postcard, flyer, or printed guide).
        </p>
        <textarea
          value={propertyTaxNote}
          onChange={(e) => setPropertyTaxNote(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder="e.g. County property tax bills go out in October — you can look yours up at..."
        />
        <ResourceImage
          agencyId={agency.id}
          field="property_tax_image"
          url={imageUrls.propertyTaxImageUrl}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Home value info (optional)</label>
        <p style={helpStyle}>
          Only shows up if you fill it in — a link or note about checking their home&apos;s value. Leave
          blank to skip this section entirely for now. You can also attach an image below (a postcard,
          flyer, or printed guide).
        </p>
        <textarea
          value={homeValueNote}
          onChange={(e) => setHomeValueNote(e.target.value)}
          className="lh-focus"
          style={textareaStyle}
          placeholder="e.g. Curious what your home is worth today? Reach out anytime for a free estimate."
        />
        <ResourceImage
          agencyId={agency.id}
          field="home_value_image"
          url={imageUrls.homeValueImageUrl}
        />
      </div>

      {error && <div style={{ fontSize: 13, color: "#B4472A" }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="lh-focus"
          style={{
            background: "var(--lh-navy)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--lh-teal)", fontSize: 13, fontWeight: 600 }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
