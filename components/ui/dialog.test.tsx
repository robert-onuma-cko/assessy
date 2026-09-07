// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

describe('Dialog', () => {
  it('trigger renders and content is hidden initially', () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'dialog-trigger');
    expect(screen.queryByText('My Dialog')).not.toBeInTheDocument();
  });

  it('opens on trigger click and shows content', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title text</DialogTitle>
          <DialogDescription>Desc text</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Title text')).toBeInTheDocument();
    expect(screen.getByText('Desc text')).toBeInTheDocument();
  });

  it('shows close button by default and closes on click', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Closeable</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Closeable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Closeable')).not.toBeInTheDocument();
  });

  it('DialogHeader renders children with data-slot', () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>t</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>H</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('H').closest('[data-slot=dialog-title]')).toBeTruthy();
  });

  it('DialogFooter with showCloseButton renders a close button', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>t</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>F</DialogTitle>
          <DialogFooter showCloseButton>
            <span>content</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
