// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

const MOBILE_BREAKPOINT = 768;

function setupMatchMedia(innerWidth: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: innerWidth });
  const listeners: Array<() => void> = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: innerWidth < MOBILE_BREAKPOINT,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, fn: () => void) => { listeners.push(fn); },
      removeEventListener: (_: string, fn: () => void) => {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      },
      dispatchEvent: () => false,
    }),
  });
  return listeners;
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when window width is at the breakpoint (768px)', () => {
    setupMatchMedia(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when window width is below the breakpoint (767px)', () => {
    setupMatchMedia(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window width is above the breakpoint (1024px)', () => {
    setupMatchMedia(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('attaches and removes an event listener on mount/unmount', () => {
    const listeners = setupMatchMedia(1024);
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
