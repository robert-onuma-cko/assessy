import { describe, it, expect } from 'vitest';
import { REQUEST_TYPES, STATE_META, TERMINAL_STATES, TAXONOMY_VERSION, isTerminal } from './taxonomy';

describe('taxonomy', () => {
  it('carries all 8 request types from the D1 taxonomy', () => {
    expect(Object.keys(REQUEST_TYPES)).toHaveLength(8);
    for (const entry of Object.values(REQUEST_TYPES)) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.definition.length).toBeGreaterThan(0);
    }
  });

  it('has exactly 8 terminal triage outcomes', () => {
    expect(TERMINAL_STATES).toHaveLength(8);
    for (const state of TERMINAL_STATES) expect(isTerminal(state)).toBe(true);
  });

  it('gives every state a label and a semantic Badge variant', () => {
    // 5 pipeline states + 8 terminal outcomes
    expect(Object.keys(STATE_META)).toHaveLength(13);
    const allowed = new Set(['success', 'warning', 'danger', 'info', 'neutral']);
    for (const meta of Object.values(STATE_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(allowed.has(meta.variant)).toBe(true);
    }
  });

  it('keeps pipeline states non-terminal', () => {
    for (const s of ['SUBMITTED', 'CLARIFYING', 'READY_FOR_REVIEW', 'REQUESTER_CONFIRMED', 'AWAITING_DOMAIN_DECISION'] as const) {
      expect(isTerminal(s)).toBe(false);
    }
  });

  it('stamps a taxonomy version', () => {
    expect(TAXONOMY_VERSION).toMatch(/^D1-/);
  });
});
