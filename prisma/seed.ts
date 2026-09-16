import { PrismaClient, type RequestState } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';

const prisma = new PrismaClient();

// ─── Hive snapshot ────────────────────────────────────────────────────────────
//
// The domain catalogue and the initiative list are DATED IMPORTS of Hive's
// export (design §5.1: "Hive stays authoritative; never hand-rebuild this
// list"). The trimmed snapshot committed under prisma/data holds only the three
// tables Assessy reads — OrgUnit, DomainPOC, Initiative — so a fresh checkout
// seeds without the full export. To refresh: export from Hive, point
// HIVE_SNAPSHOT_PATH at it (or replace the file), re-run the seed.

const SNAPSHOT_PATH = resolve(
  process.env.HIVE_SNAPSHOT_PATH ?? 'prisma/data/hive-snapshot-2026-09-16.json',
);
const HIVE_APP_URL = (process.env.HIVE_APP_URL ?? 'https://hive.aisandbox.dev.ckotech.internal').replace(/\/$/, '');

type OrgUnit = {
  id: string;
  slug: string;
  kind: 'department' | 'pillar' | 'pnl' | 'domain';
  name: string;
  parentId: string | null;
  description: string | null;
  active: boolean;
  requiredForMcap: boolean;
};
type DomainPOC = { owningUnitSlug: string; domainSlug: string; pocEmail: string };
type Initiative = {
  id: string;
  title: string;
  owner: string;
  summary: string | null;
  description: string | null;
  phase: string;
  deletedAt: string | null;
};
type Snapshot = {
  exportedAt: string;
  exportedBy: string;
  tables: { OrgUnit: OrgUnit[]; DomainPOC: DomainPOC[]; Initiative: Initiative[] };
};

function loadSnapshot(): Snapshot {
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(`Hive snapshot not found at ${SNAPSHOT_PATH} — set HIVE_SNAPSHOT_PATH.`);
  }
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
}

// The Finance + FEX pilot domains (Hive slugs). Only these receive the
// ASSESSY_DEV_PILOT_OWNER placeholder, and only when Hive has no POC for them.
const PILOT_KEYS = new Set([
  'dom-accounting',
  'dom-treasury',
  'dom-tax',
  'dom-tprm',
  'dom-fi-fdp',
  'dom-fi-fa',
  'dom-fex-payout',
  'dom-fex-cba',
  'dom-fex-rev-ops',
  'dom-fex-sales-systems',
]);

// Hive's DomainPOC is a matrix: (owning unit × approval domain) → POC. Assessy
// routes by approval domain alone, so the catalogue takes the POC most owning
// units share. For most domains that is one person; where a domain names
// different POCs per owning unit (Data, Design, Product Legal, Product
// Marketing) the runner-up count is logged so the simplification is visible.
function approvalOwnerByDomain(pocs: DomainPOC[]): Map<string, { email: string; distinct: number }> {
  const tally = new Map<string, Map<string, number>>();
  for (const p of pocs) {
    const email = p.pocEmail.toLowerCase();
    const m = tally.get(p.domainSlug) ?? new Map<string, number>();
    m.set(email, (m.get(email) ?? 0) + 1);
    tally.set(p.domainSlug, m);
  }
  const out = new Map<string, { email: string; distinct: number }>();
  for (const [slug, m] of tally) {
    const [top] = [...m.entries()].sort((a, b) => b[1] - a[1]);
    out.set(slug, { email: top[0], distinct: m.size });
  }
  return out;
}

