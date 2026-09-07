'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Theme the toaster with our semantic tokens so notifications match the design
// system. No hardcoded palette / hex — design.md rule.
//
// HIVE-128 (three separate defects, one PR):
//
//   1. The success / error variants USED to override `bg-popover` (opaque)
//      with `!bg-success-subtle` / `!bg-danger-subtle`. Those tokens are the
//      accent at 12–15% alpha, so the toast lost its background and became
//      a translucent wash — the page underneath bled through the words.
//      Fix: keep the opaque `bg-popover` and use the subtle token on the
//      border only, as a coloured hairline. A toast has to sit over content;
//      being over content while being transparent is the bug.
//
//   2. The text colour used to be `--success-foreground` / `--danger-foreground`,
//      which are near-white in light and near-black in dark. Both are correct
//      on the SOLID accent fill (that's what `*-foreground` MEANS), and both
//      are wrong on the popover surface underneath. Fix: use the accent
//      itself as text — `text-success` / `text-danger` — which is the colour
//      pairing every other subtle-tinted surface in the app already uses.
//
//   3. `theme` used to be hardcoded to "dark". readTheme()/assessy-theme cookie
//      resolves a real preference now (light is an explicit opt-in), so the
//      hardcoded value made light-mode users get a dark-mode toaster.
//      Fix: take `theme` as a prop and default to `system` (Sonner's own
//      auto-detect) — the caller in app/layout.tsx passes the resolved
//      cookie theme through, so the toaster follows the page it sits on.
//
// design.md rule to enshrine (added in this ticket): a `*-subtle` background
// takes the ACCENT colour as its text; only a solid fill takes the matching
// `*-foreground`. This bug looked compliant because it used semantic tokens
// throughout — the mismatch was invisible unless you knew which foreground
// pairs with which background.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground ' +
            'group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // Coloured hairline on the opaque popover surface, accent-coloured
          // text on top. NO `!bg-*-subtle`: that was the transparency bug.
          error:
            'group-[.toaster]:!border-danger group-[.toaster]:!text-danger',
          success:
            'group-[.toaster]:!border-success group-[.toaster]:!text-success',
        },
      }}
      {...props}
    />
  );
}
