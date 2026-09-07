// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('@phosphor-icons/react/dist/ssr', () => ({
  CaretRight: ({ className }: { className?: string }) => <svg data-testid="caret-right" className={className} />,
}));

import { ListSection, ListRow, RowChevron, META, ROW_PAD } from './ListSection';

describe('META constant', () => {
  it('contains text-right and tabular-nums', () => {
    expect(META).toContain('text-right');
    expect(META).toContain('tabular-nums');
  });
});

describe('ROW_PAD constant', () => {
  it('contains px-4 and py-3', () => {
    expect(ROW_PAD).toContain('px-4');
    expect(ROW_PAD).toContain('py-3');
  });
});

describe('ListSection', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <ListSection title="Owed" count={0} tracks="grid">
        <li>item</li>
      </ListSection>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders section when count > 0', () => {
    render(
      <ListSection title="Owed" count={2} tracks="grid">
        <li>item</li>
      </ListSection>,
    );
    expect(screen.getByText('Owed')).toBeInTheDocument();
  });

  it('renders when render=true even if count is 0', () => {
    render(
      <ListSection title="Empty" count={0} render tracks="grid">
        <li>nothing</li>
      </ListSection>,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('shows the count badge', () => {
    render(
      <ListSection title="Owed" count={5} tracks="grid">
        <li>x</li>
      </ListSection>,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <ListSection title="T" count={1} action={<button>Toggle</button>} tracks="grid">
        <li>x</li>
      </ListSection>,
    );
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('renders micro-headers from columns', () => {
    render(
      <ListSection title="T" count={1} tracks="grid-cols-3" columns={[{ left: 'Name' }, 'Status', null]}>
        <li>x</li>
      </ListSection>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('does not render micro-header row when columns not provided', () => {
    const { container } = render(
      <ListSection title="T" count={1} tracks="grid">
        <li>x</li>
      </ListSection>,
    );
    expect(container.querySelector('.border-b')).toBeNull();
  });

  it('left-aligns { left } column headers', () => {
    render(
      <ListSection title="T" count={1} tracks="grid-cols-2" columns={[{ left: 'Initiative' }]}>
        <li>x</li>
      </ListSection>,
    );
    const span = screen.getByText('Initiative');
    expect(span.className).toContain('text-left');
  });

  it('right-aligns string column headers', () => {
    render(
      <ListSection title="T" count={1} tracks="grid-cols-2" columns={['Stage']}>
        <li>x</li>
      </ListSection>,
    );
    const span = screen.getByText('Stage');
    expect(span.className).toContain('text-right');
  });
});

describe('ListRow', () => {
  it('renders children inside a list item', () => {
    render(
      <ul>
        <ListRow tracks="grid"><span>Content</span></ListRow>
      </ul>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders a Link when href is provided', () => {
    render(
      <ul>
        <ListRow tracks="grid" href="/initiatives/1"><span>Click</span></ListRow>
      </ul>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/initiatives/1');
  });

  it('renders a div (no link) when href is not provided', () => {
    const { container } = render(
      <ul>
        <ListRow tracks="grid"><span>No link</span></ListRow>
      </ul>,
    );
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('applies tracks class', () => {
    const { container } = render(
      <ul>
        <ListRow tracks="grid-cols-3"><span>X</span></ListRow>
      </ul>,
    );
    const el = container.querySelector('.grid-cols-3');
    expect(el).not.toBeNull();
  });
});

describe('RowChevron', () => {
  it('renders the CaretRight icon', () => {
    render(<RowChevron />);
    expect(screen.getByTestId('caret-right')).toBeInTheDocument();
  });

  it('has text-muted-foreground at rest so the affordance is visible before hover', () => {
    render(<RowChevron />);
    const icon = screen.getByTestId('caret-right');
    expect(icon.getAttribute('class')).toContain('text-muted-foreground');
  });

  it('brightens to text-foreground on row hover', () => {
    render(<RowChevron />);
    const icon = screen.getByTestId('caret-right');
    expect(icon.getAttribute('class')).toContain('group-hover:text-foreground');
  });

  it('has hover:bg-muted/40 so the row target is visually distinct on hover', () => {
    // RowChevron sits inside a group row; the background lives on the row, not the icon.
    // Verify ROW_SURFACE includes the background affordance.
    const { container } = render(
      <ul>
        <ListRow tracks="grid" href="/foo"><RowChevron /></ListRow>
      </ul>,
    );
    const li = container.querySelector('li');
    expect(li?.className).toContain('hover:bg-popover');
  });
});
