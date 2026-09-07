# Hive Design System

How Hive looks, feels, and behaves. The reference for every screen we build.

The model is **Linear**: fast, dense, keyboard-driven, calm. The brand is **Checkout.com**: deep navy, electric blue, clean type. We take Linear's principles and apply Checkout's identity. Default theme is **dark**.

This doc is the source of truth. When code and this doc disagree, the doc wins (or we update the doc on purpose). Tokens live in `app/globals.css`; this is where the reasoning behind them lives.

---

## 1. Principles

Seven rules. Every design decision traces back to one of them.

1. **Speed is the product.** The interface must feel instant. Optimistic updates, no spinners for sub-second work, no full-page reloads. A user should never wait to find out if their action worked. We already use `useTransition` for this. Keep it the default.

2. **Keyboard-first.** Power users live on the keyboard. Every primary action has a shortcut. `⌘K` opens a command menu. Navigation, creating an initiative, advancing a phase, approving all reachable without a mouse. The mouse is the fallback, not the path.

3. **Density with intent.** Show more, scroll less. Tight spacing, compact rows, small type for metadata. But density is not clutter: whitespace is used deliberately to group and separate. If a screen feels cramped, the fix is hierarchy, not padding everywhere.

4. **Calm surfaces, color for meaning.** The canvas is quiet: dark, near-monochrome, low-contrast chrome. Color is a signal, not decoration. Blue means "primary action" or "active". Green/amber/red mean status (RAG). A screen with five accent colors competing is a bug.

5. **Content over chrome.** Minimise borders and boxes. Lean on spacing, alignment, and subtle elevation to define structure. A hairline border or a one-step elevation change beats a heavy outline. Remove every line that isn't doing work.

6. **Motion is feedback, never decoration.** Transitions are fast (120–180ms) and exist to explain a change: a panel sliding in, a row settling after reorder, a state easing between colors. Nothing animates just to look alive. Respect `prefers-reduced-motion`.

7. **Consistency through tokens.** Never hardcode a color, space, or radius. Everything references a token. This is what makes the whole app feel like one product and lets us re-theme in one place. A raw hex or `bg-green-50` in a component is a defect (see §9).

---

## 2. Brand: Checkout.com, applied dark

Checkout's identity is a **deep navy/midnight base** with a **vivid electric blue** accent and clean, neutral type. That maps almost perfectly onto a Linear-style dark UI: the navy becomes our canvas, the electric blue becomes our primary.

- **Canvas is navy-black, not pure black.** A subtle blue tint in the dark surfaces ties the whole app to the brand and is easier on the eye than #000.
- **Electric blue is precious.** It marks the primary action, the active nav item, focus rings, and links. Don't spend it on anything else.
- **Type is neutral and tight.** Inter, with tight tracking on headings. No decorative or display faces.
- **Logo / wordmark** sits in the sidebar header only. It is not repeated across the UI.

Light theme exists and must remain usable (some users, screenshots, exports), but **dark is the design target**. Design dark first, then verify light.

---

## 3. Color

Tokens are authored in **oklch** (matches the existing `globals.css`). Hex equivalents are approximate, for reference only. Paste the oklch values into `:root` (light) and `.dark` (dark).

### 3.1 Dark theme (default)

Surfaces use three elevation tiers. Higher = lighter.

| Token | oklch | ~hex | Use |
|---|---|---|---|
| `--background` | `0.16 0.012 265` | `#0C0E18` | App canvas |
| `--card` / surface | `0.205 0.014 264` | `#161922` | Cards, sidebar, panels |
| `--popover` / raised | `0.245 0.016 264` | `#1F222D` | Popovers, menus, hover surfaces |
| `--foreground` | `0.98 0.003 247` | `#F7F8FA` | Primary text |
| `--muted-foreground` | `0.72 0.014 257` | `#A6ABB8` | Secondary text, labels |
| `--tertiary-foreground` | `0.55 0.02 257` | `#6E7585` | Faint metadata, placeholders |
| `--border` | `1 0 0 / 9%` | white 9% | Hairline dividers, input borders |
| (border-strong) | `1 0 0 / 14%` | white 14% | Emphasised separation |
| `--primary` | `0.62 0.20 262` | `#3B6FF6` | Primary actions, active, links, focus |
| `--primary-foreground` | `0.99 0.01 250` | `#FAFBFF` | Text on primary |
| `--ring` | `0.62 0.20 262` | `#3B6FF6` | Focus ring (= primary) |

