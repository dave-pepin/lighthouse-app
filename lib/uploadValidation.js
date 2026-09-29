// Client-side pre-check before an upload hits Supabase Storage — gives an
// immediate, friendly error instead of a failed round-trip once the file
// is already most of the way uploaded. The real backstop is the matching
// file_size_limit/allowed_mime_types on the bucket itself (see
// add-storage-bucket-limits-migration.sql) — this is just faster UX, not
// the enforcement layer, since a client-side check is trivially bypassed.
export function validateFile(file, { maxBytes, allowedMimeTypes, label = "file" }) {
  if (maxBytes && file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return `That ${label} is too large — the limit is ${maxMb}MB.`;
  }
  if (allowedMimeTypes && !allowedMimeTypes.includes(file.type)) {
    return `That ${label} type isn't supported.`;
  }
  return null;
}

// Supabase Storage rejects object keys containing characters outside a
// safe set — notably spaces, which show up constantly in real filenames
// (e.g. macOS screenshots: "Screenshot 2026-09-29 at 2.03.38 PM.jpg").
// Sanitize before building a storage path so an upload never fails on
// something this ordinary.
export function sanitizeFilenameForStorage(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
