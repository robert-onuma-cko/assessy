// Pluggable text extractors for evidence links — ported from the Hive
// prototype's lib/prd/extractors.ts so a document reads the same way in both
// apps and the module merges cleanly later.
//
// Adding a provider is one entry in EXTRACTORS; callers (extractDocText) never
// change. Each extractor claims the URLs it recognises and returns the
// document's plain text, or a typed failure so callers can tell the user
// precisely what went wrong.
//
// Google Docs here is anonymous-export only: Hive's second tier (Drive export as
// the signed-in user) needs per-user Google OAuth, which Assessy does not have.
// A domain-restricted doc therefore reads as `unreadable`, and the link is kept
// un-analysed rather than refused.
//
// Pure/framework-agnostic (fetch only, no Prisma/React).

import { fetchConfluenceDocText } from '@/lib/confluence';

export type ExtractResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; reason: 'unsupported' }
  // unreadable = recognised but we couldn't read it (not shared / deleted / empty);
  // unavailable = a config/broker problem on our side, not the user's doc.
  // `userActionable: false` means the person who pasted the link cannot fix it
  // themselves, so callers keep the link un-analysed instead of refusing it.
  | {
      ok: false;
      reason: 'unreadable' | 'unavailable';
      provider?: string;
      detail?: string;
      userActionable?: boolean;
    };

type ExtractorResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'unreadable' | 'unavailable'; detail?: string; userActionable?: boolean };

interface Extractor {
  id: string; // stored as EvidenceLink.provider, e.g. "gdoc"
  label: string; // human-facing, e.g. "Google Doc"
  canHandle(url: string): boolean;
  extract(url: string): Promise<ExtractorResult>;
}

// Anonymous txt export. A private doc returns the login HTML page rather than
// the text, which we detect and treat as unreadable.
const googleDocs: Extractor = {
  id: 'gdoc',
  label: 'Google Doc',
  canHandle: (url) => /docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/.test(url),
  async extract(url) {
    const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return { ok: false, reason: 'unreadable' };
    try {
      const res = await fetch(`https://docs.google.com/document/d/${m[1]}/export?format=txt`, {
        redirect: 'follow',
      });
      if (!res.ok) return { ok: false, reason: 'unreadable' };
      const text = await res.text();
      if (/<!doctype html|<html|accounts\.google\.com/i.test(text.slice(0, 800))) {
        return { ok: false, reason: 'unreadable' };
      }
      const trimmed = text.trim();
      return trimmed ? { ok: true, text: trimmed } : { ok: false, reason: 'unreadable' };
    } catch {
      return { ok: false, reason: 'unreadable' };
    }
  },
};

// Confluence Cloud and self-hosted, read as ONE service identity (lib/confluence).
// An atlassian.net URL outside /wiki is something else — a Jira issue, most
// likely — so it is deliberately NOT claimed and stays a generic saved link.
const confluence: Extractor = {
  id: 'confluence',
  label: 'Confluence',
  canHandle(url) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return false;
    }
    const host = u.hostname.toLowerCase();
    if (host.includes('confluence')) return true;
    return host.endsWith('.atlassian.net') && u.pathname.toLowerCase().startsWith('/wiki/');
  },
  async extract(url) {
    const result = await fetchConfluenceDocText(url);
    if (result.ok) return { ok: true, text: result.text };
    return confluenceFailure(result.reason);
  },
};

/**
 * How each Confluence read failure is reported, and whether the person who
 * pasted the link can do anything about it. Exported so the mapping is testable
 * without a live site.
 */
export function confluenceFailure(reason: 'not_visible' | 'unavailable' | 'unresolvable' | 'too_short'): {
  ok: false;
  reason: 'unreadable' | 'unavailable';
  detail?: string;
  userActionable?: boolean;
} {
  switch (reason) {
    case 'not_visible':
      // The reader is a service account, so the fix is space access, which the
      // person pasting the link usually cannot grant.
      return {
        ok: false,
        reason: 'unreadable',
        userActionable: false,
        detail:
          "Saved, but Assessy can't read that Confluence page, so Scout won't see its contents. Ask a space admin to give Assessy's Confluence account read access to the space.",
      };
    case 'unresolvable':
      return {
        ok: false,
        reason: 'unreadable',
        userActionable: true,
        detail:
          "That Confluence link doesn't include a page id. Open the page and copy the URL from your browser, then paste that.",
      };
    case 'too_short':
      return {
        ok: false,
        reason: 'unreadable',
        userActionable: false,
        detail:
          'Saved, but we found almost no readable text on that Confluence page — it may be an unpublished draft, or its content may sit inside a macro or diagram we can’t read.',
      };
    default:
      return { ok: false, reason: 'unavailable', userActionable: true };
  }
}

const EXTRACTORS: Extractor[] = [googleDocs, confluence];

export function supportedDocProviders(): string[] {
  return EXTRACTORS.map((e) => e.label);
}

// LOCAL DEV MOCK: when AI_PROVIDER=mock, ANY https URL is treated as a readable
// Google Doc and returns canned text, so the evidence flow can be walked through
// end-to-end with a throwaway link. Real runs are unaffected.
function mockActive(url: string): boolean {
  return process.env.AI_PROVIDER === 'mock' && /^https:\/\//i.test(url);
}

const MOCK_DOC_TEXT = [
  'MOCK DOCUMENT (AI_PROVIDER=mock)',
  '',
  'Problem: Finance reconciles FX margin on the new pricing plan by hand because the reporting export does not carry the margin field.',
  '',
  'Proposed change: add FX margin to the settlement export and the merchant reporting view; no change to pricing itself.',
  '',
  'Affected teams: Finance (Product Control), FEX — CBA.',
  'Date driver: Q4 close.',
].join('\n');

// Which extractor claims this URL — i.e. can we read the doc today? Null means
// no provider recognises it. lib/doc-links.ts is the consumer that needs the
// readable / linked-only distinction.
export function extractorFor(url: string): { id: string; label: string } | null {
  const trimmed = url.trim();
  if (mockActive(trimmed)) return { id: 'gdoc', label: 'Google Doc' };
  const e = EXTRACTORS.find((x) => x.canHandle(trimmed));
  return e ? { id: e.id, label: e.label } : null;
}

export async function extractDocText(url: string): Promise<ExtractResult> {
  const trimmed = url.trim();
  if (mockActive(trimmed)) return { ok: true, provider: 'gdoc', text: MOCK_DOC_TEXT };

  const extractor = EXTRACTORS.find((e) => e.canHandle(trimmed));
  if (!extractor) return { ok: false, reason: 'unsupported' };

  const r = await extractor.extract(trimmed);
  if (r.ok) return { ok: true, text: r.text, provider: extractor.id };
  return {
    ok: false,
    reason: r.reason,
    provider: extractor.id,
    detail: r.detail,
    userActionable: r.userActionable,
  };
}