### 3.2 Semantic / status

Used for RAG, approval decisions, and alerts. Each has a foreground (text/icon) and a low-alpha background tint. **Never** reach for raw Tailwind palette classes (`green-50`); use these tokens.

| Meaning | fg oklch | ~hex | RAG / decision mapping |
|---|---|---|---|
| `--success` | `0.72 0.17 152` | `#3FB57A` | On track · Go · Released |
| `--warning` | `0.80 0.16 85` | `#E0A93C` | At risk · Go-with-conditions |
| `--danger` / `--destructive` | `0.64 0.21 25` | `#E5484D` | Off track · No-go · Delete |
| `--info` | = `--primary` | `#3B6FF6` | Neutral/in-progress |

For tinted backgrounds, use the foreground color at low alpha (e.g. `success / 12%`), not a separate hardcoded shade. Define `--success-subtle`, `--warning-subtle`, `--danger-subtle` if needed, but derive them from the same hue.

### 3.3 Rules

- **One accent per view.** If primary blue is on screen, status colors must clearly read as a different category (they do: blue = action, green/amber/red = state).
- **Text contrast:** primary text ≥ 7:1 on canvas, secondary ≥ 4.5:1. Tertiary is for non-essential metadata only.
- **Status color always pairs with a non-color signal** (icon, label). Color alone is not an indicator (accessibility).
- **A `*-subtle` or alpha background takes the ACCENT colour as its text; only a SOLID fill takes the matching `*-foreground`.** `--success-foreground` is designed to sit on the solid `--success` fill — it is near-white in light mode and near-black in dark, and it is unreadable on the popover / canvas surface underneath a 12–15% wash. HIVE-128 shipped a toast that looked compliant (semantic tokens, no raw hex) with `bg-success-subtle` + `text-success-foreground` and rendered as near-white text on a near-white translucent wash in light mode. A subtle background takes `text-success` / `text-danger` / etc.; a filled `bg-success` takes `text-success-foreground`. Mixing them silently passes review and breaks readability, sometimes in only one theme.

---

## 4. Typography

One family for the UI: **Inter**. Mono is reserved for numbers and identifiers, not headings.

> Current code maps `--font-heading` to JetBrains Mono. That's a divergence (see §9). Headings should be Inter; mono is for tabular/technical content only.

| Role | Family | Size | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Page title (h1) | Inter | 24px / `text-2xl` | 600 | `-0.02em` | One per page |
| Section (h2) | Inter | 16–18px | 600 | `-0.01em` | |
| Subsection (h3) | Inter | 14px | 600 | normal | |
| Body | Inter | 14px / `text-sm` | 400 | normal | App default |
| Label / meta | Inter | 12px / `text-xs` | 500 | normal | `muted-foreground` |
| Micro | Inter | 11px / `text-2xs` | 500 | normal | Status chips, counts |
| Nano | Inter | 10px / `text-3xs` | 500 | normal | Badge counters, dot labels, slip counters |
| Numeric / ID | JetBrains Mono | inherit | 400 | normal | Use `tabular-nums` for aligned figures |

- **Default body is 14px.** This is a dense tool, not a marketing site. 16px is too big for our rows.
- **Line-height:** 1.4–1.5 for body, tighter (1.2) for headings.
- Use `tabular-nums` for any column of numbers (percentages, weeks, dates, money) so they align.

---

## 5. Spacing, grid, radius, elevation

