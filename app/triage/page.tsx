import { formatDistanceToNowStrict } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ListSection, ListRow, RowChevron, META } from '@/components/ListSection';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, canTriage } from '@/lib/permissions';
import { listOpenRequests } from '@/lib/services/request-service';
import { listRecentDecisions } from '@/lib/services/triage-service';
import { displayPerson } from '@/lib/people-directory';
import { STATE_META, REQUEST_TYPES } from '@/lib/taxonomy';

const TRACKS = 'grid grid-cols-[minmax(0,1fr)_120px_140px_150px_64px_16px] items-center gap-3';
const DECIDED_TRACKS = 'grid grid-cols-[minmax(0,1fr)_150px_190px_80px_16px] items-center gap-3';

// The triage-owner queue. Recommend-only v1: every request lands here for a
// human decision, taken on the record page; Scout's briefs (week 4) will
// pre-fill what the owner confirms there.

export default async function TriagePage() {
  const user = await getCurrentUser();

  if (!user || !canTriage(user)) {
    return (
      <PageContainer narrow>
        <PageHeader
          title="Triage"
          lede="This queue belongs to triage leads. If that should be you, ask for access — ASSESSY_TRIAGE_LEADS for the pilot."
        />
      </PageContainer>
    );
  }

  const [open, decided] = await Promise.all([listOpenRequests(), listRecentDecisions(10)]);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Triage"
        lede={
          open.length === 0
            ? 'The queue is clear.'
            : `${open.length} awaiting a decision — oldest first.`
        }
      />

      <ListSection
        title="Queue"
        count={open.length}
        tracks={TRACKS}
        columns={[{ left: 'Request' }, 'Requester', 'Type · domain', 'State', 'Age', null]}
      >
        {open.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={TRACKS}>
            <span className="truncate text-sm">{r.originalSubmission}</span>
            <span className={META}>{displayPerson(r.requesterEmail)}</span>
            <span className={META}>
              {r.validatedFinalType ? REQUEST_TYPES[r.validatedFinalType].label : 'Unclassified'}
              {r.receivingDomainKey ? ` · ${r.receivingDomainKey.replace(/^dom-/, '')}` : ''}
            </span>
            <span className="flex justify-end">
              <Badge variant={STATE_META[r.state].variant}>{STATE_META[r.state].label}</Badge>
            </span>
            <span className={META}>{formatDistanceToNowStrict(r.submittedAt)}</span>
            <RowChevron />
          </ListRow>
        ))}
      </ListSection>

      <ListSection
        title="Recently decided"
        count={decided.length}
        tracks={DECIDED_TRACKS}
        columns={[{ left: 'Request' }, 'Domain', 'Outcome', 'Decided', null]}
      >
        {decided.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={DECIDED_TRACKS}>
            <span className="truncate text-sm">{r.originalSubmission}</span>
            <span className={META}>{r.receivingDomain?.name ?? '—'}</span>
            <span className="flex justify-end">
              <Badge variant={STATE_META[r.state].variant}>{STATE_META[r.state].label}</Badge>
            </span>
            <span className={META}>{r.decidedAt ? formatDistanceToNowStrict(r.decidedAt) : ''}</span>
            <RowChevron />
          </ListRow>
        ))}
      </ListSection>
    </PageContainer>
  );
}
