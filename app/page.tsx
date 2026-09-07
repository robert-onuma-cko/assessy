import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ListSection, ListRow, RowChevron, META } from '@/components/ListSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/permissions';
import { listRequestsFor } from '@/lib/services/request-service';
import { STATE_META, isTerminal } from '@/lib/taxonomy';

const TRACKS = 'grid grid-cols-[minmax(0,1fr)_170px_90px_16px] items-center gap-3';

export default async function MyRequestsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer narrow>
        <PageHeader title="My requests" lede="Sign in to see your requests." />
      </PageContainer>
    );
  }

  const requests = await listRequestsFor(user.email);
  const open = requests.filter((r) => !isTerminal(r.state));
  const closed = requests.filter((r) => isTerminal(r.state));

  const lede =
    requests.length === 0
      ? 'Nothing here yet — tell Scout what you need and it becomes a tracked request.'
      : open.length > 0
        ? `${open.length} open — Scout and the triage team work them here.`
        : 'Everything you raised has a decision.';

  return (
    <PageContainer narrow className="space-y-6">
      <PageHeader
        title="My requests"
        lede={lede}
        actions={
          <Button asChild>
            <Link href="/requests/new">New request</Link>
          </Button>
        }
      />

      <ListSection title="Open" count={open.length} tracks={TRACKS}>
        {open.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={TRACKS}>
            <span className="truncate text-sm">{r.originalSubmission}</span>
            <span className="flex justify-end">
              <Badge variant={STATE_META[r.state].variant}>{STATE_META[r.state].label}</Badge>
            </span>
            <span className={META}>{formatDistanceToNowStrict(r.submittedAt)}</span>
            <RowChevron />
          </ListRow>
        ))}
      </ListSection>

      <ListSection title="Decided" count={closed.length} tracks={TRACKS}>
        {closed.map((r) => (
          <ListRow key={r.id} href={`/requests/${r.id}`} tracks={TRACKS}>
            <span className="truncate text-sm text-muted-foreground">{r.originalSubmission}</span>
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
