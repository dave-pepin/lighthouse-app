import * as Sentry from "@sentry/nextjs";
import { unstable_rethrow } from "next/navigation";

// Every exported Server Action is wrapped in this. In production, Next.js
// replaces a thrown Server Action error's message with a generic "An error
// occurred in the Server Components render..." — so the reasons the
// actions give ("Too many attempts", "Enter a valid phone number", ...)
// never reached the person, and an uncaught one blanked the whole page.
// Instead, a thrown error comes back as { actionError: message }, which
// lib/runAction.js turns back into a normal thrown Error on the client.
//
// Only messages from a plain `new Error(...)` — the ones these actions
// write on purpose — are passed through. Anything else (a TypeError, a
// network failure) is an unexpected bug, so the person gets a generic
// message instead of internals. Either way it's still reported to Sentry,
// as it was when Next.js caught it (instrumentation.js's onRequestError).
// redirect()/notFound() are thrown as control flow and are re-thrown
// untouched.
export function withActionErrors(action) {
  return async (...args) => {
    try {
      return await action(...args);
    } catch (err) {
      unstable_rethrow(err);
      Sentry.captureException(err);
      const deliberate = err instanceof Error && err.constructor === Error && err.message;
      return { actionError: deliberate ? err.message : "Something went wrong. Please try again in a moment." };
    }
  };
}
