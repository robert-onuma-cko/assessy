'use client';

import * as React from 'react';
import { Check, CaretDown, X } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: readonly string[];
  placeholder?: string;
  emptyText?: string;
  searchable?: boolean;
  disabled?: boolean;
  showSelectAll?: boolean;
  id?: string;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  emptyText = 'No options',
  searchable = false,
  disabled = false,
  showSelectAll = false,
  id,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal"
        >
          <span className="flex flex-1 flex-wrap gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1">
                  {v}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${v}`}
                    className="rounded-sm hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(v);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </span>
          <CaretDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command>
          {searchable && <CommandInput placeholder="Search…" />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {showSelectAll && (
                <CommandItem
                  key="__select_all__"
                  onSelect={() => onChange(value.length === options.length ? [] : [...options])}
                >
                  <Check className={cn('mr-2 h-4 w-4', value.length === options.length ? 'opacity-100' : 'opacity-0')} />
                  {value.length === options.length ? 'Clear all' : 'Select all'}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(option) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
