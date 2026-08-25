import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";
import MilestoneVideoDefaults from "./MilestoneVideoDefaults";
import AgentContactForm from "./AgentContactForm";
import OverdueDigestForm from "./OverdueDigestForm";
import AgentBrandingForm from "./AgentBrandingForm";

const IMAGE_FIELDS = [
  ["trusted_contractors_image", "trustedContractorsImageUrl"],
  ["maintenance_image", "maintenanceImageUrl"],
  ["property_tax_image", "propertyTaxImageUrl"],
  ["home_value_image", "homeValueImageUrl"],
];

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "agency_id, sms_phone_number, reply_to_email, overdue_digest_threshold_days, profile_photo_path, logo_path, brand_color, office_address, cell_phone, office_phone, fax_number"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/client/portal");

  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", profile.agency_id)
    .single();

  // Signed preview links for whatever resource images are already
  // uploaded — the bucket is private, so this has to go through the
  // admin client.
  const admin = createAdminClient();
  const imageUrls = {};

  const [brandingPhotoSigned, brandingLogoSigned] = await Promise.all([
    profile.profile_photo_path
      ? admin.storage.from("agent-branding").createSignedUrl(profile.profile_photo_path, 60 * 60)
      : Promise.resolve({ data: null }),
    profile.logo_path
      ? admin.storage.from("agent-branding").createSignedUrl(profile.logo_path, 60 * 60)
      : Promise.resolve({ data: null }),
  ]);
  const brandingPhotoUrl = brandingPhotoSigned.data?.signedUrl || null;
  const brandingLogoUrl = brandingLogoSigned.data?.signedUrl || null;
  if (agency) {
    await Promise.all(
      IMAGE_FIELDS.map(async ([column, key]) => {
        const path = agency[column];
        if (!path) {
          imageUrls[key] = null;
          return;
        }
        const { data } = await admin.storage
          .from("harbor-resources")
          .createSignedUrl(path, 60 * 60);
        imageUrls[key] = data?.signedUrl || null;
      })
    );
  }

  // The reusable video library for this agency, plus which template
  // milestones (by role/stage/label) already have a default video
  // assigned — both needed to render the picker in MilestoneVideoDefaults.
  const [{ data: videoLibrary }, { data: videoDefaults }] = await Promise.all([
    supabase.from("videos").select("id, title, storage_path").order("created_at", { ascending: false }),
    supabase
      .from("milestone_video_defaults")
      .select("role, stage, label, video_id")
      .eq("agency_id", profile.agency_id),
  ]);

  let videoLibraryWithUrls = [];
  if (videoLibrary && videoLibrary.length > 0) {
    videoLibraryWithUrls = await Promise.all(
      videoLibrary.map(async (v) => {
        const { data } = await admin.storage.from("milestone-videos").createSignedUrl(v.storage_path, 60 * 60);
        return { ...v, url: data?.signedUrl || null };
      })
    );
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 32px 60px" }}>
      <h1 className="lh-display" style={{ fontSize: 26, fontWeight: 600, margin: "0 0 4px" }}>
        Settings
      </h1>
      <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 28 }}>
        This content shows up automatically in the Harbor — the permanent
        homeowner section every client sees once their Journey closes.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 24,
          marginBottom: 40,
        }}
      >
        <div>
          <h2 className="lh-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>
            Your Contact Info
          </h2>
          <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 20 }}>
            Controls what your clients see updates come from — a phone number your texts appear to
            come from, and where their email replies land.
          </p>
          <AgentContactForm
            smsPhoneNumber={profile.sms_phone_number}
            replyToEmail={profile.reply_to_email}
            officeAddress={profile.office_address}
            cellPhone={profile.cell_phone}
            officePhone={profile.office_phone}
            faxNumber={profile.fax_number}
          />
        </div>

        <OverdueDigestForm thresholdDays={profile.overdue_digest_threshold_days} />

        <AgentBrandingForm
          userId={user.id}
          photoUrl={brandingPhotoUrl}
          logoUrl={brandingLogoUrl}
          brandColor={profile.brand_color}
        />
      </div>

      <SettingsForm agency={agency} imageUrls={imageUrls} />

      <div style={{ marginTop: 40 }}>
        <h2 className="lh-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>
          Milestone Videos
        </h2>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 20 }}>
          Assign a video to a milestone once here, and every new Buying or Selling client
          automatically gets it attached — no need to upload it again per client. This applies to
          new Journeys going forward; it won&apos;t change milestones on Journeys you&apos;ve already
          started.
        </p>
        <MilestoneVideoDefaults
          agencyId={profile.agency_id}
          videoLibrary={videoLibraryWithUrls}
          videoDefaults={videoDefaults || []}
        />
      </div>
    </div>
  );
}
