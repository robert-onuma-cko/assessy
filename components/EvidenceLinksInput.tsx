'use client';

import { useState } from 'react';
import { LinkSimple, X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DOC_LINK_DUPLICATE,
  DOC_LINK_PLACEHOLDER,
  displayDocUrl,
  docProviderLabel,
  normalizeDocLink,
  type DocLink,
} from '@/lib/doc-links';

// Multi-link variant of Hive's LinkInput: a draft field + Add button, and the
// added links listed above it with a remove control. Each accepted link is
// emitted as a hidden `<input name>` so a plain server-action form receives
// them with formData.getAll(name). Validation here is an affordance — the
// action re-runs normalizeDocLink on every value.

export function EvidenceLinksInput({ name, id }: { name: string; id?: string }) {
  const [links, setLinks] = useState<DocLink[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    if (!draft.trim()) return;
    const r = normalizeDocLink(draft);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (links.some((l) => l.url === r.link.url)) {
      setError(DOC_LINK_DUPLICATE);
      return;
    }
    setLinks([...links, r.link]);
    setDraft('');
    setError(null);
  };

  const remove = (url: string) => setLinks(links.filter((l) => l.url !== url));

  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {links.map((l) => (
            <li key={l.url} className="flex items-center gap-2 px-3 py-2 text-sm">
              <LinkSimple className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={l.url}>
                {displayDocUrl(l.url)}
              </span>
              <span className="shrink-0 text-2xs text-tertiary-foreground">{docProviderLabel(l.provider)}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label={`Remove ${displayDocUrl(l.url)}`}
                onClick={() => remove(l.url)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
              <input type="hidden" name={name} value={l.url} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={draft}
          aria-invalid={!!error || undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            // Enter adds the link rather than submitting the whole request.
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={DOC_LINK_PLACEHOLDER}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" disabled={!draft.trim()} onClick={add}>
          Add link
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
