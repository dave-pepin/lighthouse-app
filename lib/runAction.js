// Client-side half of lib/actionErrors.js. Server Actions report failure
// by returning { actionError } (a thrown one would have its message wiped
// in production); runAction turns that back into a thrown Error, here in
// the browser where the message survives, so callers can keep using
// try/catch and err.message.
//
//   const result = await runAction(saveSomething(id, value));
export async function runAction(promise) {
  let result;
  try {
    result = await promise;
  } catch (err) {
    // A redirect() from the action is Next.js control flow, not a failure.
    if (typeof err?.digest === "string" && err.digest.startsWith("NEXT_")) throw err;
    // Otherwise the call itself never completed — offline, or the server
    // fell over outside withActionErrors.
    throw new Error("Couldn't reach Lighthouse. Check your connection and try again.");
  }
  if (result && typeof result === "object" && "actionError" in result) {
    throw new Error(result.actionError);
  }
  return result;
}

// For actions fired without waiting on the result — mostly inside
// startTransition — where there's no form error spot to show a failure.
// It goes to the app-wide notice instead (components/ActionErrorNotice.js),
// rather than being silently dropped or blanking the page.
//
//   startTransition(() => fireAction(toggleMilestone(id, journeyId, done)));
export function fireAction(promise) {
  return runAction(promise).catch((err) => showActionError(err.message));
}

export function showActionError(message) {
  window.dispatchEvent(
    new CustomEvent("lh-action-error", {
      detail: message || "Something went wrong. Please try again in a moment.",
    })
  );
}
