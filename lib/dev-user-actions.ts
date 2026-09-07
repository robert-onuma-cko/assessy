'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEV_USER_COOKIE, isDevImpersonationEnabled } from '@/lib/dev-impersonation';

// A server action is a public HTTP endpoint — 'use server' is not authorization.
// So we re-check the prod gate here rather than trust that the UI is hidden.
function assertDevOnly() {
  if (!isDevImpersonationEnabled()) {
    throw new Error('Dev user switching is disabled outside local development.');
  }
}

// Normalize + bound untrusted input at the boundary. We don't restrict to the
// people directory: seeded domain POCs may be outside it, and switching to an
// arbitrary (roleless) email is a valid "someone irrelevant" test.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Set (or clear, with null) the impersonated identity for local dev.
 * Cleared → identity falls back to ASSESSY_DEV_EMAIL.
 */
export async function setDevUser(email: string | null): Promise<void> {
  assertDevOnly();
  const store = await cookies();

  if (!email) {
    store.delete(DEV_USER_COOKIE);
    revalidatePath('/', 'layout');
    return;
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    throw new Error(`Not a valid email: ${email}`);
  }

  store.set(DEV_USER_COOKIE, normalized, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Session cookie (no maxAge): clears when the browser closes.
  });
  revalidatePath('/', 'layout');
}
