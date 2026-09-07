'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchPeople } from '@/lib/people-directory';
import { setDevUser } from '@/lib/dev-user-actions';
import { UserSwitch, ArrowCounterClockwise, Check } from '@phosphor-icons/react';

export interface DevIdentity {
  email: string;
  name: string;
  roles: string[];
}

interface Group {
  label: string;
  people: DevIdentity[];
}

interface Props {
  current: DevIdentity | null;
  isAdmin: boolean;
  groups: Group[];
}

function RoleBadges({ roles }: { roles: string[] }) {
  if (!roles.length) return null;
  return (
    <span className="ml-2 flex gap-1">
      {roles.map((r) => (
        <Badge key={r} variant="secondary" className="px-1 py-0 text-3xs leading-4">{r}</Badge>
      ))}
    </span>
  );
}

// Dev-only identity switcher. Curated identities (owners, POCs, role-holders)
// come from the server; typing searches the full people directory so you can
// also impersonate someone with no access ("irrelevant user").
export function DevUserSwitcherClient({ current, isAdmin, groups }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const curatedEmails = useMemo(
    () => new Set(groups.flatMap((g) => g.people.map((p) => p.email))),
    [groups],
  );

  // Manual filtering (cmdk's own filter is off) so directory results and curated
  // groups don't fight over match scoring.
  const q = query.trim().toLowerCase();
  const filterGroup = (people: DevIdentity[]) =>
    q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.email.includes(q)) : people;

  const directoryResults: DevIdentity[] = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchPeople(query, 8)
      .filter((p) => !curatedEmails.has(p.email.toLowerCase()))
      .map((p) => ({ email: p.email.toLowerCase(), name: p.name, roles: [] }));
  }, [query, curatedEmails]);

  const choose = (email: string | null) => {
    startTransition(async () => {
      await setDevUser(email);
      setOpen(false);
      setQuery('');
    });
  };

  const label = current ? current.name : 'No identity';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 border-dashed text-xs"
          title="Dev only — switch the current user"
          disabled={pending}
        >
          <UserSwitch className="size-3.5" weight="bold" />
          <span className="max-w-[12rem] truncate">{label}</span>
          {isAdmin && <Badge variant="secondary" className="px-1 py-0 text-3xs leading-4">Admin</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Act as… (search anyone)" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No matching person.</CommandEmpty>

            <CommandGroup heading="Default">
              <CommandItem value="__reset__" onSelect={() => choose(null)}>
                <ArrowCounterClockwise className="mr-2 size-3.5" />
                Reset to ASSESSY_DEV_EMAIL
              </CommandItem>
            </CommandGroup>

            {groups.map((g) => {
              const people = filterGroup(g.people);
              if (!people.length) return null;
              return (
                <CommandGroup key={g.label} heading={g.label}>
                  {people.map((p) => (
                    <CommandItem key={`${g.label}:${p.email}`} value={`${g.label}:${p.email}`} onSelect={() => choose(p.email)}>
                      {current?.email === p.email && <Check className="mr-2 size-3.5 text-success" />}
                      <span className="truncate">{p.name}</span>
                      <RoleBadges roles={p.roles} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {directoryResults.length > 0 && (
              <CommandGroup heading="Directory">
                {directoryResults.map((p) => (
                  <CommandItem key={`dir:${p.email}`} value={`dir:${p.email}`} onSelect={() => choose(p.email)}>
                    <span className="truncate">{p.name}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{p.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
