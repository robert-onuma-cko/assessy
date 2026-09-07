// The one page-header pattern (design.md §3.1: "what you owe, before what this
// is"). Title, then a prescriptive first line — the lede slot is where a page
// says what the reader owes, not what the page is. Every top-level page uses
// this; per-page header markup is a defect.

export function PageHeader({
  title,
  lede,
  actions,
  backLink,
}: {
  title: string;
  /** The first line under the title. Prescriptive where the page can be ("You
   *  owe 3"), descriptive only where there is nothing to owe. */
  lede?: React.ReactNode;
  /** Right-aligned actions (one primary per page). */
  actions?: React.ReactNode;
  /** Small link row above the title (e.g. "← Settings"). */
  backLink?: React.ReactNode;
}) {
  return (
    // flex-wrap, and the title block claims a real minimum (basis-72): a wide
    // action cluster wraps to its own row instead of squeezing the title into
    // a one-word column — the P3.1 truncation bug, fixed at the pattern level.
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1 basis-72">
        {backLink}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {lede && <p className="mt-1 text-sm text-muted-foreground">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{actions}</div>}
    </header>
  );
}
