"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { sendAgentEmail } from "@/lib/notify";

// Called right after a client successfully sets their portal password for
// the first time. Records when it happened and emails the agent once —
// guarded by client_activated_at so a later password reset (or a second
// visit to this page) doesn't fire it again.
//
// A single login can be tied to more than one Journey (e.g. selling their
// current home while buying a new one), possibly with different agents on
// each — so this checks every Journey under this login, not just one, and
// notifies each Journey's own agent independently the first time that
// specific Journey gets activated.
export async function notifyClientActivated() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // The client's own RLS-scoped read — this only ever finds Journeys
  // that are actually theirs.
  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, client_name, agent_id, client_activated_at")
    .eq("client_user_id", user.id);

  const pending = (journeys || []).filter((j) => !j.client_activated_at);
  if (pending.length === 0) return;

  const admin = createAdminClient();

  for (const journey of pending) {
    await admin
      .from("journeys")
      .update({ client_activated_at: new Date().toISOString() })
      .eq("id", journey.id);

    const { data: agent } = await admin
      .from("users")
      .select("email, full_name")
      .eq("id", journey.agent_id)
      .maybeSingle();

    if (agent?.email) {
      try {
        await sendAgentEmail({
          to: agent.email,
          subject: `${journey.client_name} just set up their Lighthouse portal`,
          message: `${journey.client_name} just finished setting up their portal login. You can check in on their Journey anytime from your Bridge.`,
        });
      } catch (err) {
        // Best-effort — the activation itself already succeeded and got
        // recorded above; a failed notification email shouldn't undo that.
        Sentry.captureException(err);
      }
    }
  }
}
