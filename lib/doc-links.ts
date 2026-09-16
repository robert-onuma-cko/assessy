// What a pasted evidence link IS — one place, for every link field in the app.
// Ported from the Hive prototype's lib/doc-links.ts.
//
// Two questions, kept separate:
//   • is this a valid link?  → it can be saved
//   • can we read it?        → extraction runs and Scout sees the contents
// Only the second is provider-dependent. Anything https is worth recording; when
// a provider can't be read we store the link and skip extraction — never a
// fallback that invents facts from a title.
//
// Framework-agnostic (no Prisma/React) so services, actions and components all
// share the same rules and copy.

import { extractorFor } from '@/lib/doc-extractors';

export type DocProvider = 'gdoc' | 'confluence' | 'link';

const DOC_PROVIDER_LABELS: Record<DocProvider, string> = {
  gdoc: 'Google Doc',
  confluence: 'Confluence',
  link: 'Link',
};

export const DOC_LINK_PLACEHOLDER = 'Paste a link — Google Doc, Confluence, Jira, anything https…';
export const DOC_LINK_HELP =
  'Scout reads Google Docs and Confluence pages before asking you questions. Other links are saved as-is for the triage team.';
export const DOC_LINK_INVALID = 'Please enter a valid link starting with https://';
export const DOC_LINK_EMPTY = 'Paste a link.';
export const DOC_LINK_DUPLICATE = 'That link is already added.';

export interface DocLink {
  url: string;
  provider: DocProvider;
  // Whether an extractor can read it today. false → store the link, skip extraction.
  analysable: boolean;
}

export type NormalizeDocLinkResult = { ok: true; link: DocLink } | { ok: false; error: string };

// Validate and classify a pasted link. https only: these are stored, rendered
// as anchors, and some are fetched server-side — reject http at the one
// boundary rather than in six places.
export function normalizeDocLink(raw: unknown): NormalizeDocLinkResult {
  if (typeof raw !== 'string') return { ok: false, error: DOC_LINK_INVALID };
  const url = raw.trim();
  if (!url) return { ok: false, error: DOC_LINK_EMPTY };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: DOC_LINK_INVALID };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: DOC_LINK_INVALID };

  const extractor = extractorFor(url);
  const provider: DocProvider = extractor ? (extractor.id as DocProvider) : 'link';
  return { ok: true, link: { url, provider, analysable: !!extractor } };
}

// Human-facing provider name for a stored value; unknown ids fall back to the
// neutral label rather than leaking an internal string into the UI.
export function docProviderLabel(provider: string | null | undefined): string {
  return provider && provider in DOC_PROVIDER_LABELS
    ? DOC_PROVIDER_LABELS[provider as DocProvider]
    : DOC_PROVIDER_LABELS.link;
}

// The badge shown next to a linked doc: "Google Doc", or "Confluence · not read"
// when we hold the link but no text. Keeping the un-read state visible is what
// stops a link-only submission reading as evidence Scout has seen.
export function docLinkBadge(provider: string | null | undefined, analysed: boolean): string {
  const label = docProviderLabel(provider);
  return analysed ? label : `${label} · not read`;
}

// Strip the scheme (and any trailing slash) for display. The full URL is still
// the anchor target — this only stops every row starting with the same 8 chars.
export function displayDocUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
