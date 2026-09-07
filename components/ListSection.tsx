import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';

// The list furniture of design.md principle 11 — "structure comes from surfaces
// and tracks, not per-cell borders".
//
// Built for My Work in P6.2 and local to that page until the portfolio (P6b)
// became the second consumer. It is deliberately ONE file: a section card, the
// rows inside it and the micro-header over them are not three patterns, they are
// one, and the whole point is that a section's header and its rows share a
// single column-tracks string. Splitting them invites a page to use half of it.
//
// What it gives a list:
//
//   · ONE card surface per section (bg-card, rounded-lg, one subtle border,
//     hairline separators between rows, overflow-hidden so a row's hover surface
//     and focus ring clip to the radius). The label and count sit ABOVE the card
//     on the canvas with no horizontal inset, lining up with the card's left
//     edge and the page title. The section becomes an object the eye can hold.
//   · FIXED COLUMN TRACKS, passed in per section: the title flexes, metadata is
//     fixed-width, right-aligned and tabular-nums. A one-row section reads
//     exactly like a twenty-row one instead of stretching its metadata across
//     the page.
//   · A micro-header for tabular sections only — a header over a verb-first list
//     labels the obvious.
//   · Hover as an honest affordance: a full elevation step (card → popover,
//     design.md §5.3), the chevron brightening, the whole row as the target, and
//     a focus ring for the keyboard.
//
// Still banned, per the principle: per-cell boxes, double borders, and borders
// doing work that spacing already does.
//
// What is NOT here: the tracks themselves. Column widths are sized to the
// longest real value a given list holds, so they are page data, not furniture —
// each consumer declares them once and hands the same string to its section and
// its rows.

/** Right-aligned, fixed-width metadata. The default tone for one such cell. */
export const META = 'truncate text-right text-xs text-muted-foreground tabular-nums';

/**
 * Row padding. On the grid (or the link wrapping it), never on the `<li>`, so a
 * whole-row link actually fills the row it claims to be.
 *
 * 12px of vertical air, up from 8px (P9 §4). Every list moves together because
 * every list consumes this, which is the only reason the change is worth making
 * — a per-page override would destroy exactly that property. Not the wireframe's
 * 16px: the trade is air per row against rows per screen, and it lands
 * differently on the two consumers (My Work shows a handful of things you owe;
 * the portfolio exists to scan twenty initiatives and pays for every pixel). At
 * 16px the portfolio would want its own tighter value. 12px is felt, and it is
 * still one number.
 *
 * Air around the text, never bigger text — the 14px body of design.md §4 is
 * unchanged.
 */
export const ROW_PAD = 'px-4 py-3';
/** The horizontal half of ROW_PAD, for the micro-header over the rows: the
 *  header and its columns MUST share one inset or the tracks don't line up. */
const ROW_PAD_X = 'px-4';

// The row's surface lives on the <li>, so hover and keyboard focus light the
// WHOLE row whichever element inside it was hit. The step is card → popover
// (§5.3 — dark UI elevates by lightening the surface), not a tint you have to
// look for, and the ring is inset so the card's radius can't clip it.
const ROW_SURFACE =
  'group relative transition-colors duration-150 hover:bg-popover '
  + 'focus-within:bg-popover focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring';

/**
 * One row on a section card.
 *
 * With `href` the row IS the link: it fills the `<li>`, which makes every pixel
 * a target and the link's accessible name the whole row. Without one, the caller
 * owns the interior — the shape a row needs when it holds a real button, since a
 * button inside an `<a>` is not a button. Such a row stretches its own link over
 * the surface with a pseudo-element instead (see My Work's owed row).
 *
 * `tracks` must be the same string the section's micro-header was given. That
 * shared string IS the alignment guarantee, rather than a convention each row is
 * trusted to honour.
 */
export function ListRow({
  tracks,
  href,
  children,
}: {
  tracks: string;
  href?: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <li className={ROW_SURFACE}>
        <div className={`${tracks} ${ROW_PAD}`}>{children}</div>
      </li>
    );
  }
  return (
    <li className={ROW_SURFACE}>
      <Link href={href} className={`block outline-none ${ROW_PAD}`}>
        <span className={tracks}>{children}</span>
      </Link>
    </li>
  );
}

/**
 * The row's affordance, not decoration: muted at rest, foreground on hover or
 * keyboard focus, so the row visibly becomes a target rather than merely
 * tinting. Belongs in the last, narrow track of every row's grid.
 */
export function RowChevron() {
  return (
    <CaretRight
      weight="bold"
      // `group-focus-within`, not `group-focus-visible`: the <li> carrying the
      // group class is never itself focusable — what gains focus is the link
      // inside it.
      className="h-3 w-3 text-muted-foreground transition-colors duration-150 group-hover:text-foreground group-focus-within:text-foreground"
    />
  );
}

/**
 * One micro-header label. Alignment follows the cell it labels, which is the
 * only way a header can sit over its own column: fixed metadata cells are
 * right-aligned, and the flexing title cell is left-aligned. A right-aligned
 * header over a flexing track lands at the far end of it, nowhere near the
 * values — which is exactly what it did before this took an `align`.
 */
function MicroHeader({ align, children }: { align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <span
      className={`truncate text-2xs font-medium uppercase tracking-wider text-tertiary-foreground ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A titled list section: label and count on the canvas, rows on one card below.
 *
 * The card carries the only borders in the section — its own outline and the
 * hairlines between its rows. No per-cell boxes, and nothing bordering what the
 * gap between sections already separates.
 *
 * An empty section renders NOTHING at all — no heading, no placeholder card. A
 * page says "nothing here" once, in its lede, instead of once per list.
 */
export function ListSection({
  title,
  count,
  action,
  tracks,
  columns,
  render,
  children,
}: {
  title: string;
  count: number;
  /** Right-aligned control beside the label, on the canvas (e.g. a toggle). */
  action?: React.ReactNode;
  /** The section's grid tracks — the same string every row is given. */
  tracks?: string;
  /**
   * Micro-header labels, one per track. `null` is a track that needs no label
   * (an icon, the chevron). A plain string is right-aligned, to sit over a fixed
   * metadata cell. Wrap it as `{ left: 'Initiative' }` for the flexing title
   * track, whose values are left-aligned — a right-aligned header there lands at
   * the far end of the track, nowhere near the names underneath it.
   *
   * Omit entirely on a verb-first list, where the verb already says what a
   * header would. Requires `tracks`.
   */
  columns?: readonly (string | null | { left: string })[];
  /** Overrides the count for the render decision — for a list that must render
   *  while showing no rows, e.g. a receipt window hiding everything it has. */
  render?: boolean;
  children: React.ReactNode;
}) {
  if (!(render ?? count > 0)) return null;
  return (
    <section className="space-y-1.5">
      {/* No horizontal inset: the label lines up with the card's edge below it
          and the page title above it, so the section reads as one block. */}
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-3xs normal-case tabular-nums text-muted-foreground">
          {count}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {/* overflow-hidden so a row's hover surface and focus ring clip to the
          card's radius instead of squaring off its corners. */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {columns && tracks && (
          <div className="border-b bg-card">
            <div className={`${tracks} ${ROW_PAD_X} py-1.5`}>
              {columns.map((label, i) => {
                if (label === null) return <span key={i} />;
                return typeof label === 'string'
                  ? <MicroHeader key={i} align="right">{label}</MicroHeader>
                  : <MicroHeader key={i} align="left">{label.left}</MicroHeader>;
              })}
            </div>
          </div>
        )}
        <ul className="divide-y">{children}</ul>
      </div>
    </section>
  );
}
