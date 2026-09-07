'use client';

import { useTransition } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { Switch, SwitchThumb } from '@/components/ui/switch';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { setTheme } from '@/lib/actions';

// Appearance, one click from anywhere (HIVE-91 §1 moved out of Settings).
//
// It lived in Settings → Appearance, which is three clicks and a tab away from
// a preference people flip on a whim. The sidebar footer is where the rest of
// the "about me, not about the work" furniture already sits.
//
// The pill carries one icon, on whichever half the thumb is NOT covering, and
// that icon names the theme you are in — moon while dark, sun while light. It
// runs larger than the stock 36x20 Switch and sits centred in the rail: at
// stock size the glyph read as a speck next to the thumb rather than its
// counterweight.
//
// Every gap in it is 3px — a 46x26 track with a 1px border and 3px of padding
// leaves a 38x18 content box, which holds the 18px thumb and the 14px icon with
// 3px between them and 3px to the content edges. That is why the thumb needs an
// explicit `translate-x-5` (20px of travel): the track is deliberately WIDER
// than the primitive's two-thumbs-and-a-hair, so the primitive's thumb-relative
// travel would stop the thumb short of the right-hand padding edge.
//
// Track stays neutral in both states: dark is the default for everyone, so a
// primary-filled track would put a permanent blue blob in the footer.
//
// The thumb is `primary-foreground` because that is the one token that does not
// flip between themes (oklch(0.99 …) in both) — a knob has to stay light on a
// dark track AND on a light one. `sidebar-foreground` inverts, which turned the
// thumb black the moment you switched to light.
//
// No client-side theme state. `setTheme` writes the cookie and revalidates the
// root layout, so the flip lands on the same render that reads the new value —
// same contract the Settings control used (lib/theme.ts).

type Theme = 'dark' | 'light';

export function ThemeSwitch({ theme }: { theme: Theme }) {
  const [pending, startTransition] = useTransition();
  const dark = theme === 'dark';
  const Icon = dark ? Moon : Sun;

  const toggle = () => {
    if (pending) return;
    startTransition(() => setTheme(dark ? 'light' : 'dark'));
  };

  return (
    <>
      {/* Expanded rail: the pill. */}
      <div className="flex justify-center px-3 py-1 group-data-[collapsible=icon]:hidden">
        <Switch
          checked={dark}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label="Dark mode"
          className="relative h-[26px] w-[46px] p-[3px] bg-sidebar-accent data-[state=checked]:bg-sidebar-accent"
        >
          <Icon
            weight="fill"
            aria-hidden
            className={`pointer-events-none absolute size-3.5 text-sidebar-foreground/70 ${dark ? 'left-[6px]' : 'right-[6px]'}`}
          />
          <SwitchThumb className="size-[18px] bg-primary-foreground data-[state=checked]:translate-x-5" />
        </Switch>
      </div>

      {/* Collapsed rail: no room for a 36px track, so the same toggle wears the
          shape of every other icon in the rail. A button names its action, not
          its state — hence "Light mode" while you are in dark. */}
      <SidebarMenuButton
        onClick={toggle}
        disabled={pending}
        tooltip={dark ? 'Light mode' : 'Dark mode'}
        className="hidden group-data-[collapsible=icon]:flex"
      >
        <Icon weight="regular" />
        <span>{dark ? 'Light mode' : 'Dark mode'}</span>
      </SidebarMenuButton>
    </>
  );
}
