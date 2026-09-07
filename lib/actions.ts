'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { THEME_COOKIE, isTheme, type Theme } from '@/lib/theme';
import { requireActor } from '@/lib/permissions';
import { createRequest } from '@/lib/services/request-service';

// Server actions are thin: resolve actor → permission → service → revalidate
// (Hive AGENTS.md convention). Every action authenticates independently — an
// action is a public HTTP endpoint regardless of which button renders it.

export async function setTheme(theme: Theme) {
  await requireActor();
  if (!isTheme(theme)) throw new Error('Invalid theme');
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  // Every page reads the cookie in the root layout, so refresh the whole tree.
  revalidatePath('/', 'layout');
}

export async function submitRequest(formData: FormData) {
  const actor = await requireActor();

  const need = String(formData.get('need') ?? '').trim();
  // Server-side enforcement of the same rule the ValidatedForm checks —
  // client validation is an affordance, never the gate.
  if (!need) throw new Error('Description is required.');

  const id = await createRequest({
    requesterEmail: actor.email,
    need,
    activeDisruption: formData.get('activeDisruption') === 'on',
    evidenceLinks: String(formData.get('evidenceLinks') ?? ''),
    timing: String(formData.get('timing') ?? ''),
  });

  revalidatePath('/');
  redirect(`/requests/${id}`);
}
