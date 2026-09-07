/**
 * Dev-only user impersonation ("act as").
 *
 * Lets a local developer switch the current identity — to a domain POC, an
 * initiative owner, or someone with no access — without restarting the server,
 * so permission-gated flows (gate sign-offs, blocks, admin overrides) can be
 * exercised end to end.
 *
 * SAFETY: this must be impossible in production. The single source of truth for
 * "are we allowed to impersonate?" is `isDevImpersonationEnabled()` below. It is
 * checked in three independent places — the identity read path (`cf-auth.ts`),
 * the server action that sets the cookie (`dev-user-actions.ts`), and the
 * switcher UI (`components/dev/DevUserSwitcher.tsx`). Because Next.js inlines
 * `process.env.NODE_ENV` at build time, these `!== 'production'` branches are
 * dead-code-eliminated from the production bundle, so the impersonation code is
 * not merely hidden in prod — it is absent.
 */

/** Name of the cookie holding the impersonated email (session cookie, dev only). */
export const DEV_USER_COOKIE = 'assessy-dev-user';

/**
 * True only outside a production build/runtime. On Arrakis the container sets
 * `NODE_ENV=production` (Dockerfile) and runs `next start` (which forces it), so
 * this is always false there. Locally under `next dev` it is true.
 */
export function isDevImpersonationEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}
