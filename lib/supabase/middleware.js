import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the auth session on every request and redirects
// unauthenticated visitors away from the dashboard to /login.
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isSignupPage = request.nextUrl.pathname.startsWith("/signup");
  const isSetPasswordPage =
    request.nextUrl.pathname.startsWith("/client/set-password") ||
    request.nextUrl.pathname.startsWith("/agent/set-password");
  // Privacy Policy and Terms must stay publicly viewable (no login wall) —
  // required for A2P 10DLC campaign review, and generally good practice.
  const isPublicLegalPage =
    request.nextUrl.pathname.startsWith("/privacy") ||
    request.nextUrl.pathname.startsWith("/terms");
  // Short invite links (/i/xxxxxxx) redirect an unauthenticated visitor to
  // their real Supabase invite link — the whole flow only makes sense
  // before they're logged in, so this must stay outside the auth wall too.
  const isShortLink = request.nextUrl.pathname.startsWith("/i/");
  // Stripe's servers call this directly with no user session at all —
  // it authenticates itself via its own signature, not a login cookie.
  const isStripeWebhook = request.nextUrl.pathname.startsWith("/api/webhooks/stripe");
  // An external scheduler pings this with no user session either — it
  // authenticates itself via CRON_SECRET, checked inside the route
  // handler, not a login cookie.
  const isCronRoute = request.nextUrl.pathname.startsWith("/api/cron/");

  if (
    !user &&
    !isLoginPage &&
    !isSignupPage &&
    !isSetPasswordPage &&
    !isPublicLegalPage &&
    !isShortLink &&
    !isStripeWebhook &&
    !isCronRoute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isLoginPage || isSignupPage)) {
    // Agents have a row in public.users; clients don't — route accordingly.
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = profile ? "/bridge" : "/client/portal";
    return NextResponse.redirect(url);
  }

  return response;
}
