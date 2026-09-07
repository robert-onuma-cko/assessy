import { getAuthenticatedEmail } from '@/lib/cf-auth';
import { prisma } from '@/lib/db';

// Authorization vocabulary, mirroring the Hive prototype's pattern: pure-ish
// predicates here, enforced in every server action via requireActor +
// requirePermission (an action is a public HTTP endpoint — the UI using the
// same predicates to show/hide is a courtesy, never the gate).

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export type CurrentUser = {
  email: string;
  isTriageLead: boolean;
};

// Triage leads come from env for the pilot (design §8: day-to-day arbitration
// is delegated to a named triage lead). A DB-backed role table arrives with the
// real DomainPOC import; env keeps week 1 free of role-admin UI.
export function triageLeads(): string[] {
  return (process.env.ASSESSY_TRIAGE_LEADS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const email = await getAuthenticatedEmail();
  if (!email) return null;
  return { email, isTriageLead: triageLeads().includes(email) };
}

export async function requireActor(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError('Sign in required.');
  return user;
}

export function requirePermission(allowed: boolean, message = 'Forbidden'): void {
  if (!allowed) throw new ForbiddenError(message);
}

/** Triage leads work the /triage queue and pick terminal outcomes. */
export function canTriage(user: CurrentUser): boolean {
  return user.isTriageLead;
}

/**
 * Domain approval owners (or their delegates) confirm receiving-domain
 * assignments for their own domain. Reads the mirrored catalogue — the live
 * register in Hive is authoritative; this mirror is a dated import.
 */
export async function canConfirmDomain(user: CurrentUser, domainKey: string): Promise<boolean> {
  const domain = await prisma.domainCatalogue.findUnique({ where: { key: domainKey } });
  if (!domain) return false;
  const e = user.email.toLowerCase();
  return (
    domain.approvalOwnerEmail?.toLowerCase() === e ||
    domain.delegateEmail?.toLowerCase() === e
  );
}

/** Reference-data admin (/admin): triage leads for the pilot. */
export function canAdminReference(user: CurrentUser): boolean {
  return user.isTriageLead;
}
