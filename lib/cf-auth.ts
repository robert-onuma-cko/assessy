import { cookies, headers } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { DEV_USER_COOKIE, isDevImpersonationEnabled } from '@/lib/dev-impersonation';

function parseJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (cachedJWKS) return cachedJWKS;
  const issuer = process.env.OKTA_ISSUER_URL;
  if (!issuer) return null;
  cachedJWKS = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/v1/keys`));
  return cachedJWKS;
}

/**
 * Returns the lower-cased email of the currently authenticated user, or null.
 *
 * The CKO AI Sandbox (Arrakis) Okta sidecar authenticates the request, STRIPS any
 * inbound x-auth-proxy-* header from the client, and re-injects its own from the
 * validated session/token. That stripping is the anti-spoofing guarantee, so the
 * x-auth-proxy-* headers below are trustworthy — a client-supplied copy never
 * reaches us. We therefore trust only the headers the sidecar actually sets.
 *
 * Resolution order (first hit wins):
 *   1. x-auth-proxy-user — verified email injected by the sidecar.
 *   2. Bearer JWT in Authorization header — verified against Okta JWKS. Only the
 *      gate when access control is OFF (standalone MCP); with it on, the sidecar
 *      validates + strips the Bearer and we get x-auth-proxy-user instead.
 *   3. x-auth-proxy-jwt header — raw Okta token the sidecar already validated
 *      (decoded for its claims, not re-verified — the sidecar's check is the gate).
 *   4. Dev impersonation (non-production only):
 *      4a. assessy-dev-user cookie — set by the in-app dev user switcher.
 *      4b. ASSESSY_DEV_EMAIL — static local dev fallback.
 */
export async function getAuthenticatedEmail(): Promise<string | null> {
  const hdrs = await headers();

  // 1. Sidecar-forwarded email header — the one header the sidecar guarantees and
  //    strips-then-reinjects. We intentionally do NOT accept x-auth-email /
  //    x-forwarded-email / x-okta-email: the sidecar never sets them, so they could
  //    only arrive from a client (and are stripped anyway) — trusting them is pure
  //    attack surface.
  const fromHeader = hdrs.get('x-auth-proxy-user');
  if (fromHeader) return fromHeader.toLowerCase();

  // 2. Bearer JWT in Authorization header
  const auth = hdrs.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice('bearer '.length).trim();
    const jwks = getJWKS();
    if (jwks) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: process.env.OKTA_ISSUER_URL || undefined,
          audience: process.env.OKTA_AUDIENCE || undefined,
        });
        if (typeof payload.email === 'string') return payload.email.toLowerCase();
      } catch {
        // fall through
      }
    } else {
      const payload = parseJwtPayload(token);
      if (payload && typeof payload.email === 'string') return payload.email.toLowerCase();
    }
  }

  // 3. Sidecar-forwarded JWT header
  const proxyJwt = hdrs.get('x-auth-proxy-jwt');
  if (proxyJwt) {
    const payload = parseJwtPayload(proxyJwt);
    if (payload && typeof payload.email === 'string') return payload.email.toLowerCase();
  }

  // 4. Dev impersonation (non-production only). Dead-code-eliminated in prod
  //    builds because NODE_ENV is inlined — see lib/dev-impersonation.ts (so
  //    cookies() below is never even reached in production).
  if (isDevImpersonationEnabled()) {
    const cookieStore = await cookies();
    // 4a. In-app switcher cookie takes precedence over the static fallback.
    const devUser = cookieStore.get(DEV_USER_COOKIE);
    if (devUser?.value) return devUser.value.toLowerCase();

    // 4b. Static env fallback.
    const devEmail = process.env.ASSESSY_DEV_EMAIL;
    if (devEmail) return devEmail.toLowerCase();
  }

  return null;
}
