import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedStorageUrl } from "@/lib/signedStorageUrl";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";
import MilestoneVideoDefaults from "./MilestoneVideoDefaults";
import MilestoneTemplateSettings from "./MilestoneTemplateSettings";
import AgentContactForm from "./AgentContactForm";
import OverdueDigestForm from "./OverdueDigestForm";
import MarketImpactDigestForm from "./MarketImpactDigestForm";
import AgentBrandingForm from "./AgentBrandingForm";
import DelegateAccessForm from "./DelegateAccessForm";

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
      "full_name, agency_id, sms_phone_number, reply_to_email, overdue_digest_threshold_days, market_impact_report_frequency, profile_photo_path, logo_path, brand_color, office_address, office_city, office_state, office_zip, cell_phone, office_phone, fax_number, show_footer_name, license_numbers"
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
  // admin client. Cached (see lib/signedStorageUrl.js) since these are
  // re-requested on every Settings page load otherwise.
  const admin = createAdminClient();
  const imageUrls = {};

  const [brandingPhotoUrl, brandingLogoUrl] = await Promise.all([
    getSignedStorageUrl("agent-branding", profile.profile_photo_path),
    getSignedStorageUrl("agent-branding", profile.logo_path),
  ]);
  if (agency) {
    await Promise.all(
      IMAGE_FIELDS.map(async ([column, key]) => {
        imageUrls[key] = await getSignedStorageUrl("harbor-resources", agency[column]);
      })
    );
  }

  // Each Harbor resource section's extra files/links (see
  // add-harbor-resource-items-migration.sql) — file-kind items need a
  // signed URL (same private harbor-resources bucket as the postcard
  // images above), link-kind items just use their stored url as-is.
  const { data: resourceItemRows } = await supabase
    .from("harbor_resource_items")
    .select("id, section, kind, file_type, storage_path, url, label, created_at")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: true });

  const resourceItems = { trusted_contractors: [], maintenance: [], property_tax: [], home_value: [] };
  if (resourceItemRows && resourceItemRows.length > 0) {
    await Promise.all(
      resourceItemRows.map(async (row) => {
        let signedUrl = null;
        if (row.kind === "file" && row.storage_path) {
          signedUrl = await getSignedStorageUrl("harbor-resources", row.storage_path);
        }
        const item = { id: row.id, kind: row.kind, fileType: row.file_type, url: row.url, label: row.label, signedUrl };
        resourceItems[row.section]?.push(item);
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

  // This agency's overrides (enabled/disabled, custom order) on top of
  // the stock milestone template — no rows means the stock template
  // applies as-is. Needed to render MilestoneTemplateSettings below.
  const { data: templateSettings } = await supabase
    .from("milestone_template_settings")
    .select("role, stage, label, enabled, sort_order")
    .eq("agency_id", profile.agency_id);

  // The delegate's full_name lives on their `users` row in a DIFFERENT
  // agency, which the RLS-scoped client can't see (users SELECT is
  // scoped to your own agency) — the admin client fills in the display
  // name only, nothing else.
  const { data: delegateGrantRows } = await supabase
    .from("agency_delegates")
    .select("id, delegate_user_id, starts_at, ends_at")
    .eq("agency_id", profile.agency_id)
    .order("starts_at", { ascending: true });

  let delegateGrants = [];
  if (delegateGrantRows && delegateGrantRows.length > 0) {
    const { data: delegateUsers } = await admin
      .from("users")
      .select("id, full_name")
      .in(
        "id",
        delegateGrantRows.map((g) => g.delegate_user_id)
      );
    const nameById = Object.fromEntries((delegateUsers || []).map((u) => [u.id, u.full_name]));
    delegateGrants = delegateGrantRows.map((g) => ({ ...g, delegateName: nameById[g.delegate_user_id] || "Unknown" }));
  }

  let videoLibraryWithUrls = [];
  if (videoLibrary && videoLibrary.length > 0) {
    videoLibraryWithUrls = await Promise.all(
      videoLibrary.map(async (v) => ({
        ...v,
        url: await getSignedStorageUrl("milestone-videos", v.storage_path),
      }))
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px 60px" }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
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
            officeCity={profile.office_city}
            officeState={profile.office_state}
            officeZip={profile.office_zip}
            cellPhone={profile.cell_phone}
            officePhone={profile.office_phone}
            faxNumber={profile.fax_number}
            licenseNumbers={profile.license_numbers}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <MarketImpactDigestForm frequency={profile.market_impact_report_frequency} />
          <OverdueDigestForm thresholdDays={profile.overdue_digest_threshold_days} />
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 className="lh-display" style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>
          Milestone Checklist
        </h2>
        <p style={{ fontSize: 14, color: "var(--lh-slate)", marginBottom: 20 }}>
          Turn off any default milestones you don&apos;t use, and drag to reorder the rest within
          their stage. This applies to new Journeys going forward; it won&apos;t change milestones
          on Journeys you&apos;ve already started.
        </p>
        <MilestoneTemplateSettings templateSettings={templateSettings || []} />
      </div>

      <div style={{ marginBottom: 40 }}>
        <AgentBrandingForm
          userId={user.id}
          photoUrl={brandingPhotoUrl}
          logoUrl={brandingLogoUrl}
          brandColor={profile.brand_color}
          showFooterName={profile.show_footer_name}
          fullName={profile.full_name}
          email={profile.reply_to_email}
          officeAddress={profile.office_address}
          officeCity={profile.office_city}
          officeState={profile.office_state}
          officeZip={profile.office_zip}
          cellPhone={profile.cell_phone}
          officePhone={profile.office_phone}
          faxNumber={profile.fax_number}
          licenseNumbers={profile.license_numbers}
        />
      </div>

      <div style={{ marginBottom: 40 }}>
        <DelegateAccessForm grants={delegateGrants} />
      </div>

      <SettingsForm agency={agency} imageUrls={imageUrls} resourceItems={resourceItems} />

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
