import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL requires explicit cleanup in Vitest — the auto-cleanup global is not
// picked up by default because Vitest doesn't set window.afterEach the way
// jest does.
afterEach(() => {
  cleanup();
});

// Radix UI primitives (Tooltip, Popover, etc.) use ResizeObserver internally.
// jsdom doesn't implement it; provide a no-op stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom doesn't implement matchMedia; provide a minimal stub for hooks that
// use window.matchMedia (e.g. useIsMobile, cmdk).
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// cmdk calls scrollIntoView on selected items; jsdom doesn't implement it.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}
