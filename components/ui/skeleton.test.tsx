// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a div with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('data-slot', 'skeleton');
    expect(el.className).toContain('animate-pulse');
  });

  it('merges additional className', () => {
    const { container } = render(<Skeleton className="w-32 h-4" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('w-32');
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('animate-pulse');
  });

  it('passes through extra props', () => {
    render(<Skeleton data-testid="loading-skeleton" aria-label="loading" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveAttribute('aria-label', 'loading');
  });
});
