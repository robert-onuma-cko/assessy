// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from './sonner';

vi.mock('sonner', () => ({
  Toaster: ({ position, className, ...props }: Record<string, unknown>) => (
    <div data-testid="sonner-toaster" data-position={position} className={className as string} {...props} />
  ),
}));

describe('Toaster', () => {
  it('renders the sonner Toaster', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('positions at bottom-right', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster')).toHaveAttribute('data-position', 'bottom-right');
  });

  it('carries the toaster group class', () => {
    const { getByTestId } = render(<Toaster />);
    expect(getByTestId('sonner-toaster').className).toContain('toaster');
  });

  it('forwards the theme prop', () => {
    const { getByTestId } = render(<Toaster theme="light" />);
    expect(getByTestId('sonner-toaster')).toHaveAttribute('theme', 'light');
  });
});
