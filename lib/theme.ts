import { cookies } from 'next/headers';

// The theme is stored in a cookie so the root layout can read it during
// server render — every page here is server-rendered, and a client-side read
// would flash the wrong theme on every navigation. next-themes ships a
// no-flash inline script; a cookie read is ~20 lines and keeps the app fully
// server-rendered (HIVE-91 §1).
//
// Dark is the default: an unset or invalid cookie value falls back to dark
// (design.md §2 — the design target). Light is an explicit opt-in, not an OS
// preference match: following the OS would silently ship the least-verified
// theme to everyone on a light Mac.

export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'assessy-theme';
export const DEFAULT_THEME: Theme = 'dark';

export async function readTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === 'light' ? 'light' : DEFAULT_THEME;
}

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}
