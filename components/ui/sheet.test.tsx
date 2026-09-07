// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

describe('Sheet', () => {
  it('trigger renders and content is hidden initially', () => {
    render(
      <Sheet>
        <SheetTrigger data-testid="trigger">Open sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'sheet-trigger');
    expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
  });

  it('opens on trigger click', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>Sheet Desc</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Sheet Title')).toBeInTheDocument();
    expect(screen.getByText('Sheet Desc')).toBeInTheDocument();
  });

  it('shows close button by default', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Closeable</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('applies side via data-side attribute', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent side="left" showCloseButton={false}>
          <SheetTitle>Left</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const content = await screen.findByText('Left');
    expect(content.closest('[data-slot=sheet-content]')).toHaveAttribute('data-side', 'left');
  });

  it('SheetHeader renders with data-slot', async () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>t</SheetTrigger>
        <SheetContent showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>H</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText('H').closest('[data-slot=sheet-title]')).toBeTruthy();
  });
});
