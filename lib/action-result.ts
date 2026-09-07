import { unstable_rethrow } from 'next/navigation';
import { ForbiddenError } from './permissions';

// The result shape a write action reports to the client. Failure always carries
// a human-readable message and a `forbidden` flag so the UI can say "you can't
// do this" vs. show a validation reason. Actions that return richer success data
// (e.g. runAiCheck) keep their own inline type; this covers the common case.
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; forbidden?: boolean };

// Wrap a server-action body so a thrown error becomes a structured result.
//
// Why: requirePermission() and service validation throw *outside* the try/catch
// most actions have, so a blocked write escapes as an unhandled Server Action
// rejection (and its message is redacted in production). wrapAction catches the
// throw and turns it into { ok: false, error, forbidden } that survives to the
// client. A body that returns void is treated as success; a body that already
// returns an ActionResult passes through unchanged.
//
// Do NOT use this around actions that call redirect()/notFound() as their happy
// path — Next signals those by throwing, and unstable_rethrow re-throws them so
// control flow still works if one slips through.
// Generic over the success payload so an action can report richer success data
// (e.g. "the link saved but we couldn't read the document") without giving up the
// throw-to-result safety. A body returning void still resolves to { ok: true },
// so every existing caller is unchanged.
export async function wrapAction<T extends ActionResult = ActionResult>(
  fn: () => Promise<T | void>,
): Promise<T | ActionResult> {
  try {
    const result = await fn();
    return result ?? { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    return {
      ok: false,
      error: err instanceof Error && err.message ? err.message : 'Something went wrong.',
      forbidden: err instanceof ForbiddenError,
    };
  }
}
