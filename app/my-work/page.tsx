import { formatDistanceToNowStrict } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ListSection, ListRow, RowChevron, META } from '@/components/ListSection';
import { getCurrentUser } from '@/lib/permissions';
import { listAwaitingDomainDecision } from '@/lib/services/request-service';
import { displayPerson } from '@/lib/people-directory';

const TRACKS = 'grid grid-cols-[minmax(0,1fr)_170px_150px_90px_16px] items-center gap-3';

// The domain-owner confirmation queue (Hive's My Work pattern). Requests land
// here once Scout's brief names a domain this user owns and a triage owner
// routes it — week 5's confirmation workflow populates it.

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer narrow>
        <PageHeader title="My work" lede="Sign in to see what is waiting on you." />
      </PageContainer>
    );
  }

  const awaiting = await listAwaitingDomainDecision(user.email);

  return (
    <PageContainer narrow className="space-y-6">
      <PageHeader
        title="My work"
        lede={
          awaiting.length === 0
            ? 'Nothing is waiting on you. Requests land here when a triage brief names a domain you own.'
            : `You owe ${awaiting.length} confirmation${awaiting.length === 1 ? '' : 's'} — the pilot SLA is two business days.`
        }
      />

      <ListSection
        title="Awaiting your confirmation"
        count={awaiting.length}
        tracks={TRACKS}
        columns={[{ left: 'Request' }, 'Domain', 'Requester', 'Age', null]}
      >
        {awaiting.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={TRACKS}>
            <span className="truncate text-sm">{r.originalSubmission}</span>
            <span className={META}>{r.receivingDomain?.name ?? '—'}</span>
            <span className={META}>{displayPerson(r.requesterEmail)}</span>
            <span className={META}>{formatDistanceToNowStrict(r.submittedAt)}</span>
            <RowChevron />
          </ListRow>
        ))}
      </ListSection>
    </PageContainer>
  );
}
