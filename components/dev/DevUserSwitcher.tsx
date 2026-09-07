import { prisma } from '@/lib/db';
import { getCurrentUser, triageLeads } from '@/lib/permissions';
import { displayPerson } from '@/lib/people-directory';
import { isDevImpersonationEnabled } from '@/lib/dev-impersonation';
import { DevUserSwitcherClient, type DevIdentity } from './DevUserSwitcherClient';

// Dev-only "act as" switcher (renders nothing in production; the branch is
// dead-code-eliminated there). Assessy's identities of interest: triage leads
// (env-configured for the pilot) and the domain approval owners from the
// mirrored catalogue — the two roles whose permission-gated flows need
// exercising. Typing in the client searches the full people directory, so an
// arbitrary requester is always reachable too.
export async function DevUserSwitcher() {
  if (!isDevImpersonationEnabled()) return null;

  const [current, ownedDomains] = await Promise.all([
    getCurrentUser(),
    prisma.domainCatalogue.findMany({
      where: { approvalOwnerEmail: { not: null } },
      select: { approvalOwnerEmail: true, delegateEmail: true },
    }),
  ]);

  const leads = triageLeads();

  const roleFor = (email: string): string[] => {
    const e = email.toLowerCase();
    const roles: string[] = [];
    if (leads.includes(e)) roles.push('Triage lead');
    if (
      ownedDomains.some(
        (d) => d.approvalOwnerEmail?.toLowerCase() === e || d.delegateEmail?.toLowerCase() === e,
      )
    ) {
      roles.push('Domain owner');
    }
    return roles;
  };

  const toIdentity = (email: string): DevIdentity => ({
    email: email.toLowerCase(),
    name: displayPerson(email) || email,
    roles: roleFor(email),
  });

  const dedupe = (emails: (string | null)[]) =>
    [...new Set(emails.filter((e): e is string => !!e).map((e) => e.toLowerCase()))]
      .sort()
      .map(toIdentity);

  return (
    <DevUserSwitcherClient
      current={current ? toIdentity(current.email) : null}
      isAdmin={!!current?.isTriageLead}
      groups={[
        { label: 'Triage leads', people: dedupe(leads) },
        {
          label: 'Domain approval owners',
          people: dedupe(ownedDomains.flatMap((d) => [d.approvalOwnerEmail, d.delegateEmail])),
        },
      ]}
    />
  );
}
