import { describe, it, expect } from 'vitest';
import { formatList } from './utils';

// formatList builds the human half of "fill in X, Y and Z" messages, so the
// joining has to read correctly at every length — including none.
describe('formatList', () => {
  it('renders one item as itself', () => {
    expect(formatList(['Geography'])).toBe('Geography');
  });

  it('joins two items with "and"', () => {
    expect(formatList(['Geography', 'Segments in scope'])).toBe('Geography and Segments in scope');
  });

  it('comma-separates all but the last', () => {
    expect(formatList(['Geography', 'Segments in scope', 'Checkout in flow of funds']))
      .toBe('Geography, Segments in scope and Checkout in flow of funds');
  });

  it('degrades to an empty string when there is nothing to list', () => {
    expect(formatList([])).toBe('');
  });
});
