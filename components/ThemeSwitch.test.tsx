// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/lib/actions', () => ({
  setTheme: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@phosphor-icons/react', () => ({
  Moon: () => <svg data-testid="icon-moon" />,
  Sun: () => <svg data-testid="icon-sun" />,
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenuButton: ({ children, onClick, tooltip }: {
    children: React.ReactNode; onClick?: () => void; tooltip?: string;
  }) => (
    <button type="button" onClick={onClick} data-testid="collapsed-toggle" data-tooltip={tooltip}>
      {children}
    </button>
  ),
}));

import { ThemeSwitch } from './ThemeSwitch';
import { setTheme } from '@/lib/actions';

const mockSetTheme = setTheme as ReturnType<typeof vi.fn>;

describe('ThemeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads as checked while dark', () => {
    render(<ThemeSwitch theme="dark" />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'true');
  });

  it('reads as unchecked while light', () => {
    render(<ThemeSwitch theme="light" />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'false');
  });

  // The visible icon names the theme you are IN, not the one you are heading to.
  it('shows the moon while dark and the sun while light', () => {
    const { unmount } = render(<ThemeSwitch theme="dark" />);
    expect(screen.queryAllByTestId('icon-moon').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('icon-sun')).toBeNull();
    unmount();

    render(<ThemeSwitch theme="light" />);
    expect(screen.queryAllByTestId('icon-sun').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('icon-moon')).toBeNull();
  });

  it('flips dark → light', async () => {
    render(<ThemeSwitch theme="dark" />);
    await userEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('flips light → dark', async () => {
    render(<ThemeSwitch theme="light" />);
    await userEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  // The collapsed rail has no room for a 36px track, so the same toggle also
  // renders as a plain icon button. A button names its action, not its state.
  it('offers a collapsed icon button labelled with the action', async () => {
    render(<ThemeSwitch theme="dark" />);
    const collapsed = screen.getByTestId('collapsed-toggle');
    expect(collapsed).toHaveTextContent('Light mode');
    expect(collapsed).toHaveAttribute('data-tooltip', 'Light mode');
    await userEvent.click(collapsed);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