### 5.1 Spacing — 4px base, 8px rhythm
All spacing is a multiple of 4px; prefer 8px steps. Tailwind: `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px.

- Inline gaps between related controls: `gap-2` (8px).
- Padding inside cards/panels: `px-4 py-3` (16/12).
- Section separation: `space-y-4` (16px) or a divider.
- Page padding: `p-6` (24px).

### 5.2 Radius
Scale already defined in `globals.css` off `--radius: 0.625rem`. Use the semantic steps:
- Inputs, buttons, chips: `rounded` / `rounded-md`.
- Cards, panels, popovers: `rounded-lg`.
- Avoid `rounded-full` except avatars and dot indicators.

### 5.3 Elevation
Dark UI elevates by **lightening the surface**, not by heavy shadows.
- Canvas → card: step up one surface tier (§3.1).
- Card → popover/menu: step up again + a soft shadow (`shadow-md` max).
- Hover on a clickable surface: lighten by one half-step or `bg-muted/40`.
- No drop shadows on flat content. Shadows are for floating layers only.

**Light UI elevates by approaching white** — the inversion of the dark scheme. Higher = closer to the light, in both themes, which keeps this one rule and not two conventions.
- Canvas is the tinted tier (Checkout navy hue kept, so the brand tie the dark canvas carries survives into light); card is white; popover shares white with card and is distinguished by a soft shadow (`shadow-md`).
- Hover on a clickable surface: `bg-muted/40` still works — the tinted canvas gives it a visible step against the white row.

### 5.4 Layout
- **Sidebar + content.** Fixed-width collapsible sidebar (already present), content fills the rest.
- **Reading width.** Detail/form content caps at ~`max-w-5xl`. Tables and boards go full width.
- **Sticky context.** Page header and key meta stay visible on scroll where it aids orientation.

---

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | Default easing |
| duration-fast | 120ms | Hover, color, small state |
| duration-base | 160ms | Panels, tabs, expand/collapse |
| duration-slow | 240ms | Larger layout shifts (rare) |

- Default transition: `transition` at ~150ms with the standard ease.
- Animate `opacity`, `transform`, `background-color`. Avoid animating layout-affecting props (width/height) unless necessary.
- **Always honor `prefers-reduced-motion: reduce`** — drop to instant or near-instant.

---

## 7. Components

Conventions for the shadcn primitives we use. Build new components to match these, not the other way around.

### Buttons
- **Primary** — `bg-primary text-primary-foreground`. One per context (the main action). Used for: create, save, advance, confirm.
- **Secondary** — bordered/`bg-card`, neutral text. Supporting actions.
- **Ghost** — no border/bg until hover. Toolbar and inline actions.
- **Destructive** — `--danger`. Delete, No-go. Often needs confirmation.
- Sizes: default `h-9 px-3 text-sm`; compact `h-8 px-2.5 text-xs` for dense toolbars.
- **Disabled is a different control, not a faded one.** `bg-muted` surface, `text-muted-foreground`, no border, no brand fill, no pointer. A half-strength primary keeps its shape *and* its electric blue, so it still reads as the main action — which is how "Confirm Treasury is ready for beta" looked clickable when it wasn't. The variants with no fill at rest (ghost, link) must not *gain* one when disabled: they keep the muted text and lose the hover.
- **A disabled primary always states its reason next to it** ("Still needed above: Solution design."). A quiet button plus a reason is the pattern; neither half alone, because a control with no affordance and no explanation is just a dead end. But disable only for **permission or state** — never for an unfinished form. Form completeness is reported by pressing the button (see Required and optional), because a disabled primary can only ever summarise the gaps, and the create page's summarised one of four.
- **Form and sheet footers are one row — explanatory text left, actions right, primary rightmost.** `flex flex-wrap items-center justify-between gap-3`, with the actions in an `ml-auto` cluster so they stay right when there is nothing to explain. Secondary before primary (`[ Cancel ] [ Create initiative ]`), matching the sheet footers. The reason line sits beside the button it explains, never after the escape hatch: primary-first, left-aligned footers put the explanation furthest from the control it is about.
- Loading swaps label to a verb-ing state ("Saving…") rather than only a spinner.
- **Row actions are buttons, not text links.** `ghost` at compact size (`size="xs"`) for the inline `edit` / `confirm` / `remind` verbs in a list. Bare coloured text is undiscoverable and its hit target is the label alone; ghost has no border or fill until you reach it, so twenty rows stay calm. A **block-level** action that summarises the row actions under it (`remind all (28)`) is the same variant and size, never a heavier one — the summary must not outrank what it summarises.

### Inputs, textareas, selects
- `bg-background border rounded px-2.5 py-1.5 text-sm`.
- Focus: `ring-1 ring-primary`, no heavy glow.
- Labels: `text-xs font-medium text-muted-foreground` above the field.
- Group a label + field with `space-y-1.5`.
- Inline edit is a first-class pattern (`InlineEdit*`): click value → field, blur/Enter saves optimistically, Esc cancels.

### Required and optional (HIVE-155)

**Every field is required unless it says otherwise.** There is no required marker anywhere in the app — no asterisk, no word, no colour. A marker on the majority case is a marker on almost every field, which means the user reads every label to learn nothing. We used to carry both markers at once, in one case on the same list of rows.

- **Only the exception is labelled**, with `<OptionalTag />` — a muted chip, `Optional`, beside the label. It is the ONLY marker in the system. Never `*`, never `(optional)` inside the label string, never `— optional` in tinted text; those four styles all existed at once before this rule.
- **A form's primary is never disabled for incompleteness.** It is live, and pressing it names every gap at once: the label turns `text-danger` and an `X is required` line appears under the control. Nothing is red until the user acts — a fresh form is calm.
- **Disabled still means "you may not do this"** — no rights, a locked stage, an action in flight — and it still owes a reason beside it (see Buttons). It never means "you haven't finished". Those are different sentences and they were being said with the same control.
- **Guidance above the control, verdict below it.** The hint tells you how to answer, so it has to arrive before you do; the message only exists because you already acted. `Field` enforces the order.
- **Build it with `components/FormField`**, never by hand: `ValidatedForm` (or `ValidationProvider`) + `Field` + `OptionalTag`, with the rules in `lib/form-validation`. A form that hand-rolls a label is how the five styles happened.
- Client validation is an **affordance, not a gate** — the server action enforces the same rule independently (AGENTS.md), so a bypass loses the message, not the invariant.

One deliberate exception: a **gate requirement row** keeps its `Optional` chip because required-ness there is per-row configuration (`/settings`), not a property of the surface — a reader genuinely cannot infer it. It still marks only the exception.

### Cards & panels
- `rounded-lg border bg-card`. Header `px-4 py-3 border-b bg-muted/20`, body `px-4 py-3`.
- Internal sections separated with `divide-y`, not nested borders.

### Lists & tables
- Compact rows: `px-4 py-3`, `divide-y` between. Authored once as `ROW_PAD` in `components/ListSection`, so every list in the app breathes the same amount. 12px of vertical air, not 16 — the portfolio scans twenty initiatives and pays for every pixel, and a per-page override would defeat the point of having one number.
- Row hover: `hover:bg-popover` (the full elevation step from §5.3, implemented as `ROW_SURFACE` in `components/ListSection.tsx`); selected: `bg-muted/50`.
- Right-align numeric columns with `tabular-nums`.
- Lead each row with the identity (name/title); push metadata and status to the right.

### Badges / chips / status
- Small, `text-[11px] font-medium`, low-alpha tinted bg from the semantic token.
- Always icon-or-shape + text for status, never color alone. RAG uses a filled dot + label.
- **`Badge` carries five semantic variants — `success` · `warning` · `danger` · `info` · `neutral` — and every lifecycle state in the app renders through one of them.** Each pairs a §3.2 foreground token with its own `-subtle` tint and a filled dot in `currentColor`, so a variant cannot gain a colour without gaining its shape. Anything that needs "approved, green" asks `Badge` for it; a component that hand-rolls one is the drift §11 closed, reopening.
- A **grade** is not a state. The AI scope grade (`Not passed · 60/100`) keeps its own chip on purpose: different object, visibly different.

### Tabs
- Radix tabs (existing). Underline or subtle filled active state in `--primary` / `--foreground`. Inactive = `muted-foreground`.

### Navigation (sidebar)
- Active item: `--primary` text + subtle raised surface. Inactive: `muted-foreground`, hover lightens.
- Wordmark in the header. Sections grouped with small `text-xs` labels.
- **The footer holds what is about you, not about the work** — Settings, then the appearance pill. Nothing that belongs to an initiative goes down there.

### Switches
- `Switch` is the two-state primitive: a 36×20 track, a 16px thumb, `bg-primary` when on and `bg-input` when off. Reach for it when the choice is binary and reversible; a segmented control is for a choice you want to *read* at a glance, a switch for one you want to *flip*.
- A switch is named by its state, not its action (`aria-label="Dark mode"`, not "Switch to dark"). A button that does the same job is named by its action — the collapsed appearance toggle is exactly that pair.
- **The appearance pill** (`ThemeSwitch`, sidebar footer) runs larger than stock and sits **centred** in the rail rather than gutter-aligned with the nav rows above it. At stock size the glyph read as a speck beside the thumb; it has to be the thumb's counterweight, because the two of them are the whole control. Its every gap is **3px**: a 46×26 track with a 1px border and 3px of padding leaves a 38×18 content box holding the 18px thumb and the 14px icon, 3px apart and 3px from the content edges. A wider-than-stock track means the thumb's travel is no longer thumb-relative, so it carries an explicit `translate-x-5`. All of this lives on the pill, not on the primitive — the next switch in the app inherits stock proportions. It keeps a neutral track in both states: dark is the default for everyone, so `bg-primary` would park a permanent blue blob in the footer. One icon rides the half of the track the thumb is not covering, and it names the theme you are in — moon while dark, sun while light. Its thumb is `bg-primary-foreground`, the one near-white token that does *not* invert between themes: a knob has to stay light on a dark track and on a light one, and `sidebar-foreground` turns black the moment you flip.

### People
- Always `PersonPicker` / `displayPerson` against the directory. Store emails, render names. Never free-text a person.

### Empty & loading states
- Empty: one line of what's missing + the action to fix it, centered, `muted-foreground`. No giant illustrations.
- Loading: prefer optimistic render. Where unavoidable, skeletons that match final layout over spinners.

---

## 8. Interaction patterns

- **Optimistic by default.** Mutate the UI immediately, reconcile with the server, roll back on error. `useTransition` + server actions.
- **Inline over modal.** Edit in place; reserve dialogs for destructive confirms and genuinely separate flows.
- **Keyboard.** `⌘K` command menu (target). Enter submits, Esc cancels, arrow keys move selection in lists. Visible focus ring on every focusable element.
- **Confirmation only when irreversible.** Delete, No-go, anything that can't be undone. Everything else is undoable, so just do it (with an undo affordance where practical).
- **Errors are inline and specific.** Show the failure next to the thing that failed, in `--danger`, with what to do. No silent failures, no generic toasts for field-level problems.

---

## 9. Accessibility

- **Contrast:** body text ≥ 4.5:1, large/bold ≥ 3:1, primary text aims for 7:1. Test both themes.
- **Never color-only.** Status, RAG, validity all carry an icon, shape, or text label in addition to color.
- **Focus visible** on all interactive elements (`ring-1 ring-primary`). Don't remove outlines without replacing them.
- **Keyboard reachable:** every action that works with a mouse works with a keyboard.
- **Reduced motion** respected (§6).
- Semantic HTML and ARIA where the primitive doesn't provide it.

---

## 10. Do / Don't (quick reference)

**Do**
- Reference tokens for every color, space, radius.
- Design dark first, then check light.
- Make the primary action obvious and singular.
- Use density: small type for metadata, compact rows.
- Make it feel instant (optimistic).
- Use `tabular-nums` for numbers.

**Don't**
- Hardcode hex or use raw palette classes (`bg-green-50`, `text-amber-700`). Use semantic tokens.
- Spend the primary blue on non-actions.
- Stack borders and boxes; prefer spacing and elevation.
- Animate for decoration.
- Put a person's name in as free text.
- Ship a heading in a mono font.

---

## 11. Open divergences to fix

Tracked items where the current build doesn't yet match this doc (kept honest, updated as we close them):

- [x] Mono (`JetBrains_Mono`) was mapped to `--font-heading`. Now `--font-mono`; `--font-heading` = Inter.
- [x] App was light-by-default. `dark` set on `<html>` as default; light verified still usable.
- [x] Dark surface tokens retuned to the navy-tinted tiers in §3.1; primary set to Checkout blue.
- [x] Semantic status tokens added (`success`/`warning`/`danger`/`info` + `-subtle` + `-foreground`) and registered in `@theme`.
- [x] `GatesPanel` and the initiatives list migrated off hardcoded palette classes to semantic tokens.
- [x] Orphaned components (`MetaSidebar`, `WorkstreamBreakdown`, `TeamSignoff`) carried hardcoded RAG/status colors. All three deleted rather than migrated — nothing imported them, and their jobs belong to the Overview properties rail. No hardcoded palette classes are left outside `components/ui/*`.
- [ ] `⌘K` command menu not built yet (§8 keyboard-first target).
- [x] Micro (11px) and Nano (10px) rem-based tokens (`text-2xs`, `text-3xs`) added to the type scale; every hardcoded `text-[Npx]` in `app/`+`components/` swept to them, so browser font-size scaling now applies to the smallest text too (HIVE-90, WCAG 1.4.4).
- [x] Light theme reachable via a cookie-backed toggle; dark stays the default. The toggle started life in **Settings → Appearance** and moved to the **sidebar footer** as a `Switch` pill — a preference people flip on a whim should not cost three clicks and a tab. Settings lost its Appearance tab with it. Light `:root` retuned with the three-tier inversion (canvas tinted → card white → popover white + shadow), and `--tertiary-foreground` promoted from an alpha ladder on `--muted-foreground` to its own token (HIVE-91).
