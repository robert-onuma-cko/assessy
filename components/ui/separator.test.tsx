// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders with data-slot and default horizontal orientation', () => {
    const { container } = render(<Separator />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('data-slot', 'separator');
    expect(el).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders with vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('data-orientation', 'vertical');
  });

  it('is decorative by default — no separator role exposed to assistive tech', () => {
    const { container } = render(<Separator />);
    const el = container.firstChild as HTMLElement;
    // Radix renders a decorative separator without role="separator".
    // Either aria-hidden="true" or role="none" signals this; either is acceptable.
    const isHidden = el.getAttribute('aria-hidden') === 'true' || el.getAttribute('role') === 'none';
    expect(isHidden || !el.hasAttribute('role')).toBe(true);
  });

  it('is not aria-hidden when decorative=false', () => {
    const { container } = render(<Separator decorative={false} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('role', 'separator');
  });

  it('merges custom className', () => {
    const { container } = render(<Separator className="my-4" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('my-4');
    expect(el.className).toContain('shrink-0');
  });
});
