import { notFound } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { ScoutMark } from '@/components/ScoutMark';
import { getRequestWithThread } from '@/lib/services/request-service';
import { displayPerson } from '@/lib/people-directory';
import { STATE_META } from '@/lib/taxonomy';

// The request record — "one record, whole lifecycle". The conversation thread,
// the immutable original submission, and (from week 3) Scout's triage brief all
// live here. This page is also the requester's status page: no separate portal.

function title(submission: string): string {
  const first = submission.split('\n')[0];
  return first.length > 90 ? `${first.slice(0, 87)}…` : first;
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getRequestWithThread(id);
  if (!request) notFound();

  const meta = STATE_META[request.state];

  return (
    <PageContainer narrow className="space-y-6">
      <PageHeader
        title={title(request.originalSubmission)}
        lede={
          <>
            Raised by {displayPerson(request.requesterEmail)}{' '}
            {formatDistanceToNowStrict(request.submittedAt)} ago
            {request.receivingDomain ? <> · receiving domain: {request.receivingDomain.name}</> : null}
          </>
        }
        actions={<Badge variant={meta.variant}>{meta.label}</Badge>}
      />

      {request.activeDisruption && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3">
          <p className="text-sm text-danger">
            Flagged as a live production issue — don&rsquo;t wait for triage; use the incident
            process. The triage team has been notified in parallel.
          </p>
        </div>
      )}

      {/* Conversation thread. Scout speaks with its mark; humans with their name. */}
      <section className="space-y-3">
        {request.messages.map((m) => (
          <div key={m.id} className="rounded-lg border bg-card px-4 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              {m.role === 'SCOUT' ? (
                <>
                  <ScoutMark size={18} />
                  <span className="text-xs font-medium text-muted-foreground">Scout</span>
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {m.role === 'REQUESTER' ? displayPerson(request.requesterEmail) : 'Triage'}
                </span>
              )}
              <span className="ml-auto text-2xs tabular-nums text-tertiary-foreground">
                {formatDistanceToNowStrict(m.createdAt)} ago
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.content}</p>
          </div>
        ))}
      </section>

      {/* The audit anchor: what was actually submitted, never edited. */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Original submission
          <span className="ml-2 font-normal normal-case text-tertiary-foreground">immutable</span>
        </h2>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {request.originalSubmission}
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
