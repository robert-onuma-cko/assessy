import { notFound } from 'next/navigation';
import { format, formatDistanceToNowStrict, parse } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { LinkSimple } from '@phosphor-icons/react/dist/ssr';
import { getRequestWithThread } from '@/lib/services/request-service';
import { getCurrentUser, canTriage, decisionRoleFor } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { StatusSpine } from '@/components/StatusSpine';

import { displayPerson } from '@/lib/people-directory';
import { STATE_META, REQUEST_TYPES } from '@/lib/taxonomy';
import { displayDocUrl, docLinkBadge } from '@/lib/doc-links';
import { RequestThread, type ThreadMessage } from './RequestThread';

// The request record — "one record, whole lifecycle" — laid out as the
// conversation it is: the thread with Scout is the page, and a composer sits
// at the bottom so clarification happens ON the record (design §3.2). The
// requester and the original submission are the thread's first message, so
// only what the chat cannot show (status, domain, date, evidence, decision)
// sits in the header.

function title(submission: string): string {
  const first = submission.split('\n')[0];
  return first.length > 70 ? `${first.slice(0, 67)}…` : first;
}

type Fact = { value: unknown; tag: string };
function fact(facts: unknown, key: string): string | null {
  const f = (facts as Record<string, Fact> | null)?.[key];
  return typeof f?.value === 'string' && f.value ? f.value : null;
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [request, user] = await Promise.all([getRequestWithThread(id), getCurrentUser()]);
  if (!request) notFound();

  const meta = STATE_META[request.state];
  const isRequester = !!user && [request.requesterEmail, request.ownerEmail].includes(user.email);
  const viewerRole = isRequester ? 'REQUESTER' : user && canTriage(user) ? 'TRIAGE' : null;
  const decisionRole = user ? await decisionRoleFor(user, request) : null;
  const [domains, initiatives] = decisionRole
    ? await Promise.all([
        prisma.domainCatalogue.findMany({
          orderBy: [{ department: 'asc' }, { name: 'asc' }],
          select: { key: true, name: true, department: true, approvalOwnerEmail: true },
        }),
        prisma.initiativeSnapshot.findMany({ orderBy: { title: 'asc' }, select: { ref: true, title: true } }),
      ])
    : [[], []];
  // A triage question, not a triage decision — decisions also post as TRIAGE.
  const everClarified =
    request.state === 'CLARIFYING' ||
    request.messages.some((m) => m.role === 'TRIAGE' && !(m.meta as { decision?: string } | null)?.decision);

  const messages: ThreadMessage[] = request.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
    authorName:
      m.role === 'SCOUT' ? 'Scout' : m.role === 'REQUESTER' ? displayPerson(request.requesterEmail) : 'Triage team',
    authorEmail: m.role === 'REQUESTER' ? request.requesterEmail : null,
  }));

  const neededBy = fact(request.structuredFacts, 'neededBy');
  const dateDriver = fact(request.structuredFacts, 'dateDriver');

  const ledeParts: React.ReactNode[] = [
    <>Raised by {displayPerson(request.requesterEmail)} {formatDistanceToNowStrict(request.submittedAt)} ago</>,
  ];
  if (request.validatedFinalType) ledeParts.push(<>{REQUEST_TYPES[request.validatedFinalType].label}</>);
  if (request.receivingDomain) ledeParts.push(<>receiving domain: {request.receivingDomain.name}</>);
  if (request.initiativeIndicatorFlag) ledeParts.push(<span className="text-warning">indicator flag set — potential MCAP</span>);
  if (neededBy) {
    ledeParts.push(
      <>
        needed by {format(parse(neededBy, 'yyyy-MM-dd', new Date()), 'd MMM yyyy')}
        {dateDriver ? ` (${dateDriver})` : ''}
      </>,
    );
  }

  return (
    <PageContainer narrow className="space-y-4">
      <PageHeader
        title={title(request.originalSubmission)}
        lede={ledeParts.map((part, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {part}
          </span>
        ))}
        actions={<Badge variant={meta.variant}>{meta.label}</Badge>}
      />

      <StatusSpine state={request.state} everClarified={everClarified} />


      {(request.evidenceLinks.length > 0 || request.decisionReason) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {request.evidenceLinks.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
              title={`${l.url} — ${docLinkBadge(l.provider, !!l.extractedAt)}`}
              className="inline-flex max-w-72 items-center gap-1 truncate text-primary hover:underline"
            >
              <LinkSimple className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{displayDocUrl(l.url)}</span>
            </a>
          ))}
          {request.decisionReason && (
            <span>
              Decision{request.decidedByEmail ? ` by ${displayPerson(request.decidedByEmail)}` : ''}: {request.decisionReason}
              {request.routingUrl && (
                <>
                  {' '}
                  <a href={request.routingUrl} className="text-primary hover:underline">
                    {displayDocUrl(request.routingUrl)}
                  </a>
                </>
              )}
            </span>
          )}
        </div>
      )}

      <RequestThread
        requestId={request.id}
        messages={messages}
        viewerRole={viewerRole}
        viewerName={user ? displayPerson(user.email) : ''}
        viewerEmail={user?.email ?? ''}
        guide={
          decisionRole
            ? {
                role: decisionRole,
                request: {
                  id: request.id,
                  state: request.state,
                  validatedFinalType: request.validatedFinalType,
                  receivingDomainKey: request.receivingDomainKey,
                  initiativeIndicatorFlag: request.initiativeIndicatorFlag,
                },
                domains: domains.map((d) => ({
                  key: d.key,
                  name: d.name,
                  department: d.department,
                  ownerName: d.approvalOwnerEmail ? displayPerson(d.approvalOwnerEmail) : null,
                })),
                initiatives,
              }
            : null
        }
      />
    </PageContainer>
  );
}
