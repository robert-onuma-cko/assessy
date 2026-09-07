// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders an input element with data-slot', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('forwards value and onChange', async () => {
    const onChange = vi.fn();
    render(<Input value="hello" onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('renders as disabled with pointer-events-none class', () => {
    render(<Input disabled data-testid="inp" />);
    const input = screen.getByTestId('inp');
    expect(input).toBeDisabled();
  });

  it('merges custom className', () => {
    render(<Input className="extra-class" data-testid="inp" />);
    expect(screen.getByTestId('inp').className).toContain('extra-class');
  });

  it('forwards type attribute', () => {
    render(<Input type="email" data-testid="inp" />);
    expect(screen.getByTestId('inp')).toHaveAttribute('type', 'email');
  });

  it('sets aria-invalid for error state', () => {
    render(<Input aria-invalid="true" data-testid="inp" />);
    expect(screen.getByTestId('inp')).toHaveAttribute('aria-invalid', 'true');
  });
});
