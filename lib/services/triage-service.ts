import type { Prisma, RequestState, RequestType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CORRECTION_REASON_CODES, type CorrectionReasonCode } from '@/lib/taxonomy';
import { readyForDomain, validateOutcome, type OutcomeInput } from '@/lib/triage-rules';

// Manual triage writes (design §3.3, §3.4, §8). Every mutation appends AuditLog
// rows in the same transaction; a change to a field Scout populated carries a
// reason code. No state is ever overwritten silently — transitions are audited
// events with actor + from/to. Authorization is the caller's job (actions run
// requireActor → decisionRoleFor before reaching here).

type Tx = Prisma.TransactionClient;

async function audit(
  tx: Tx,
  requestId: string,
  actor: string,
  action: string,
  field?: string,
  fromValue?: string | null,
  toValue?: string | null,
  reasonCode?: string | null,
) {
  await tx.auditLog.create({
    data: {
      entityType: 'request',
      entityId: requestId,
      requestId,
      action,
      actor,
      field,
      fromValue: fromValue ?? null,
      toValue: toValue ?? null,
      reasonCode: reasonCode ?? null,
    },
  });
}

async function notify(tx: Tx, recipientEmail: string, type: string, message: string, requestId: string) {
  await tx.notification.create({
    data: { recipientEmail: recipientEmail.toLowerCase(), type, message, href: `/requests/${requestId}`, requestId },
  });
}

function assertReasonCode(code: string | null | undefined): CorrectionReasonCode | null {
  if (!code) return null;
  if (!(code in CORRECTION_REASON_CODES)) throw new Error('Unknown reason code.');
  return code as CorrectionReasonCode;
}

/**
 * Set the human-validated type and/or receiving domain. A change to a value
 * that was already set is a correction and must carry a reason code; the first
 * setting of an empty field is not.
 */
export async function classifyRequest(input: {
  requestId: string;
  actor: string;
  validatedFinalType?: RequestType | null;
  receivingDomainKey?: string | null;
  reasonCode?: string | null;
}): Promise<void> {
  const reasonCode = assertReasonCode(input.reasonCode);
  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { validatedFinalType: true, receivingDomainKey: true, state: true },
    });
    if (!['SUBMITTED', 'CLARIFYING', 'READY_FOR_REVIEW', 'REQUESTER_CONFIRMED', 'AWAITING_DOMAIN_DECISION'].includes(current.state)) {
      throw new Error('This request has a recorded outcome and can no longer be reclassified.');
    }

    const data: Prisma.RequestUpdateInput = {};
    if (input.validatedFinalType !== undefined && input.validatedFinalType !== current.validatedFinalType) {
      if (current.validatedFinalType && !reasonCode) throw new Error('Changing the type needs a reason code.');
      data.validatedFinalType = input.validatedFinalType;
      await audit(tx, input.requestId, input.actor, current.validatedFinalType ? 'correction' : 'classify', 'validatedFinalType', current.validatedFinalType, input.validatedFinalType, reasonCode);
    }
    if (input.receivingDomainKey !== undefined && input.receivingDomainKey !== current.receivingDomainKey) {
      if (current.receivingDomainKey && !reasonCode) throw new Error('Changing the domain needs a reason code.');
      if (input.receivingDomainKey) {
        const exists = await tx.domainCatalogue.findUnique({ where: { key: input.receivingDomainKey } });
        if (!exists) throw new Error('Unknown domain.');
      }
      data.receivingDomain = input.receivingDomainKey
        ? { connect: { key: input.receivingDomainKey } }
        : { disconnect: true };
      await audit(tx, input.requestId, input.actor, current.receivingDomainKey ? 'correction' : 'route', 'receivingDomainKey', current.receivingDomainKey, input.receivingDomainKey, reasonCode);
    }
    if (Object.keys(data).length) await tx.request.update({ where: { id: input.requestId }, data });
  });
}

/**
 * The initiative-indicator flag is sticky and requester-proof: anyone with a
 * decision role may set it; clearing it needs a mandatory reason code and is
 * logged as its own event so "flags dismissed, by whom" is a standing report.
 */
export async function setIndicatorFlag(input: {
  requestId: string;
  actor: string;
  flag: boolean;
  reasonCode?: string | null;
}): Promise<void> {
  const reasonCode = assertReasonCode(input.reasonCode);
  if (!input.flag && !reasonCode) throw new Error('Clearing the indicator flag needs a reason code.');
  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { initiativeIndicatorFlag: true },
    });
    if (current.initiativeIndicatorFlag === input.flag) return;
    await tx.request.update({ where: { id: input.requestId }, data: { initiativeIndicatorFlag: input.flag } });
    await audit(tx, input.requestId, input.actor, input.flag ? 'flag-set' : 'flag-cleared', 'initiativeIndicatorFlag', String(current.initiativeIndicatorFlag), String(input.flag), reasonCode);
  });
}