async function importDomainCatalogue(snap: Snapshot, devPilotOwner: string | null) {
  const units = new Map(snap.tables.OrgUnit.map((u) => [u.id, u]));
  const owners = approvalOwnerByDomain(snap.tables.DomainPOC);
  const effectiveDate = new Date(snap.exportedAt);
  const source = `Hive DomainPOC export ${snap.exportedAt.slice(0, 10)} (${snap.exportedBy})`;

  const domains = snap.tables.OrgUnit.filter((u) => u.kind === 'domain' && u.active);
  const keys = new Set<string>();
  let placeholders = 0;

  for (const d of domains) {
    const parent = d.parentId ? units.get(d.parentId) : undefined;
    let department = parent;
    while (department && department.kind !== 'department' && department.parentId) {
      department = units.get(department.parentId);
    }
    const poc = owners.get(d.slug);
    if (poc && poc.distinct > 1) {
      console.log(`  ${d.slug}: ${poc.distinct} POCs across owning units — catalogue takes ${poc.email}`);
    }
    let approvalOwnerEmail = poc?.email ?? null;
    if (!approvalOwnerEmail && devPilotOwner && PILOT_KEYS.has(d.slug)) {
      approvalOwnerEmail = devPilotOwner.toLowerCase();
      placeholders++;
    }

    keys.add(d.slug);
    const data = {
      name: d.name,
      description: d.description ?? '',
      department: department?.name ?? 'Unassigned',
      pillar: parent?.kind === 'pillar' ? parent.name : null,
      approvalOwnerEmail,
      effectiveDate,
      source,
    };
    await prisma.domainCatalogue.upsert({ where: { key: d.slug }, create: { key: d.slug, ...data }, update: data });
  }

  // Rows from an older import (or the pre-snapshot hand transcription) that
  // Hive no longer lists. Dropped only when nothing references them — a
  // referenced key stays and is reported, never silently orphaned.
  const stale = await prisma.domainCatalogue.findMany({
    where: { key: { notIn: [...keys] } },
    select: { key: true, _count: { select: { requests: true, engagements: true } } },
  });
  for (const s of stale) {
    if (s._count.requests + s._count.engagements > 0) {
      console.log(`  keeping stale domain ${s.key}: referenced by ${s._count.requests} request(s)`);
    } else {
      await prisma.domainCatalogue.delete({ where: { key: s.key } });
    }
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'domain-import',
      entityId: source,
      action: 'import',
      actor: 'seed',
      toValue: `${domains.length} active domains, ${owners.size} with a Hive POC, ${placeholders} dev placeholders`,
    },
  });
  console.log(`Imported ${domains.length} domains from Hive (${owners.size} with POC, ${placeholders} dev placeholder owners).`);
}

async function importInitiatives(snap: Snapshot) {
  const live = snap.tables.Initiative.filter((i) => !i.deletedAt);
  for (const i of live) {
    const data = {
      title: i.title,
      summary: (i.summary ?? i.description ?? '').trim(),
      ownerEmail: i.owner.toLowerCase(),
      sourceUrl: `${HIVE_APP_URL}/initiatives/${i.id}`,
      importedAt: new Date(snap.exportedAt),
    };
    await prisma.initiativeSnapshot.upsert({ where: { ref: i.id }, create: { ref: i.id, ...data }, update: data });
  }
  await prisma.initiativeSnapshot.deleteMany({ where: { ref: { notIn: live.map((i) => i.id) } } });
  await prisma.auditLog.create({
    data: {
      entityType: 'snapshot-import',
      entityId: `hive-${snap.exportedAt.slice(0, 10)}`,
      action: 'import',
      actor: 'seed',
      toValue: `${live.length} live initiatives (${snap.tables.Initiative.length - live.length} deleted skipped)`,
    },
  });
  console.log(`Imported ${live.length} live Hive initiatives for matching.`);
}

// ─── Dev fixtures ─────────────────────────────────────────────────────────────
//
// Sample requests from real directory people spanning the state machine, so
// every queue has content. Domain keys are Hive slugs. Applied only when
// ASSESSY_DEV_PILOT_OWNER is set (the local-dev signal); triage leads come from
// ASSESSY_TRIAGE_LEADS and domain owners from the import above.

type SeedRequest = {
  requester: string;
  need: string;
  state: RequestState;
  daysAgo: number;
  domainKey?: string;
  timing?: string;
  linkedInitiativeRef?: string;
  decision?: { by: string; reason: string; routingUrl?: string };
};

