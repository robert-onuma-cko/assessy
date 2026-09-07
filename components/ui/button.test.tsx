// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders a button element with data-slot', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toHaveAttribute('data-slot', 'button');
  });

  it('default variant and size are applied', () => {
    render(<Button data-testid="btn">Go</Button>);
    const btn = screen.getByTestId('btn');
    expect(btn).toHaveAttribute('data-variant', 'default');
    expect(btn).toHaveAttribute('data-size', 'default');
  });

  it('applies the correct variant class token', () => {
    render(<Button variant="outline" data-testid="btn">Outline</Button>);
    expect(screen.getByTestId('btn')).toHaveAttribute('data-variant', 'outline');
  });

  it('applies the correct size class token', () => {
    render(<Button size="xs" data-testid="btn">Small</Button>);
    expect(screen.getByTestId('btn')).toHaveAttribute('data-size', 'xs');
  });

  it('renders as a Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/home');
    expect(link).toHaveAttribute('data-slot', 'button');
  });

  it('is disabled and cannot be clicked', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>No</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Yes</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('merges custom className', () => {
    render(<Button className="extra" data-testid="btn">X</Button>);
    expect(screen.getByTestId('btn').className).toContain('extra');
  });

  it.each([
    ['default'],
    ['outline'],
    ['secondary'],
    ['ghost'],
    ['destructive'],
    ['link'],
  ] as const)('variant %s renders without error', (variant) => {
    expect(() => render(<Button variant={variant}>v</Button>)).not.toThrow();
  });

  it.each([
    ['default'],
    ['xs'],
    ['sm'],
    ['lg'],
    ['icon'],
    ['icon-xs'],
    ['icon-sm'],
    ['icon-lg'],
  ] as const)('size %s renders without error', (size) => {
    expect(() => render(<Button size={size}>s</Button>)).not.toThrow();
  });
});
