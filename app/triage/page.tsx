import { formatDistanceToNowStrict } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ListSection, ListRow, RowChevron, META } from '@/components/ListSection';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, canTriage } from '@/lib/permissions';
import { listOpenRequests } from '@/lib/services/request-service';
import { displayPerson } from '@/lib/people-directory';
import { STATE_META } from '@/lib/taxonomy';

const TRACKS = 'grid grid-cols-[minmax(0,1fr)_150px_170px_90px_16px] items-center gap-3';

// The triage-owner queue. Recommend-only v1: every request lands here for a
// human decision; Scout's briefs (week 4) will pre-fill what the owner
// confirms. Outcome picking arrives with the confirmation workflow (week 5).

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

  const open = await listOpenRequests();

  return (
    <PageContainer narrow className="space-y-6">
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
        columns={[{ left: 'Request' }, 'Requester', 'State', 'Age', null]}
      >
        {open.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={TRACKS}>
            <span className="truncate text-sm">{r.originalSubmission}</span>
            <span className={META}>{displayPerson(r.requesterEmail)}</span>
            <span className="flex justify-end">
              <Badge variant={STATE_META[r.state].variant}>{STATE_META[r.state].label}</Badge>
            </span>
            <span className={META}>{formatDistanceToNowStrict(r.submittedAt)}</span>
            <RowChevron />
          </ListRow>
        ))}
      </ListSection>
    </PageContainer>
  );
}
