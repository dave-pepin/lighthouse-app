import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Small JSON endpoint so the global Sidebar (which renders on every
// dashboard page, not just the journey detail page) can pull a specific
// Journey's photos without needing a page-level data fetch. Access is
// still scoped correctly: the initial read uses the regular per-request
// client, so the existing "agents can view their agency's property
// photos" RLS policy on the property_photos table decides what comes
// back. The admin client is only used afterward, to sign URLs for rows
// we already know this user is allowed to see.
export async function GET(request, { params }) {
  const { journeyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ photos: [] }, { status: 401 });
  }

  const { data: photos } = await supabase
    .from("property_photos")
    .select("id, storage_path")
    .eq("journey_id", journeyId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (!photos || photos.length === 0) {
    return NextResponse.json({ photos: [] });
  }

  const admin = createAdminClient();
  const withLinks = await Promise.all(
    photos.map(async (p) => {
      const { data } = await admin.storage
        .from("property-photos")
        .createSignedUrl(p.storage_path, 60 * 60);
      return { id: p.id, url: data?.signedUrl || null };
    })
  );

  return NextResponse.json({ photos: withLinks });
}
