import type { RequestState } from '@prisma/client';
import { CAPACITY_OUTCOMES, TERMINAL_STATES } from '@/lib/taxonomy';

// The rules of manual triage — pure, so the service enforces them and the UI
// can pre-explain them, from one place. Week 2 is "manual triage works before
// any AI ships": these are the rails a human moves a request along.

/** Where a triage lead may move a live request from. */
export const TRIAGE_ACTIVE_STATES: readonly RequestState[] = [
  'SUBMITTED',
  'CLARIFYING',
  'READY_FOR_REVIEW',
  'REQUESTER_CONFIRMED',
];

/** The terminal outcomes a TRIAGE LEAD may pick directly, without a domain. */
export const TRIAGE_OUTCOMES: readonly RequestState[] = [
  'RESOLVED_SELF_SERVICE',
  'LINKED_TO_INITIATIVE',
  'RETURNED_FOR_INFO',
  'REJECTED_REDIRECTED',
  'ROUTED_TO_INCIDENT',
  'BACKLOG_CANDIDATE',
];

/** The outcomes a DOMAIN OWNER picks once a request is awaiting their decision. */
export const DOMAIN_OUTCOMES: readonly RequestState[] = [
  'ACCEPTED_TO_BACKLOG',
  'ADVANCED_TO_MCAP',
  'REJECTED_REDIRECTED',
  'BACKLOG_CANDIDATE',
];

export type OutcomeInput = {
  outcome: RequestState;
  reason: string;
  routingUrl?: string | null;
  linkedInitiativeRef?: string | null;
  capacityOutcome?: string | null;
  displacedInitiative?: string | null;
};

/**
 * What each outcome must carry to be recorded. The reason is always mandatory
 * (design §8: a human owns telling a requester "no", and every decision is
 * audited with its why). Returns field → message, empty when valid — the same
 * shape the forms render.
 */
export function validateOutcome(input: OutcomeInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!(TERMINAL_STATES as readonly string[]).includes(input.outcome)) {
    errors.outcome = 'Pick an outcome';
    return errors;
  }
  if (!input.reason?.trim()) errors.reason = 'Reason is required';

  switch (input.outcome) {
    case 'LINKED_TO_INITIATIVE':
      // Suggest, never auto-link — and never link to nothing.
      if (!input.linkedInitiativeRef?.trim()) errors.linkedInitiativeRef = 'Initiative is required';
      break;
    case 'ACCEPTED_TO_BACKLOG':
      if (!input.capacityOutcome || !(input.capacityOutcome in CAPACITY_OUTCOMES)) {
        errors.capacityOutcome = 'Capacity outcome is required';
      } else if (input.capacityOutcome === 'resequence' && !input.displacedInitiative?.trim()) {
        errors.displacedInitiative = 'Name the initiative being re-sequenced';
      }
      break;
    case 'ADVANCED_TO_MCAP':
    case 'ROUTED_TO_INCIDENT':
      // The human registered it elsewhere; the record must say where.
      if (!input.routingUrl?.trim()) errors.routingUrl = 'Link is required';
      break;
  }
  return errors;
}

/** A request may be sent to its domain only once it is classified and routed. */
export function readyForDomain(request: {
  state: RequestState;
  validatedFinalType: string | null;
  receivingDomainKey: string | null;
}): string[] {
  const missing: string[] = [];
  if (!TRIAGE_ACTIVE_STATES.includes(request.state)) missing.push('an open request');
  if (!request.validatedFinalType) missing.push('a validated type');
  if (!request.receivingDomainKey) missing.push('a receiving domain');
  return missing;
}
