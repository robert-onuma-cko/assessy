'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from './button';

type TruncatedTextProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  text: string;
  lines?: number;
  moreLabel?: string;
  lessLabel?: string;
};

function TruncatedText({
  text,
  lines = 3,
  moreLabel = 'Show more',
  lessLabel = 'Show less',
  className,
  ...rest
}: TruncatedTextProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // Re-measure on every render. The functional setState bails out when the
  // value is unchanged, so this does not cause an infinite update loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const next = el.scrollHeight - el.clientHeight > 1;
    setOverflows((prev) => (prev === next ? prev : next));
  });

  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const next = el.scrollHeight - el.clientHeight > 1;
      setOverflows((prev) => (prev === next ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamped = !expanded && overflows;

  return (
    <div data-slot="truncated-text" className={cn('text-sm text-foreground', className)} {...rest}>
      <div
        ref={bodyRef}
        data-slot="truncated-text-body"
        data-clamped={clamped ? 'true' : 'false'}
        className={cn('whitespace-pre-wrap break-words', clamped && 'overflow-hidden')}
        style={
          clamped
            ? ({
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: lines,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </div>
      {overflows && (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="mt-1 h-auto px-0"
          data-slot="truncated-text-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? lessLabel : moreLabel}
        </Button>
      )}
    </div>
  );
}

export { TruncatedText };
export type { TruncatedTextProps };
