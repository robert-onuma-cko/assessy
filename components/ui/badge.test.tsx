// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders a span with data-slot', () => {
    render(<Badge>Label</Badge>);
    const el = screen.getByText('Label');
    expect(el).toHaveAttribute('data-slot', 'badge');
    expect(el.tagName).toBe('SPAN');
  });

  it('default variant is applied', () => {
    render(<Badge data-testid="b">x</Badge>);
    expect(screen.getByTestId('b')).toHaveAttribute('data-variant', 'default');
  });

  it('renders as Slot child when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/tag">tag</a>
      </Badge>
    );
    const link = screen.getByRole('link', { name: 'tag' });
    expect(link).toHaveAttribute('data-slot', 'badge');
  });

  it('merges custom className', () => {
    render(<Badge className="truncate max-w-xs" data-testid="b">long</Badge>);
    expect(screen.getByTestId('b').className).toContain('truncate');
  });

  it.each([
    ['default'],
    ['secondary'],
    ['destructive'],
    ['outline'],
    ['ghost'],
    ['link'],
    ['success'],
    ['warning'],
    ['danger'],
    ['info'],
    ['neutral'],
  ] as const)('variant %s renders without error', (variant) => {
    expect(() => render(<Badge variant={variant}>v</Badge>)).not.toThrow();
  });
});