/** Post a triage question to the requester and mark the request Clarifying. */
export async function askForInformation(input: { requestId: string; actor: string; message: string }): Promise<void> {
  const content = input.message.trim();
  if (!content) throw new Error('Say what you need from the requester.');
  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { state: true, requesterEmail: true },
    });
    await tx.requestMessage.create({ data: { requestId: input.requestId, role: 'TRIAGE', content } });
    await audit(tx, input.requestId, input.actor, 'message', 'thread', null, 'TRIAGE');
    if (current.state !== 'CLARIFYING') {
      await tx.request.update({ where: { id: input.requestId }, data: { state: 'CLARIFYING' } });
      await audit(tx, input.requestId, input.actor, 'state-change', 'state', current.state, 'CLARIFYING');
    }
    await notify(tx, current.requesterEmail, 'triage-question', 'The triage team has a question about your request.', input.requestId);
  });
}

/** Hand a classified, routed request to its receiving domain for confirmation. */
export async function sendToDomain(input: { requestId: string; actor: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      include: { receivingDomain: true },
    });
    const missing = readyForDomain(current);
    if (missing.length) throw new Error(`Still needed: ${missing.join(', ')}.`);

    await tx.request.update({ where: { id: input.requestId }, data: { state: 'AWAITING_DOMAIN_DECISION' } });
    await audit(tx, input.requestId, input.actor, 'state-change', 'state', current.state, 'AWAITING_DOMAIN_DECISION');
    await tx.requestMessage.create({
      data: {
        requestId: input.requestId,
        role: 'SCOUT',
        content: `The triage team has routed this to ${current.receivingDomain!.name} — their approval owner confirms next. The pilot SLA for that is two business days.`,
        meta: { stage: 'routing' },
      },
    });
    for (const email of [current.receivingDomain!.approvalOwnerEmail, current.receivingDomain!.delegateEmail]) {
      if (email) await notify(tx, email, 'domain-confirmation-requested', `A request has been routed to ${current.receivingDomain!.name} for your confirmation.`, input.requestId);
    }
  });
}

/**
 * A domain owner re-routes a request to a different receiving domain. The old
 * receiver holds it until the new one accepts — the state stays
 * AWAITING_DOMAIN_DECISION — and the request is never orphaned.
 */
export async function rerouteDomain(input: {
  requestId: string;
  actor: string;
  newDomainKey: string;
  reason: string;
}): Promise<void> {
  if (!input.reason.trim()) throw new Error('Reason is required.');
  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { state: true, receivingDomainKey: true },
    });
    if (current.state !== 'AWAITING_DOMAIN_DECISION') throw new Error('Only a request awaiting a domain decision can be re-routed.');
    if (current.receivingDomainKey === input.newDomainKey) throw new Error('That is already the receiving domain.');
    const next = await tx.domainCatalogue.findUnique({ where: { key: input.newDomainKey } });
    if (!next) throw new Error('Unknown domain.');

    await tx.request.update({ where: { id: input.requestId }, data: { receivingDomainKey: input.newDomainKey } });
    await audit(tx, input.requestId, input.actor, 'correction', 'receivingDomainKey', current.receivingDomainKey, input.newDomainKey, 'wrong-domain');
    await tx.requestMessage.create({
      data: {
        requestId: input.requestId,
        role: 'TRIAGE',
        content: `Re-routed to ${next.name}: ${input.reason.trim()}`,
      },
    });
    for (const email of [next.approvalOwnerEmail, next.delegateEmail]) {
      if (email) await notify(tx, email, 'domain-confirmation-requested', `A request has been re-routed to ${next.name} for your confirmation.`, input.requestId);
    }
  });
}

/**
 * Record the one terminal outcome. Human-only in v1; the reason is mandatory
 * and the fields each outcome needs are enforced by validateOutcome.
 */
export async function recordOutcome(input: OutcomeInput & { requestId: string; actor: string }): Promise<void> {
  const errors = validateOutcome(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(' '));

  await prisma.$transaction(async (tx) => {
    const current = await tx.request.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { state: true, requesterEmail: true, decidedAt: true },
    });
    if (current.decidedAt) throw new Error('This request already has a recorded outcome.');
    if (input.outcome === 'LINKED_TO_INITIATIVE') {
      const found = await tx.initiativeSnapshot.findUnique({ where: { ref: input.linkedInitiativeRef! } });
      if (!found) throw new Error('Unknown initiative — pick one from the Hive snapshot.');
    }

    await tx.request.update({
      where: { id: input.requestId },
      data: {
        state: input.outcome as RequestState,
        decisionReason: input.reason.trim(),
        decidedByEmail: input.actor,
        decidedAt: new Date(),
        routingUrl: input.routingUrl?.trim() || null,
        linkedInitiativeRef: input.linkedInitiativeRef?.trim() || null,
        capacityOutcome: input.capacityOutcome || null,
        displacedInitiative: input.displacedInitiative?.trim() || null,
      },
    });
    await audit(tx, input.requestId, input.actor, 'decision', 'state', current.state, input.outcome);
    await tx.requestMessage.create({
      data: {
        requestId: input.requestId,
        role: 'TRIAGE',
        content: input.reason.trim(),
        meta: { decision: input.outcome, routingUrl: input.routingUrl ?? null },
      },
    });
    await notify(tx, current.requesterEmail, 'decision-recorded', 'A decision has been recorded on your request.', input.requestId);
  });
}

export async function listRecentDecisions(limit = 10) {
  return prisma.request.findMany({
    where: { decidedAt: { not: null } },
    orderBy: { decidedAt: 'desc' },
    take: limit,
    include: { receivingDomain: { select: { name: true } } },
  });
}
