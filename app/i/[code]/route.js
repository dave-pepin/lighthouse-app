import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Short invite links (lighthouse.davepepin.com/i/xxxxxxx) resolve here.
//
// This used to redirect straight through to the real Supabase invite/magic
// link automatically. That turned out to be the actual cause of clients
// seeing "expired or already used" even on a brand-new, unexpired link:
// Supabase invite/magic links are one-time use, and a lot of email
// providers and corporate security systems (Microsoft Defender for
// Office 365 Safe Links, Proofpoint, Gmail's own scanning, etc.)
// automatically visit every link in an incoming email to check it's safe
// — before the person ever opens the message. That silently burns the
// one-time token, so by the time the real client clicks, it's already
// "used."
//
// The fix is to require an actual human click here first — scanners
// don't click buttons, they just fetch the URL — before ever touching the
// real Supabase link.
//
// Update: the button used to be a plain <a href> straight to the real
// Supabase link. That's still fetchable without a real click — some
// browsers' own "preload pages for faster browsing" features (and some
// in-app browsers / link-preview generators) will speculatively GET an
// anchor's target before it's actually clicked, which burns the one-time
// token the exact same way a scanner does. The button below is now a real
// <form method="POST"> instead — nothing prefetches or auto-submits a
// form, so the underlying Supabase link is only ever touched by an actual
// click, handled by the POST handler further down.
//
// Looked up with the admin client since the visitor isn't authenticated
// yet — that's the whole point of an invite link — and short_links has no
// RLS policies for anon/authenticated access anyway.
export async function GET(request, { params }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("short_links")
    .select("target_url")
    .eq("code", code)
    .maybeSingle();

  if (!data?.target_url) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Lighthouse</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F3F5F4; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
  .card { background: #FFFFFF; border: 1px solid #E2E7E6; border-radius: 14px; padding: 34px 30px; width: 320px; text-align: center; box-sizing: border-box; }
  h1 { font-size: 20px; font-weight: 600; color: #16324F; margin: 0 0 8px; }
  p { font-size: 13.5px; color: #63737D; margin: 0 0 22px; line-height: 1.5; }
  form { margin: 0; }
  .btn { display: inline-block; background: #16324F; color: #ffffff; border: none; border-radius: 8px; padding: 11px 22px; font-size: 14px; font-weight: 600; font-family: inherit; text-decoration: none; cursor: pointer; }
</style>
</head>
<body>
  <div class="card">
    <h1>Lighthouse</h1>
    <p>You've been invited to your own Lighthouse portal. Click below to continue.</p>
    <form method="POST">
      <button type="submit" class="btn">Continue to set up your account</button>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Only reached by an actual form submission — i.e. a real click — never
// by a GET-based prefetch, scanner, or link preview. 303 forces the
// browser to follow up with a fresh GET against the real Supabase link,
// rather than resubmitting the POST.
export async function POST(request, { params }) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("short_links")
    .select("target_url")
    .eq("code", code)
    .maybeSingle();

  if (!data?.target_url) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  return NextResponse.redirect(data.target_url, 303);
}
