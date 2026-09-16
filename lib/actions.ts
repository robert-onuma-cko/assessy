'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { THEME_COOKIE, isTheme, type Theme } from '@/lib/theme';
import { requireActor, requirePermission, canTriage, decisionRoleFor, type CurrentUser } from '@/lib/permissions';
import {
  askForInformation,
  classifyRequest,
  recordOutcome,
  rerouteDomain,
  sendToDomain,
  setIndicatorFlag,
} from '@/lib/services/triage-service';
import { DOMAIN_OUTCOMES, TRIAGE_OUTCOMES } from '@/lib/triage-rules';
import type { RequestState, RequestType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { addMessage, createRequest, extractEvidence } from '@/lib/services/request-service';
import { normalizeDocLink, type DocLink } from '@/lib/doc-links';
import { isValid, parse } from 'date-fns';

// Server actions are thin: resolve actor → permission → service → revalidate
// (Hive AGENTS.md convention). Every action authenticates independently — an
// action is a public HTTP endpoint regardless of which button renders it.

export async function setTheme(theme: Theme) {
  await requireActor();
  if (!isTheme(theme)) throw new Error('Invalid theme');
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  // Every page reads the cookie in the root layout, so refresh the whole tree.
  revalidatePath('/', 'layout');
}

export async function submitRequest(formData: FormData) {
  const actor = await requireActor();

  const need = String(formData.get('need') ?? '').trim();
  // Server-side enforcement of the same rule the ValidatedForm checks —
  // client validation is an affordance, never the gate.
  if (!need) throw new Error('Description is required.');

  // The picker only emits yyyy-MM-dd, but an action is a public endpoint —
  // anything else is dropped rather than stored as a "known" fact.
  const rawNeededBy = String(formData.get('neededBy') ?? '').trim();
  const neededBy =
    rawNeededBy && isValid(parse(rawNeededBy, 'yyyy-MM-dd', new Date())) ? rawNeededBy : undefined;

  // Same rule the EvidenceLinksInput applies client-side, re-run here because
  // the action is the gate. An invalid link fails the whole submission rather
  // than being silently dropped — the requester chose to attach it.
  const evidenceLinks: DocLink[] = [];
  for (const raw of formData.getAll('evidenceLinks')) {
    const r = normalizeDocLink(raw);
    if (!r.ok) throw new Error(`Evidence link: ${r.error}`);
    if (!evidenceLinks.some((l) => l.url === r.link.url)) evidenceLinks.push(r.link);
  }

  const id = await createRequest({
    requesterEmail: actor.email,
    need,
    evidenceLinks,
    neededBy,
    dateDriver: String(formData.get('dateDriver') ?? ''),
  });

  await extractEvidence(id);

  revalidatePath('/');
  redirect(`/requests/${id}`);
}

export async function postRequestMessage(requestId: string, content: string) {
  const actor = await requireActor();
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { requesterEmail: true, ownerEmail: true },
  });
  if (!request) throw new Error('Request not found.');

  // Requesters (and the request owner) speak as themselves; triage leads speak
  // for the triage team. Anyone else may read the record but not write to it.
  const isRequester = [request.requesterEmail, request.ownerEmail].includes(actor.email);
  requirePermission(isRequester || canTriage(actor), 'Only the requester or the triage team can post here.');

  await addMessage({
    requestId,
    actorEmail: actor.email,
    role: isRequester ? 'REQUESTER' : 'TRIAGE',
    content,
  });
  revalidatePath(`/requests/${requestId}`);
}

// ─── Manual triage (week 2) ───────────────────────────────────────────────────
//
// Each action resolves the actor's decision role for THIS request before the
// service runs. Returning { error } rather than throwing lets the panel show
// the message beside the control instead of crashing the page.

type ActionResult = { ok: true } | { ok: false; error: string };

async function withDecisionRole(
  requestId: string,
  allowed: readonly ('triage' | 'domain')[],
  fn: (actor: { email: string }) => Promise<void>,
): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: { state: true, receivingDomainKey: true },
    });
    if (!request) return { ok: false, error: 'Request not found.' };
    const role = await decisionRoleFor(actor, request);
    requirePermission(!!role && allowed.includes(role), 'You cannot decide on this request.');
    await fn(actor);
    revalidatePath(`/requests/${requestId}`);
    revalidatePath('/triage');
    revalidatePath('/my-work');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const opt = (fd: FormData, key: string) => str(fd, key) || null;

export async function classifyRequestAction(requestId: string, formData: FormData): Promise<ActionResult> {
  return withDecisionRole(requestId, ['triage'], (actor) =>
    classifyRequest({
      requestId,
      actor: actor.email,
      validatedFinalType: (opt(formData, 'validatedFinalType') as RequestType | null) ?? null,
      receivingDomainKey: opt(formData, 'receivingDomainKey'),
      reasonCode: opt(formData, 'reasonCode'),
    }),
  );
}

export async function setIndicatorFlagAction(requestId: string, flag: boolean, reasonCode: string | null): Promise<ActionResult> {
  return withDecisionRole(requestId, ['triage', 'domain'], (actor) =>
    setIndicatorFlag({ requestId, actor: actor.email, flag, reasonCode }),
  );
}

export async function askForInformationAction(requestId: string, message: string): Promise<ActionResult> {
  return withDecisionRole(requestId, ['triage'], (actor) => askForInformation({ requestId, actor: actor.email, message }));
}

export async function sendToDomainAction(requestId: string): Promise<ActionResult> {
  return withDecisionRole(requestId, ['triage'], (actor) => sendToDomain({ requestId, actor: actor.email }));
}

export async function rerouteDomainAction(requestId: string, formData: FormData): Promise<ActionResult> {
  return withDecisionRole(requestId, ['triage', 'domain'], (actor) =>
    rerouteDomain({ requestId, actor: actor.email, newDomainKey: str(formData, 'newDomainKey'), reason: str(formData, 'reason') }),
  );
}

export async function recordOutcomeAction(requestId: string, formData: FormData): Promise<ActionResult> {
  const outcome = str(formData, 'outcome') as RequestState;
  return withDecisionRole(requestId, ['triage', 'domain'], async (actor) => {
    // Domain owners pick from their menu, triage leads from theirs — the rails
    // in lib/triage-rules; a domain owner cannot, say, route to an incident.
    const request = await prisma.request.findUniqueOrThrow({ where: { id: requestId }, select: { state: true, receivingDomainKey: true } });
    const role = await decisionRoleFor(actor as CurrentUser, request);
    const menu = role === 'domain' ? DOMAIN_OUTCOMES : [...TRIAGE_OUTCOMES, ...DOMAIN_OUTCOMES];
    requirePermission(menu.includes(outcome), 'That outcome is not yours to pick.');
    await recordOutcome({
      requestId,
      actor: actor.email,
      outcome,
      reason: str(formData, 'reason'),
      routingUrl: opt(formData, 'routingUrl'),
      linkedInitiativeRef: opt(formData, 'linkedInitiativeRef'),
      capacityOutcome: opt(formData, 'capacityOutcome'),
      displacedInitiative: opt(formData, 'displacedInitiative'),
    });
  });
}
