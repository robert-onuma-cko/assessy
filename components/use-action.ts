'use client';

import { useCallback, useTransition } from 'react';
import { toast } from 'sonner';

// A failure result we know how to surface. Actions may return anything (void,
// a verdict object, { ok, error, forbidden }); we only treat a value as a
// failure when it's an object with `ok === false`.
type FailureResult = { ok: false; error?: string; forbidden?: boolean };

function isFailure(result: unknown): result is FailureResult {
  return typeof result === 'object' && result !== null && 'ok' in result && (result as { ok: unknown }).ok === false;
}

const FORBIDDEN_MESSAGE = "You don't have permission to do that.";
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

// Run a server action inside a transition and surface any failure as a toast
// instead of crashing the page. A blocked or failed write returns
// { ok: false, error, forbidden }; a stray throw inside a transition would
// otherwise bubble to the route error boundary (per Next error-handling docs),
// so we also catch here. Use this for every write-triggering control.
export function useAction() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (
      action: () => Promise<unknown>,
      // onError lets a caller that showed the result optimistically put it back:
      // the confirm sheet's checkbox flips first and has to un-flip if the write
      // is refused (P5c).
      opts?: { onSuccess?: () => void; onError?: () => void; errorMessage?: string; successMessage?: string },
    ) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (isFailure(result)) {
            // Prefer a specific message from the action; fall back to the
            // friendly permission line for a bare "Forbidden", else generic.
            const hasSpecific = result.error && result.error !== 'Forbidden';
            const message = hasSpecific
              ? result.error!
              : result.forbidden
                ? FORBIDDEN_MESSAGE
                : opts?.errorMessage || GENERIC_MESSAGE;
            toast.error(message);
            opts?.onError?.();
            return;
          }
          if (opts?.successMessage) toast.success(opts.successMessage);
          opts?.onSuccess?.();
        } catch {
          toast.error(opts?.errorMessage ?? GENERIC_MESSAGE);
          opts?.onError?.();
        }
      });
    },
    [],
  );

  return { run, pending };
}
