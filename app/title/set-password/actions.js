"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { sendAgentEmail } from "@/lib/notify";

// Called right after a title company contact successfully sets their
// portal password for the first time. Records when it happened and emails
// the agent once — guarded by activated_at so a later password reset
// doesn't fire it again. Same shape as notifyClientActivated
// (app/client/set-password/actions.js), but keyed off title_company_contacts
// instead of journeys.client_user_id, and a contact can only ever be tied
// to one Journey.
export async function notifyTitleCompanyActivated() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // The contact's own RLS-scoped read — this only ever finds rows that
  // are actually theirs.
  const { data: contacts } = await supabase
    .from("title_company_contacts")
    .select("id, company_name, journey_id, activated_at")
    .eq("user_id", user.id);

  const pending = (contacts || []).filter((c) => !c.activated_at);
  if (pending.length === 0) return;

  const admin = createAdminClient();

  for (const contact of pending) {
    await admin
      .from("title_company_contacts")
      .update({ activated_at: new Date().toISOString() })
      .eq("id", contact.id);

    const { data: journey } = await admin
      .from("journeys")
      .select("client_name, agent_id")
      .eq("id", contact.journey_id)
      .maybeSingle();
    if (!journey) continue;

    const { data: agent } = await admin
      .from("users")
      .select("email")
      .eq("id", journey.agent_id)
      .maybeSingle();

    if (agent?.email) {
      try {
        await sendAgentEmail({
          to: agent.email,
          subject: `${contact.company_name} just set up their Lighthouse portal`,
          message: `${contact.company_name} just finished setting up their document portal login for ${journey.client_name}'s Journey.`,
        });
      } catch (err) {
        // Best-effort — the activation itself already succeeded above.
        Sentry.captureException(err);
      }
    }
  }
}
