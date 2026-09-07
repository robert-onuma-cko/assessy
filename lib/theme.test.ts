import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { readTheme, isTheme, DEFAULT_THEME, THEME_COOKIE } from './theme';
import { cookies } from 'next/headers';

const mockCookies = cookies as ReturnType<typeof vi.fn>;

describe('isTheme', () => {
  it('returns true for "dark"', () => {
    expect(isTheme('dark')).toBe(true);
  });

  it('returns true for "light"', () => {
    expect(isTheme('light')).toBe(true);
  });

  it('returns false for other strings', () => {
    expect(isTheme('blue')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTheme(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('DEFAULT_THEME', () => {
  it('is "dark"', () => {
    expect(DEFAULT_THEME).toBe('dark');
  });
});

describe('THEME_COOKIE', () => {
  it('is "assessy-theme"', () => {
    expect(THEME_COOKIE).toBe('assessy-theme');
  });
});

describe('readTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "light" when cookie is "light"', async () => {
    mockCookies.mockResolvedValue({ get: () => ({ value: 'light' }) });
    expect(await readTheme()).toBe('light');
  });

  it('returns DEFAULT_THEME when cookie is "dark"', async () => {
    mockCookies.mockResolvedValue({ get: () => ({ value: 'dark' }) });
    expect(await readTheme()).toBe('dark');
  });

  it('returns DEFAULT_THEME when cookie is not set', async () => {
    mockCookies.mockResolvedValue({ get: () => undefined });
    expect(await readTheme()).toBe(DEFAULT_THEME);
  });

  it('returns DEFAULT_THEME for an invalid cookie value', async () => {
    mockCookies.mockResolvedValue({ get: () => ({ value: 'blue' }) });
    expect(await readTheme()).toBe(DEFAULT_THEME);
  });
});
