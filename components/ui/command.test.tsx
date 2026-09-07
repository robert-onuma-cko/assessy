// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command';

describe('Command', () => {
  it('renders with data-slot', () => {
    const { container } = render(<Command />);
    expect(container.querySelector('[data-slot=command]')).toBeInTheDocument();
  });

  it('renders CommandInput with search icon wrapper', () => {
    render(
      <Command>
        <CommandInput placeholder="Search..." />
      </Command>
    );
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toHaveAttribute('data-slot', 'command-input');
  });

  it('renders CommandList and CommandEmpty', () => {
    render(
      <Command>
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>
    );
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders CommandGroup with items', () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem>Item one</CommandItem>
            <CommandItem>Item two</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(screen.getByText('Item one')).toBeInTheDocument();
    expect(screen.getByText('Item two')).toBeInTheDocument();
  });

  it('renders CommandSeparator', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandSeparator />
        </CommandList>
      </Command>
    );
    expect(container.querySelector('[data-slot=command-separator]')).toBeInTheDocument();
  });

  it('renders CommandInput with accessible placeholder', () => {
    render(
      <Command>
        <CommandInput placeholder="Search for something" />
        <CommandList>
          <CommandGroup>
            <CommandItem>Apple</CommandItem>
            <CommandItem>Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(screen.getByPlaceholderText('Search for something')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });
});
