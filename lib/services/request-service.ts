import { prisma } from '@/lib/db';
import { TERMINAL_STATES } from '@/lib/taxonomy';
import { extractDocText } from '@/lib/doc-extractors';
import type { DocLink } from '@/lib/doc-links';
import type { Prisma } from '@prisma/client';

// All Request writes live here (AGENTS.md: services own writes; actions are
// thin). Every write appends an AuditLog row in the same transaction.

export type NewRequestInput = {
  requesterEmail: string;
  need: string;
  // Already validated by normalizeDocLink at the action boundary.
  evidenceLinks?: DocLink[];
  neededBy?: string; // yyyy-MM-dd
  dateDriver?: string;
  source?: string;
};

// Stage 0 is deterministic and honest about what is not yet running: the AI
// pipeline arrives in week 3, so Scout's capture acknowledgement says a human
// reviews meanwhile — Scout never pretends to a capability it doesn't have.
const CAPTURE_ACK =
  "I've recorded your request — this page is its permanent record. " +
  'A human triage owner will review it; once my triage pipeline is switched on, ' +
  "my clarifying questions will arrive right here. I'll suggest a route — your domain team decides.";

export async function createRequest(input: NewRequestInput): Promise<string> {
  const need = input.need.trim();
  if (!need) throw new Error('Description is required.');
  const requesterEmail = input.requesterEmail.toLowerCase();

  // Facts extracted deterministically at capture, each tagged with provenance.
  // The AI extraction stage (week 3) replaces/extends this shape, never the
  // original submission.
  const structuredFacts: Prisma.JsonObject = {
    need: { value: need, tag: 'known' },
    ...(input.evidenceLinks?.length
      ? { evidenceLinks: { value: input.evidenceLinks.map((l) => l.url), tag: 'known' } }
      : {}),
    ...(input.neededBy ? { neededBy: { value: input.neededBy, tag: 'known' } } : {}),
    ...(input.dateDriver?.trim() ? { dateDriver: { value: input.dateDriver.trim(), tag: 'known' } } : {}),
  };

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.create({
      data: {
        source: input.source ?? 'app',
        requesterEmail,
        ownerEmail: requesterEmail,
        originalSubmission: need,
        structuredFacts,
      },
    });
    if (input.evidenceLinks?.length) {
      await tx.evidenceLink.createMany({
        data: input.evidenceLinks.map((l) => ({ requestId: request.id, url: l.url, provider: l.provider })),
      });
    }
    await tx.requestMessage.create({
      data: { requestId: request.id, role: 'REQUESTER', content: need },
    });
    await tx.requestMessage.create({
      data: {
        requestId: request.id,
        role: 'SCOUT',
        content: CAPTURE_ACK,
        meta: { stage: 'capture' },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: 'request',
        entityId: request.id,
        requestId: request.id,
        action: 'create',
        actor: requesterEmail,
        toValue: 'SUBMITTED',
      },
    });
    return request.id;
  });
}

// Read every attached document we have a provider for and cache its plain
// text on the link row. Runs AFTER capture so a slow or failing fetch can never
// lose a submission; a link we cannot read is kept with the reason, never
// dropped. Each outcome is audited so the record shows what Scout could see.
export async function extractEvidence(requestId: string): Promise<void> {
  const links = await prisma.evidenceLink.findMany({
    where: { requestId, extractedAt: null, failureReason: null },
  });
  for (const link of links) {
    const r = await extractDocText(link.url);
    await prisma.$transaction([
      prisma.evidenceLink.update({
        where: { id: link.id },
        data: r.ok
          ? { extractedText: r.text, extractedAt: new Date(), provider: r.provider }
          : { failureReason: r.reason, failureDetail: ('detail' in r && r.detail) || null },
      }),
      prisma.auditLog.create({
        data: {
          entityType: 'evidence-link',
          entityId: link.id,
          requestId,
          action: r.ok ? 'extract' : 'extract-failed',
          actor: 'scout',
          field: 'url',
          toValue: r.ok ? `${r.provider}: ${r.text.length} chars` : r.reason,
        },
      }),
    ]);
  }
}

const REPLY_ACK =
  "Noted — I've added that to your record. The triage team sees everything in this thread; " +
  "once my triage pipeline is switched on, I'll ask any clarifying questions right here.";
const REOPEN_ACK =
  'Thanks — your reply reopens the request, so it is back with the triage team for review.';

// A human message on the thread. A requester's reply to a request that was
// returned for information reopens it (design §4.2: "reversed by any reply").
// Scout acknowledges every reply with what will actually happen — never a
// capability it doesn't have yet.
export async function addMessage(input: {
  requestId: string;
  actorEmail: string;
  role: 'REQUESTER' | 'TRIAGE';
  content: string;
}): Promise<void> {
  const content = input.content.trim();
  if (!content) throw new Error('Message is required.');
  const actor = input.actorEmail.toLowerCase();

  await prisma.$transaction(async (tx) => {
    const request = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { state: true },
    });
    await tx.requestMessage.create({ data: { requestId: input.requestId, role: input.role, content } });
    await tx.auditLog.create({
      data: {
        entityType: 'request',
        entityId: input.requestId,
        requestId: input.requestId,
        action: 'message',
        actor,
        field: 'thread',
        toValue: input.role,
      },
    });

    const reopens = input.role === 'REQUESTER' && request.state === 'RETURNED_FOR_INFO';
    if (reopens) {
      await tx.request.update({ where: { id: input.requestId }, data: { state: 'CLARIFYING' } });
      await tx.auditLog.create({
        data: {
          entityType: 'request',
          entityId: input.requestId,
          requestId: input.requestId,
          action: 'reopen',
          actor,
          field: 'state',
          fromValue: 'RETURNED_FOR_INFO',
          toValue: 'CLARIFYING',
        },
      });
    }
    if (input.role === 'REQUESTER') {
      await tx.requestMessage.create({
        data: {
          requestId: input.requestId,
          role: 'SCOUT',
          content: reopens ? REOPEN_ACK : REPLY_ACK,
          meta: { stage: 'capture' },
        },
      });
    }
  });
}

export async function listRequestsFor(email: string) {
  return prisma.request.findMany({
    where: { OR: [{ requesterEmail: email.toLowerCase() }, { ownerEmail: email.toLowerCase() }] },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function listOpenRequests() {
  return prisma.request.findMany({
    where: { state: { notIn: [...TERMINAL_STATES] } },
    orderBy: { submittedAt: 'asc' },
  });
}

export async function getRequestWithThread(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      evidenceLinks: { orderBy: { createdAt: 'asc' } },
      receivingDomain: true,
      engagements: { include: { domain: { select: { name: true } } } },
      recommendations: { orderBy: { version: 'desc' } },
    },
  });
}

export async function listAwaitingDomainDecision(ownerEmail: string) {
  const e = ownerEmail.toLowerCase();
  return prisma.request.findMany({
    where: {
      state: 'AWAITING_DOMAIN_DECISION',
      receivingDomain: {
        OR: [{ approvalOwnerEmail: e }, { delegateEmail: e }],
      },
    },
    orderBy: { submittedAt: 'asc' },
    include: { receivingDomain: true },
  });
}
