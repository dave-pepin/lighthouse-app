"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { sendAgentEmail } from "@/lib/notify";

// Mints a one-time signed upload URL for a title company contact — same
// admin-mediated pattern as getClientDocumentUploadUrl
// (app/client/portal/actions.js), for the same reason: the "documents"
// bucket's access rules are dashboard-configured and untracked here, so
// this sidesteps depending on their exact wording entirely rather than
// granting a direct RLS storage.objects INSERT policy.
export async function getTitleCompanyDocumentUploadUrl(journeyId, fileName) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: contact } = await supabase
    .from("title_company_contacts")
    .select("id")
    .eq("journey_id", journeyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!contact) {
    throw new Error("You don't have access to this Journey.");
  }

  const path = `${journeyId}/${Date.now()}-${fileName.replace(/[^a-z0-9.\-_]+/gi, "_")}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(path);
  if (error) {
    throw new Error(error.message);
  }

  return { path, token: data.token };
}

// Records the file just uploaded to the signed URL above. Ownership is
// re-verified here (not just trusted from getTitleCompanyDocumentUploadUrl)
// since this is a separate call made after the actual upload succeeds —
// same shape as fulfillDocumentRequest.
export async function recordTitleCompanyDocument(journeyId, fileName, storagePath) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: contact } = await supabase
    .from("title_company_contacts")
    .select("id, company_name, journeys!inner(agent_id)")
    .eq("journey_id", journeyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!contact) return;

  const admin = createAdminClient();

  const { error: docError } = await admin
    .from("documents")
    .insert({ journey_id: journeyId, name: fileName, storage_path: storagePath, uploaded_by: "title_company" });
  if (docError) {
    throw new Error(docError.message);
  }

  const { data: agent } = await admin.from("users").select("email").eq("id", contact.journeys.agent_id).single();
  if (agent?.email) {
    try {
      await sendAgentEmail({
        to: agent.email,
        subject: "New document uploaded by a title company",
        message: `${contact.company_name} just uploaded a document to one of your Journeys. Check the Journey page to view it.`,
      });
    } catch (err) {
      // Don't let a notification failure stop the upload from counting.
      Sentry.captureException(err);
    }
  }

  revalidatePath("/title/portal");
}
