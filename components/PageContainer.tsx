// The one centered frame that owns page geometry (globals.css layout tokens).
//
// Before this, every page did its own layout: capped content hugging the left,
// and on the initiative page a rail pinned to the viewport's right edge with a
// dead void between the two. Content and rail now sit adjacent inside one
// centered max-width frame.
//
// The content column caps at --page-max-w whether or not a rail is present —
// with a rail the frame widens by --rail-w + --content-gap, so adding a rail
// never squeezes the content. Insets are the viewport-relative clamps from
// globals.css (P4.3): the rail's right inset is the content's left inset, so
// nothing renders against an edge at any width.

export function PageContainer({
  rail,
  children,
  className = '',
  narrow = false,
}: {
  /** Right rail, rendered adjacent to the content inside the same frame. */
  rail?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes for the content column (e.g. `space-y-(--section-gap)`). */
  className?: string;
  /**
   * Cap the content column at `--page-max-w-inbox` instead of `--page-max-w`.
   * For pages that are a queue rather than a table — a row of a handful of
   * fixed metadata tracks turns the full width into a void (P6.2). The frame
   * still owns the geometry; the page only says which cap it wants, so the
   * number stays in globals.css beside the rest.
   */
  narrow?: boolean;
}) {
  // Overriding the token (rather than swapping the class) keeps ONE expression
  // for the frame width, rail or no rail.
  const cap = narrow
    ? ({ '--page-max-w': 'var(--page-max-w-inbox)' } as React.CSSProperties)
    : undefined;

  // The caps include the horizontal inset (border-box): the inset must never
  // be paid for out of the content column's width.
  if (!rail) {
    return (
      <div
        style={cap}
        className="mx-auto w-full max-w-[calc(var(--page-max-w)+2*var(--page-pad-x))] px-(--page-pad-x) py-(--page-pad-y)"
      >
        <div className={className}>{children}</div>
      </div>
    );
  }

  return (
    <div
      style={cap}
      className="mx-auto flex w-full max-w-[calc(var(--page-max-w)+var(--rail-w)+var(--content-gap)+2*var(--page-pad-x))] items-start gap-(--content-gap) px-(--page-pad-x) py-(--page-pad-y)"
    >
      <div className={`min-w-0 max-w-(--page-max-w) flex-1 ${className}`}>{children}</div>
      {/* Sticky below the global top bar (h-12, sticky since P4.4), offset by
          the vertical inset. Hidden where the frame can't hold both. */}
      <aside className="sticky top-[calc(3rem+var(--page-pad-y))] hidden max-h-[calc(100vh-3rem-2*var(--page-pad-y))] w-(--rail-w) shrink-0 overflow-y-auto lg:block">
        {rail}
      </aside>
    </div>
  );
}
