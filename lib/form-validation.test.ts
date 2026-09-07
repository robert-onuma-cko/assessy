import { describe, it, expect } from 'vitest';

import { firstErrorField, isValid, requiredMessage } from './form-validation';

describe('requiredMessage', () => {
  it('names the noun, not the field', () => {
    expect(requiredMessage('Name')).toBe('Name is required');
  });
});

describe('isValid', () => {
  it('is true only for an empty error set', () => {
    expect(isValid({})).toBe(true);
    expect(isValid({ title: 'Name is required' })).toBe(false);
  });
});

describe('firstErrorField', () => {
  // The scroll target. Insertion order is screen order because validators are
  // written top-down — if this stopped holding, `check` would scroll past the
  // first gap to a later one.
  it('is the first key inserted, not the alphabetically first', () => {
    const errors: Record<string, string> = {};
    errors.zebra = 'Zebra is required';
    errors.apple = 'Apple is required';
    expect(firstErrorField(errors)).toBe('zebra');
  });

  it('is undefined when there is nothing to show', () => {
    expect(firstErrorField({})).toBeUndefined();
  });
});
