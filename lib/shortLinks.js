// Wraps a long Supabase invite/magic link (or any long URL) in a short
// lighthouse.davepepin.com/i/xxxxxxx link — much friendlier in a text
// message or email, and doesn't eat into the SMS segment count the way a
// 200+ character Supabase URL does. Shared by anything that needs to send
// a one-time-use link: client invites, and now the post-payment agent
// welcome email.

// Unambiguous alphabet — no 0/O or 1/l/I — since these codes may get read
// aloud or typed by hand if a link ever gets garbled in transit.
const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateShortCode(length = 7) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return code;
}

export async function createShortLink(admin, targetUrl, origin) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    const { error } = await admin.from("short_links").insert({ code, target_url: targetUrl });
    if (!error) {
      return `${origin}/i/${code}`;
    }
    // Only retry on a collision with an existing code; anything else, give up.
    if (error.code !== "23505") {
      throw new Error(`Couldn't create a short link: ${error.message}`);
    }
  }
  throw new Error("Couldn't create a short link after several attempts.");
}