const DEV_REQUESTS: SeedRequest[] = [
  {
    requester: 'aman.khare@checkout.com',
    need: 'We need a monthly export of settled payout volumes by currency for the merchant health dashboard. Today Finance builds it by hand from three spreadsheets.',
    state: 'SUBMITTED',
    daysAgo: 1,
  },
  {
    requester: 'aanchal.mehdiratta@checkout.com',
    need: 'MENA merchants are asking for payout statements in Arabic. Is this something FEX can support, and what would it take?',
    state: 'CLARIFYING',
    daysAgo: 3,
    domainKey: 'dom-fex-payout',
  },
  {
    requester: 'ahana.chaudhuri@checkout.com',
    need: 'Treasury needs intraday liquidity positions per acquiring bank pulled into the planning model instead of the end-of-day file. Board pack deadline is quarter end.',
    state: 'AWAITING_DOMAIN_DECISION',
    daysAgo: 6,
    domainKey: 'dom-treasury',
    timing: 'Before quarter-end close',
  },
  {
    requester: 'alex.kalinin@checkout.com',
    need: 'Sales Systems: the Salesforce opportunity-to-contract sync drops the pricing tier field for enterprise deals, so RevOps re-keys it manually.',
    state: 'AWAITING_DOMAIN_DECISION',
    daysAgo: 4,
    domainKey: 'dom-fex-sales-systems',
  },
  {
    requester: 'agrata.garg@checkout.com',
    need: 'Vendor onboarding for the new FX liquidity provider — we need the TPRM assessment started so contracts can be signed this month.',
    state: 'AWAITING_DOMAIN_DECISION',
    daysAgo: 9,
    domainKey: 'dom-tprm',
    timing: 'Contract signature planned end of month',
  },
  {
    requester: 'aaron.loo@checkout.com',
    need: 'Payout files to our Singapore partner bank have been rejected since this morning — merchants are not getting paid.',
    state: 'ROUTED_TO_INCIDENT',
    daysAgo: 2,
    domainKey: 'dom-fex-payout',
    decision: {
      by: 'robert.onuma@checkout.com',
      reason: 'Live production issue — handed to the incident process; linked to INC-4821.',
      routingUrl: 'https://checkout.atlassian.net/browse/INC-4821',
    },
  },
  {
    requester: 'aisha.akram@checkout.com',
    need: 'Where do I find the current intercompany recharge rates? I need them for the Q3 accrual.',
    state: 'RESOLVED_SELF_SERVICE',
    daysAgo: 12,
    domainKey: 'dom-accounting',
    decision: {
      by: 'robert.onuma@checkout.com',
      reason: 'Answered from the Finance Ops knowledge base — no work required.',
      routingUrl: 'https://checkout.atlassian.net/wiki/spaces/FIN/pages/recharge-rates',
    },
  },
  {
    requester: 'abbasi.soni@checkout.com',
    need: 'Move all merchant pricing from flat blended rates to interchange-plus across EU and UK, with new invoice formats and a migration for existing contracts.',
    state: 'ADVANCED_TO_MCAP',
    daysAgo: 20,
    domainKey: 'dom-fex-cba',
    decision: {
      by: 'emmanuel.lawal@checkout.com',
      reason: 'Pricing-model change is an MCAP live-event type; registered in Hive by the initiative owner.',
      routingUrl: `${HIVE_APP_URL}/initiatives/new`,
    },
  },
  {
    requester: 'joseph.elchoueiri@checkout.com',
    need: 'Merchants want fee and cost breakdowns on the dashboard — is this already being built?',
    state: 'LINKED_TO_INITIATIVE',
    daysAgo: 8,
    domainKey: 'dom-merchant-services-product',
    // A live Hive initiative from the snapshot: "Customer Object & Analytics".
    linkedInitiativeRef: 'cmttysiwu000rqm0130jo0uaq',
    decision: {
      by: 'robert.onuma@checkout.com',
      reason: 'Same need as the Customer Object & Analytics initiative — linked rather than duplicated.',
      routingUrl: `${HIVE_APP_URL}/initiatives/cmttysiwu000rqm0130jo0uaq`,
    },
  },
  {
    requester: 'aditi.sharma@checkout.com',
    need: 'Can someone look at the reconciliation report? Some numbers look off.',
    state: 'RETURNED_FOR_INFO',
    daysAgo: 15,
    domainKey: 'dom-accounting',
    decision: {
      by: 'emmanuel.lawal@checkout.com',
      reason: 'Need the report name, period, and which figures diverge before this can be routed.',
    },
  },
];

