import { describe, expect, it } from 'vitest';

import { readyForDomain, validateOutcome } from './triage-rules';

describe('validateOutcome', () => {
  it('always requires a reason', () => {
    expect(validateOutcome({ outcome: 'RESOLVED_SELF_SERVICE', reason: '  ' })).toEqual({
      reason: 'Reason is required',
    });
    expect(validateOutcome({ outcome: 'RESOLVED_SELF_SERVICE', reason: 'Answered from the KB.' })).toEqual({});
  });

  it('rejects a non-terminal state as an outcome', () => {
    expect(validateOutcome({ outcome: 'CLARIFYING', reason: 'x' })).toHaveProperty('outcome');
  });

  it('never links to nothing', () => {
    expect(validateOutcome({ outcome: 'LINKED_TO_INITIATIVE', reason: 'Same need.' })).toEqual({
      linkedInitiativeRef: 'Initiative is required',
    });
    expect(
      validateOutcome({ outcome: 'LINKED_TO_INITIATIVE', reason: 'Same need.', linkedInitiativeRef: 'abc' }),
    ).toEqual({});
  });

  it('backlog acceptance records a capacity outcome, and re-sequencing names the displaced initiative', () => {
    expect(validateOutcome({ outcome: 'ACCEPTED_TO_BACKLOG', reason: 'ok' })).toEqual({
      capacityOutcome: 'Capacity outcome is required',
    });
    expect(validateOutcome({ outcome: 'ACCEPTED_TO_BACKLOG', reason: 'ok', capacityOutcome: 'resequence' })).toEqual({
      displacedInitiative: 'Name the initiative being re-sequenced',
    });
    expect(
      validateOutcome({
        outcome: 'ACCEPTED_TO_BACKLOG',
        reason: 'ok',
        capacityOutcome: 'resequence',
        displacedInitiative: 'Least cost routing',
      }),
    ).toEqual({});
    expect(validateOutcome({ outcome: 'ACCEPTED_TO_BACKLOG', reason: 'ok', capacityOutcome: 'bogus' })).toHaveProperty(
      'capacityOutcome',
    );
  });

  it('MCAP and incident hand-offs must say where the work went', () => {
    expect(validateOutcome({ outcome: 'ADVANCED_TO_MCAP', reason: 'Pricing change.' })).toEqual({
      routingUrl: 'Link is required',
    });
    expect(validateOutcome({ outcome: 'ROUTED_TO_INCIDENT', reason: 'Live issue.' })).toEqual({
      routingUrl: 'Link is required',
    });
  });

  it('names every gap at once', () => {
    expect(Object.keys(validateOutcome({ outcome: 'ACCEPTED_TO_BACKLOG', reason: '' })).sort()).toEqual([
      'capacityOutcome',
      'reason',
    ]);
  });
});

describe('readyForDomain', () => {
  it('lists everything still missing', () => {
    expect(readyForDomain({ state: 'SUBMITTED', validatedFinalType: null, receivingDomainKey: null })).toEqual([
      'a validated type',
      'a receiving domain',
    ]);
  });

  it('is empty once classified and routed from an open state', () => {
    expect(
      readyForDomain({ state: 'CLARIFYING', validatedFinalType: 'BAU', receivingDomainKey: 'dom-treasury' }),
    ).toEqual([]);
  });

  it('refuses a request that is already terminal or with a domain', () => {
    expect(
      readyForDomain({ state: 'ACCEPTED_TO_BACKLOG', validatedFinalType: 'BAU', receivingDomainKey: 'dom-treasury' }),
    ).toEqual(['an open request']);
  });
});
