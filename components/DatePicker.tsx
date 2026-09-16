'use client';

import * as React from 'react';
import { CalendarBlank, X } from '@phosphor-icons/react';
import { format, isValid, parse } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Ported from the Hive prototype: the one picker every date in the app is
// chosen with. value/onChange speak 'yyyy-MM-dd' (or null), matching stored
// dates.

interface Props {
  id?: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Earliest pickable day, 'yyyy-MM-dd'. Earlier days render disabled and an
   *  empty picker opens on this month rather than today's. */
  min?: string;
  /** Render the popover modal — needed inside a Dialog, whose focus trap would
   *  otherwise pull focus back out of the calendar and close it. */
  modal?: boolean;
  'aria-label'?: string;
}

export function parseDay(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  min,
  modal = false,
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = parseDay(value);
  const floor = parseDay(min);
  const triggerLabel = selected ? format(selected, 'd MMM yyyy') : placeholder;
  const accessibleLabel = ariaLabel ? `${ariaLabel}: ${triggerLabel}` : undefined;

  const commit = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={accessibleLabel}
          className={cn('justify-start gap-2 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarBlank className="size-4 opacity-70" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? floor}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2032, 11)}
          disabled={floor ? { before: floor } : undefined}
          autoFocus
          onSelect={(d) => commit(d ? format(d, 'yyyy-MM-dd') : null)}
        />
        {selected && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => commit(null)}
            >
              <X className="size-4" />
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