const CAPTURE_ACK =
  "I've recorded your request — this page is its permanent record. " +
  'A human triage owner will review it; once my triage pipeline is switched on, ' +
  "my clarifying questions will arrive right here. I'll suggest a route — your domain team decides.";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Seeded requests are replaced wholesale on every run (they are fixtures, not
// data), so a change to a fixture or to the catalogue keys never leaves a
// half-updated set behind. Real requests (source !== 'seed') are untouched.
async function resetDevRequests() {
  const ids = (await prisma.request.findMany({ where: { source: 'seed' }, select: { id: true } })).map((r) => r.id);
  if (ids.length === 0) return;
  const where = { requestId: { in: ids } };
  await prisma.$transaction([
    prisma.evidenceLink.deleteMany({ where }),
    prisma.requestMessage.deleteMany({ where }),
    prisma.triageRecommendation.deleteMany({ where }),
    prisma.requestDomainEngagement.deleteMany({ where }),
    prisma.auditLog.deleteMany({ where }),
    prisma.request.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function seedDevRequests() {
  await resetDevRequests();

  for (const r of DEV_REQUESTS) {
    const submittedAt = daysAgo(r.daysAgo);
    const decidedAt = daysAgo(r.daysAgo - 1);
    await prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          source: 'seed',
          submittedAt,
          requesterEmail: r.requester,
          ownerEmail: r.requester,
          originalSubmission: r.need,
          structuredFacts: {
            need: { value: r.need, tag: 'known' },
            ...(r.timing ? { timing: { value: r.timing, tag: 'known' } } : {}),
          },
          state: r.state,
          receivingDomainKey: r.domainKey ?? null,
          linkedInitiativeRef: r.linkedInitiativeRef ?? null,
          ...(r.decision
            ? {
                decidedByEmail: r.decision.by,
                decisionReason: r.decision.reason,
                decidedAt,
                routingUrl: r.decision.routingUrl ?? null,
              }
            : {}),
        },
      });
      await tx.requestMessage.createMany({
        data: [
          { requestId: request.id, role: 'REQUESTER', content: r.need, createdAt: submittedAt },
          {
            requestId: request.id,
            role: 'SCOUT',
            content: CAPTURE_ACK,
            meta: { stage: 'capture' },
            createdAt: new Date(submittedAt.getTime() + 1000),
          },
        ],
      });
      await tx.auditLog.create({
        data: {
          entityType: 'request',
          entityId: request.id,
          requestId: request.id,
          action: 'create',
          actor: r.requester,
          toValue: 'SUBMITTED',
          createdAt: submittedAt,
        },
      });
      if (r.state !== 'SUBMITTED') {
        await tx.auditLog.create({
          data: {
            entityType: 'request',
            entityId: request.id,
            requestId: request.id,
            action: r.decision ? 'decision' : 'state-change',
            actor: r.decision?.by ?? 'seed',
            field: 'state',
            fromValue: 'SUBMITTED',
            toValue: r.state,
            createdAt: decidedAt,
          },
        });
      }
    });
  }
  const states = new Set(DEV_REQUESTS.map((r) => r.state)).size;
  console.log(`Seeded ${DEV_REQUESTS.length} dev requests across ${states} states.`);
}

async function main() {
  const devPilotOwner = process.env.ASSESSY_DEV_PILOT_OWNER || null;
  const snap = loadSnapshot();
  console.log(`Hive snapshot: ${SNAPSHOT_PATH} (exported ${snap.exportedAt} by ${snap.exportedBy})`);

  // Fixtures go first so a catalogue key they used to reference can be retired
  // by the import below rather than kept as "referenced".
  if (devPilotOwner) await resetDevRequests();

  await importDomainCatalogue(snap, devPilotOwner);
  await importInitiatives(snap);

  if (devPilotOwner) {
    await seedDevRequests();
    const leads = (process.env.ASSESSY_TRIAGE_LEADS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
    console.log(`Triage leads (from ASSESSY_TRIAGE_LEADS): ${leads.join(', ') || 'none set'}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
