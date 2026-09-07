import type { RequestState, RequestType } from '@prisma/client';

// The 8-type CKO request taxonomy (Request Methodology D1, draft of 11 Aug
// 2026). Every classification is stamped with this version so a later taxonomy
// change never silently re-labels history.
export const TAXONOMY_VERSION = 'D1-draft-2026-08-11';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const REQUEST_TYPES: Record<RequestType, { label: string; definition: string }> = {
  BAU: {
    label: 'BAU request',
    definition: 'Routine or recurring operational work supporting an existing process, service, or capability.',
  },
  SMALL_TASK: {
    label: 'Small task / enhancement',
    definition: 'A bounded, low-complexity change with a clear outcome, normally owned by one domain.',
  },
  SERVICE_REQUEST: {
    label: 'Service request',
    definition: 'Information, documentation, access, or a standard fulfilment activity.',
  },
  INCIDENT_BUG: {
    label: 'Incident / bug',
    definition: 'An unplanned interruption, defect, degradation, or failure of an existing capability.',
  },
  IMPROVEMENT_IDEA: {
    label: 'Improvement idea',
    definition: 'A suggestion not yet defined or prioritised for delivery — a backlog candidate.',
  },
  INITIATIVE_DEPENDENCY: {
    label: 'Existing initiative dependency',
    definition: 'Work required by an initiative that already exists in CKO systems. Link, never duplicate.',
  },
  PROJECT_REQUEST: {
    label: 'Project request / potential initiative',
    definition: 'Not yet defined enough to confirm as an initiative; may need structured discovery or multiple teams.',
  },
  INITIATIVE_MAJOR_CHANGE: {
    label: 'Initiative / major change',
    definition: 'Creates or materially changes a capability, has substantial effort or risk, or needs cross-functional delivery.',
  },
};

// State labels + the Badge variant each renders through (design.md §3.2:
// every lifecycle state goes through the five semantic Badge variants).
export const STATE_META: Record<RequestState, { label: string; variant: BadgeVariant }> = {
  SUBMITTED: { label: 'Submitted', variant: 'neutral' },
  CLARIFYING: { label: 'Clarifying', variant: 'info' },
  READY_FOR_REVIEW: { label: 'Ready for review', variant: 'info' },
  REQUESTER_CONFIRMED: { label: 'Requester confirmed', variant: 'info' },
  AWAITING_DOMAIN_DECISION: { label: 'Awaiting domain decision', variant: 'warning' },
  RESOLVED_SELF_SERVICE: { label: 'Resolved — self-service', variant: 'success' },
  LINKED_TO_INITIATIVE: { label: 'Linked to initiative', variant: 'success' },
  RETURNED_FOR_INFO: { label: 'Returned for information', variant: 'warning' },
  REJECTED_REDIRECTED: { label: 'Rejected / redirected', variant: 'danger' },
  ACCEPTED_TO_BACKLOG: { label: 'Accepted to backlog', variant: 'success' },
  ADVANCED_TO_MCAP: { label: 'Advanced to MCAP', variant: 'success' },
  ROUTED_TO_INCIDENT: { label: 'Routed to incident', variant: 'danger' },
  BACKLOG_CANDIDATE: { label: 'Backlog candidate', variant: 'neutral' },
};

// The eight terminal triage outcomes (design §6.2). A request in any of these
// states is closed; RETURNED_FOR_INFO alone is reopenable (same id).
export const TERMINAL_STATES: readonly RequestState[] = [
  'RESOLVED_SELF_SERVICE',
  'LINKED_TO_INITIATIVE',
  'RETURNED_FOR_INFO',
  'REJECTED_REDIRECTED',
  'ACCEPTED_TO_BACKLOG',
  'ADVANCED_TO_MCAP',
  'ROUTED_TO_INCIDENT',
  'BACKLOG_CANDIDATE',
] as const;

export function isTerminal(state: RequestState): boolean {
  return (TERMINAL_STATES as readonly string[]).includes(state);
}
