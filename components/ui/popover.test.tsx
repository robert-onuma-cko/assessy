// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover';

describe('Popover', () => {
  it('trigger renders and content is hidden initially', () => {
    render(
      <Popover>
        <PopoverTrigger data-testid="trigger">open</PopoverTrigger>
        <PopoverContent>popover content</PopoverContent>
      </Popover>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'popover-trigger');
    expect(screen.queryByText('popover content')).not.toBeInTheDocument();
  });

  it('opens on trigger click', async () => {
    render(
      <Popover>
        <PopoverTrigger>open</PopoverTrigger>
        <PopoverContent>popover content</PopoverContent>
      </Popover>
    );
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText('popover content')).toBeInTheDocument();
    expect(screen.getByText('popover content').closest('[data-slot=popover-content]')).toBeTruthy();
  });
});

describe('PopoverHeader, PopoverTitle, PopoverDescription', () => {
  it('render with correct data-slot attributes', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>t</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>My Title</PopoverTitle>
            <PopoverDescription>My desc</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
    );
    expect(screen.getByText('My Title').closest('[data-slot=popover-title]')).toBeTruthy();
    expect(screen.getByText('My desc').closest('[data-slot=popover-description]')).toBeTruthy();
  });
});

describe('PopoverAnchor', () => {
  it('renders with data-slot', () => {
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor" />
        <PopoverTrigger>t</PopoverTrigger>
        <PopoverContent>c</PopoverContent>
      </Popover>
    );
    expect(screen.getByTestId('anchor')).toHaveAttribute('data-slot', 'popover-anchor');
  });
});
