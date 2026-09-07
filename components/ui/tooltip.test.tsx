// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

describe('TooltipProvider', () => {
  it('renders children', () => {
    render(
      <TooltipProvider>
        <span data-testid="child">child</span>
      </TooltipProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('Tooltip', () => {
  it('renders trigger without content visible initially', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent>tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText('hover me')).toBeInTheDocument();
    expect(screen.queryByText('tip text')).not.toBeInTheDocument();
  });

  it('shows content after hover on trigger', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent sideOffset={0}>tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    await userEvent.hover(screen.getByText('hover me'));
    // Wait for Radix to transition the tooltip into open state.
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slot=tooltip-content]');
      expect(el).not.toBeNull();
    }, { timeout: 2000 });
    expect(document.querySelector('[data-slot=tooltip-content]')).toBeInTheDocument();
  });

  it('trigger has data-slot attribute', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="trigger">t</TooltipTrigger>
          <TooltipContent>c</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'tooltip-trigger');
  });
});
