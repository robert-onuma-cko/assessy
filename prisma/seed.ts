import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// ─── Domain catalogue ─────────────────────────────────────────────────────────
//
// Source: MCAP v1 §4.1 Approval Domains (Confluence page 8534098017, version of
// 12 Aug 2026), manually transcribed. This is a dated MIRROR — the live record
// in Hive is authoritative (D4: "Owners are not named in this document, as POCs
// change; the live record in Hive is authoritative"). Owners are therefore NOT
// seeded here; they arrive with the DomainPOC export, or — for local dev only —
// the ASSESSY_DEV_PILOT_OWNER env assigns the pilot domains a placeholder so
// the /my-work queue is exercisable.

const EFFECTIVE_DATE = new Date('2026-08-12');
const SOURCE = 'MCAP v1 §4.1 (Confluence 8534098017), transcribed 2026-08-31';

type DomainRow = { key: string; name: string; department: string; pillar?: string };

const DOMAINS: DomainRow[] = [
  // Finance
  { key: 'fin-accounting', name: 'Accounting', department: 'Finance' },
  { key: 'fin-treasury', name: 'Treasury', department: 'Finance' },
  { key: 'fin-tax', name: 'Tax', department: 'Finance' },
  { key: 'fin-tprm', name: 'TPRM', department: 'Finance' },
  // Operations
  { key: 'ops-risk-ops', name: 'Risk Ops', department: 'Operations' },
  { key: 'ops-merchant-ops', name: 'Merchant Ops', department: 'Operations' },
  { key: 'ops-excellence', name: 'Ops Excellence', department: 'Operations' },
  // Reliance
  { key: 'rel-product-legal', name: 'Product Legal', department: 'Reliance' },
  { key: 'rel-privacy', name: 'Privacy', department: 'Reliance' },
  { key: 'rel-compliance-fc', name: 'Compliance — FC Controls', department: 'Reliance' },
  { key: 'rel-compliance-advisory', name: 'Compliance — Advisory/MLRO', department: 'Reliance' },
  { key: 'rel-enterprise-risk', name: 'Enterprise Risk', department: 'Reliance' },
  { key: 'rel-financial-risk', name: 'Financial Risk', department: 'Reliance' },
  // Commercial
  { key: 'com-commercial', name: 'Commercial', department: 'Commercial' },
  { key: 'com-financial-partnerships', name: 'Financial Partnerships', department: 'Commercial' },
  // Marketing
  { key: 'mkt-product-marketing', name: 'Product Marketing (Buyer & Market)', department: 'Marketing' },
  // People
  { key: 'people', name: 'People', department: 'People' },
  // Product & Tech
  { key: 'pt-merchant-services', name: 'Merchant Services', department: 'Product & Tech' },
  { key: 'pt-cn-cpp', name: 'Core Network — CPP', department: 'Product & Tech', pillar: 'Core Network' },
  { key: 'pt-cn-open-banking', name: 'Core Network — Open Banking', department: 'Product & Tech', pillar: 'Core Network' },
  { key: 'pt-cn-apm', name: 'Core Network — APM', department: 'Product & Tech', pillar: 'Core Network' },
  { key: 'pt-pp-services', name: 'Payment Performance — Services', department: 'Product & Tech', pillar: 'Payment Performance' },
  { key: 'pt-pp-products', name: 'Payment Performance — Products', department: 'Product & Tech', pillar: 'Payment Performance' },
  { key: 'pt-ep-issuing', name: 'EP — Issuing', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-ep-idv', name: 'EP — IDV', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-ep-platforms', name: 'EP — Platforms', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-ep-onboarding', name: 'EP — Onboarding & Activation', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-ep-risk-compliance', name: 'EP — Risk & Compliance', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-ep-care', name: 'EP — Care', department: 'Product & Tech', pillar: 'EP' },
  { key: 'pt-consumer', name: 'Consumer', department: 'Product & Tech' },
  { key: 'pt-fi-financial-data-platform', name: 'FI — Financial Data Platform', department: 'Product & Tech', pillar: 'FI' },
  { key: 'pt-fi-financial-applications', name: 'FI — Financial Applications', department: 'Product & Tech', pillar: 'FI' },
  { key: 'pt-fex-payout', name: 'FEX — Payout', department: 'Product & Tech', pillar: 'FEX' },
  { key: 'pt-fex-cba', name: 'FEX — CBA', department: 'Product & Tech', pillar: 'FEX' },
  { key: 'pt-fex-rev-ops-automation', name: 'FEX — Rev Ops Automation', department: 'Product & Tech', pillar: 'FEX' },
  { key: 'pt-fex-sales-systems', name: 'FEX — Sales Systems', department: 'Product & Tech', pillar: 'FEX' },
  { key: 'pt-vas-authentication', name: 'VAS — Authentication', department: 'Product & Tech', pillar: 'VAS' },
  { key: 'pt-vas-agentic', name: 'VAS — Agentic', department: 'Product & Tech', pillar: 'VAS' },
  { key: 'pt-vas-secure-exchange', name: 'VAS — Secure & Exchange', department: 'Product & Tech', pillar: 'VAS' },
  { key: 'pt-vas-lifecycle', name: 'VAS — Lifecycle Enhancements', department: 'Product & Tech', pillar: 'VAS' },
  { key: 'pt-vas-orchestration', name: 'VAS — Orchestration', department: 'Product & Tech', pillar: 'VAS' },
  { key: 'pt-design', name: 'Design', department: 'Product & Tech' },
  { key: 'pt-data-analytics', name: 'Data Analytics', department: 'Product & Tech' },
  // Tech (controls)
  { key: 'tech-arb', name: 'ARB', department: 'Tech (controls)' },
  { key: 'tech-infosec', name: 'InfoSec', department: 'Tech (controls)' },
  { key: 'tech-operations', name: 'Operations (Tech)', department: 'Tech (controls)' },
  { key: 'tech-grc', name: 'GRC', department: 'Tech (controls)' },
];

// The Finance + FEX pilot domains — the only rows a dev-placeholder owner is
// applied to, and only when ASSESSY_DEV_PILOT_OWNER is set (local dev).
const PILOT_KEYS = new Set([
  'fin-accounting',
  'fin-treasury',
  'fin-tax',
  'fin-tprm',
  'pt-fi-financial-data-platform',
  'pt-fi-financial-applications',
  'pt-fex-payout',
  'pt-fex-cba',
  'pt-fex-rev-ops-automation',
  'pt-fex-sales-systems',
]);

async function main() {
  const devPilotOwner = process.env.ASSESSY_DEV_PILOT_OWNER || null;

  for (const d of DOMAINS) {
    const approvalOwnerEmail =
      devPilotOwner && PILOT_KEYS.has(d.key) ? devPilotOwner.toLowerCase() : null;
    await prisma.domainCatalogue.upsert({
      where: { key: d.key },
      create: {
        key: d.key,
        name: d.name,
        department: d.department,
        pillar: d.pillar ?? null,
        approvalOwnerEmail,
        effectiveDate: EFFECTIVE_DATE,
        source: SOURCE,
      },
      // Re-running the seed refreshes the mirror but must not clobber an owner
      // set by a real DomainPOC import — only the dev placeholder is applied.
      update: {
        name: d.name,
        department: d.department,
        pillar: d.pillar ?? null,
        effectiveDate: EFFECTIVE_DATE,
        source: SOURCE,
        ...(approvalOwnerEmail ? { approvalOwnerEmail } : {}),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'domain-import',
      entityId: 'mcap-v1-transcription',
      action: 'import',
      actor: 'seed',
      toValue: `${DOMAINS.length} domains, effective ${EFFECTIVE_DATE.toISOString().slice(0, 10)}`,
    },
  });

  console.log(`Seeded ${DOMAINS.length} domains (${devPilotOwner ? 'dev pilot owner set' : 'no owners — awaiting DomainPOC export'}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
