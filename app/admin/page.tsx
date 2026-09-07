import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ListSection, ListRow, META } from '@/components/ListSection';
import { prisma } from '@/lib/db';
import { getCurrentUser, canAdminReference } from '@/lib/permissions';
import { displayPerson } from '@/lib/people-directory';

const TRACKS = 'grid grid-cols-[minmax(0,1fr)_170px_190px] items-center gap-3';

// Reference data: the mirrored domain catalogue (Hive is authoritative — this
// shows which dated export is loaded), the KB, and initiative snapshots. The
// KB and snapshot imports arrive with weeks 3–4; their counts render now so an
// empty corpus is visible, not silent.

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !canAdminReference(user)) {
    return (
      <PageContainer narrow>
        <PageHeader title="Admin" lede="Reference data is managed by triage leads." />
      </PageContainer>
    );
  }

  const [domains, kbCount, snapshotCount] = await Promise.all([
    prisma.domainCatalogue.findMany({ orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.kbEntry.count(),
    prisma.initiativeSnapshot.count(),
  ]);

  const effective = domains[0]?.effectiveDate;
  const source = domains[0]?.source;

  return (
    <PageContainer narrow className="space-y-6">
      <PageHeader
        title="Admin"
        lede={
          <>
            {domains.length} domains mirrored
            {effective ? <> · effective {effective.toISOString().slice(0, 10)}</> : null}
            {source ? <> · {source}</> : null} · {kbCount} KB entries · {snapshotCount} initiative
            snapshots. The live domain register in Hive is authoritative — never hand-edit the
            mirror.
          </>
        }
      />

      <ListSection
        title="Domain catalogue"
        count={domains.length}
        tracks={TRACKS}
        columns={[{ left: 'Domain' }, 'Department', 'Approval owner']}
      >
        {domains.map((d) => (
          <ListRow key={d.key} tracks={TRACKS}>
            <span className="truncate text-sm">{d.name}</span>
            <span className={META}>{d.department}</span>
            <span className={META}>
              {d.approvalOwnerEmail ? displayPerson(d.approvalOwnerEmail) : 'awaiting export'}
            </span>
          </ListRow>
        ))}
      </ListSection>
    </PageContainer>
  );
}
