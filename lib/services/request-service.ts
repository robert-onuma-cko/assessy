import { prisma } from '@/lib/db';
import { TERMINAL_STATES } from '@/lib/taxonomy';
import type { Prisma } from '@prisma/client';

// All Request writes live here (AGENTS.md: services own writes; actions are
// thin). Every write appends an AuditLog row in the same transaction.

export type NewRequestInput = {
  requesterEmail: string;
  need: string;
  activeDisruption: boolean;
  evidenceLinks?: string;
  timing?: string;
  source?: string;
};

// Stage 0 is deterministic and honest about what is not yet running: the AI
// pipeline arrives in week 3, so Scout's capture acknowledgement says a human
// reviews meanwhile — Scout never pretends to a capability it doesn't have.
const CAPTURE_ACK =
  "I've recorded your request — this page is its permanent record. " +
  'A human triage owner will review it; once my triage pipeline is switched on, ' +
  "my clarifying questions will arrive right here. I'll suggest a route — your domain team decides.";

const INCIDENT_ACK =
  'This sounds like a live production issue, so please don’t wait for triage: ' +
  'raise it through the incident process now. I’ve flagged your request to the ' +
  'triage team in parallel, and it will be linked to the incident once one exists.';

export async function createRequest(input: NewRequestInput): Promise<string> {
  const need = input.need.trim();
  if (!need) throw new Error('Description is required.');
  const requesterEmail = input.requesterEmail.toLowerCase();

  // Facts extracted deterministically at capture, each tagged with provenance.
  // The AI extraction stage (week 3) replaces/extends this shape, never the
  // original submission.
  const structuredFacts: Prisma.JsonObject = {
    need: { value: need, tag: 'known' },
    activeDisruption: { value: input.activeDisruption, tag: 'known' },
    ...(input.evidenceLinks?.trim()
      ? { evidenceLinks: { value: input.evidenceLinks.trim(), tag: 'known' } }
      : {}),
    ...(input.timing?.trim() ? { timing: { value: input.timing.trim(), tag: 'known' } } : {}),
  };

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.create({
      data: {
        source: input.source ?? 'app',
        requesterEmail,
        ownerEmail: requesterEmail,
        originalSubmission: need,
        structuredFacts,
        activeDisruption: input.activeDisruption,
      },
    });
    await tx.requestMessage.create({
      data: { requestId: request.id, role: 'REQUESTER', content: need },
    });
    await tx.requestMessage.create({
      data: {
        requestId: request.id,
        role: 'SCOUT',
        content: input.activeDisruption ? INCIDENT_ACK : CAPTURE_ACK,
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
      receivingDomain: true,
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
