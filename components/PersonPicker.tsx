'use client';

import { useState, useRef, useEffect } from 'react';
import { searchPeople } from '@/lib/people-directory';
import { Input } from '@/components/ui/input';

interface Props {
  name: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  /**
   * What to SHOW for `defaultValue` — a display name, where the caller knows one.
   * Without it the field pre-fills with the raw email, which is the value but not
   * the thing a person recognises (the create page defaults Owner to the creator).
   */
  defaultLabel?: string;
  onSelect?: (person: { name: string; email: string }) => void;
}

export function PersonPicker({ name, id, placeholder = 'Search by name or email…', required, defaultValue = '', defaultLabel, onSelect }: Props) {
  const [query, setQuery] = useState(defaultLabel || defaultValue);
  const [email, setEmail] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length >= 1 ? searchPeople(query, 8) : [];
  const showDropdown = open && results.length > 0;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const select = (person: { name: string; email: string }) => {
    setQuery(person.name);
    setEmail(person.email);
    setOpen(false);
    onSelect?.(person);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input carries the email value for form submission */}
      <input type="hidden" name={name} value={email} />

      <Input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setEmail('');
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden max-h-56 overflow-y-auto">
          {results.map((p) => (
            <li key={p.email}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(p); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span className="flex-1 font-medium truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground truncate">{p.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
