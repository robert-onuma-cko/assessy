// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/people-directory', () => ({
  searchPeople: vi.fn(),
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { PersonPicker } from './PersonPicker';
import { searchPeople } from '@/lib/people-directory';

const mockSearch = searchPeople as ReturnType<typeof vi.fn>;

describe('PersonPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockReturnValue([]);
  });

  it('renders the input', () => {
    render(<PersonPicker name="owner" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('uses placeholder prop', () => {
    render(<PersonPicker name="owner" placeholder="Find someone" />);
    expect(screen.getByPlaceholderText('Find someone')).toBeInTheDocument();
  });

  it('has a hidden input with the name for form submission', () => {
    const { container } = render(<PersonPicker name="owner" />);
    const hidden = container.querySelector('input[type="hidden"][name="owner"]');
    expect(hidden).not.toBeNull();
  });

  it('pre-fills the display with defaultLabel when provided', () => {
    render(<PersonPicker name="owner" defaultValue="a@b.com" defaultLabel="Alice" />);
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('calls searchPeople when user types at least 1 character', () => {
    mockSearch.mockReturnValue([{ name: 'Alice', email: 'alice@example.com' }]);
    render(<PersonPicker name="owner" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ali' } });
    expect(mockSearch).toHaveBeenCalledWith('ali', 8);
  });

  it('shows results in a dropdown', () => {
    mockSearch.mockReturnValue([{ name: 'Alice', email: 'alice@example.com' }]);
    render(<PersonPicker name="owner" />);
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ali' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('calls onSelect and sets hidden input value when a person is selected', () => {
    const onSelect = vi.fn();
    mockSearch.mockReturnValue([{ name: 'Alice', email: 'alice@example.com' }]);
    const { container } = render(<PersonPicker name="owner" onSelect={onSelect} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ali' } });
    fireEvent.focus(screen.getByRole('textbox'));
    const btn = screen.getByRole('button', { name: /alice/i });
    fireEvent.mouseDown(btn);
    expect(onSelect).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@example.com' });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe('alice@example.com');
  });
});
