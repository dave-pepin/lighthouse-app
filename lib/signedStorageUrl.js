import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Every page that shows a photo, video, document, or logo re-minted a
// fresh signed URL on every render — an extra Supabase Storage API call
// per file, per page load, scaling with traffic rather than with actual
// file changes. This wraps that call in Next's Data Cache, keyed by
// bucket+path+expiry, so repeat renders within the cache window reuse
// the same signed URL instead of re-signing.
//
// revalidate is set well under expirySeconds so a cached entry is never
// served past the point where the underlying signed URL itself expires.
// downloadName is passed as-is into createSignedUrl's `download` option
// when set (forces the browser to save the file instead of opening it
// inline) — kept as its own argument, not a nested options object, so it
// participates in unstable_cache's argument-based cache key correctly.
async function signUrl(bucket, path, expirySeconds, downloadName) {
  const admin = createAdminClient();
  const options = downloadName ? { download: downloadName } : undefined;
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, expirySeconds, options);
  return data?.signedUrl || null;
}

const getCachedSignedUrl = unstable_cache(signUrl, ["signed-storage-url"], { revalidate: 2700 });

// Same call shape as admin.storage.from(bucket).createSignedUrl(path, expirySeconds),
// but cached. Pass the same expirySeconds you'd have used directly
// (typically 3600), and downloadName if you need the `download` option.
export async function getSignedStorageUrl(bucket, path, expirySeconds = 3600, downloadName = null) {
  if (!path) return null;
  return getCachedSignedUrl(bucket, path, expirySeconds, downloadName);
}
