import { createBrowserClient } from "@supabase/ssr";

// Used inside Client Components ("use client" files) —
// runs in the browser, respects the logged-in user's session.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
