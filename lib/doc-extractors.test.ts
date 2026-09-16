import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchConfluenceDocText } from '@/lib/confluence';

import { confluenceFailure, extractDocText, extractorFor, supportedDocProviders } from './doc-extractors';

vi.mock('@/lib/confluence', () => ({ fetchConfluenceDocText: vi.fn() }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
const mockConfluence = fetchConfluenceDocText as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_PROVIDER;
});

describe('extractorFor', () => {
  it('returns gdoc for a Google Docs URL', () => {
    expect(extractorFor('https://docs.google.com/document/d/abc123/edit')).toEqual({
      id: 'gdoc',
      label: 'Google Doc',
    });
  });

  it('returns confluence for an Atlassian wiki URL and a "confluence" hostname', () => {
    expect(extractorFor('https://checkout.atlassian.net/wiki/spaces/ENG/pages/123')).toEqual({
      id: 'confluence',
      label: 'Confluence',
    });
    expect(extractorFor('https://confluence.example.com/pages/123')?.id).toBe('confluence');
  });

  it('returns null for an arbitrary https URL and for a Jira issue', () => {
    expect(extractorFor('https://www.example.com/doc')).toBeNull();
    expect(extractorFor('https://checkout.atlassian.net/browse/HIVE-212')).toBeNull();
  });

  it('trims whitespace before matching', () => {
    expect(extractorFor('  https://docs.google.com/document/d/abc123  ')).not.toBeNull();
  });
});

describe('supportedDocProviders', () => {
  it('lists the registered providers', () => {
    expect(supportedDocProviders()).toEqual(['Google Doc', 'Confluence']);
  });
});

describe('confluenceFailure', () => {
  it('not_visible → unreadable, not user-actionable', () => {
    const r = confluenceFailure('not_visible');
    expect(r).toMatchObject({ reason: 'unreadable', userActionable: false });
    expect(r.detail).toMatch(/space admin/i);
  });

  it('unresolvable → unreadable, user-actionable', () => {
    const r = confluenceFailure('unresolvable');
    expect(r).toMatchObject({ reason: 'unreadable', userActionable: true });
    expect(r.detail).toMatch(/page id/i);
  });

  it('too_short → unreadable, not user-actionable', () => {
    expect(confluenceFailure('too_short')).toMatchObject({ reason: 'unreadable', userActionable: false });
  });

  it('unavailable → unavailable, user-actionable', () => {
    expect(confluenceFailure('unavailable')).toMatchObject({ reason: 'unavailable', userActionable: true });
  });
});

describe('extractDocText', () => {
  it('returns unsupported for a URL no provider handles', async () => {
    expect(await extractDocText('https://www.example.com/some-doc')).toEqual({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('returns text from a successful anonymous Google export', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => 'Document text content' });
    expect(await extractDocText('https://docs.google.com/document/d/abc123/edit')).toEqual({
      ok: true,
      text: 'Document text content',
      provider: 'gdoc',
    });
  });

  it('treats the Google sign-in page, an empty body, and a non-2xx as unreadable', async () => {
    const url = 'https://docs.google.com/document/d/abc123/edit';
    mockFetch.mockResolvedValue({ ok: true, text: async () => '<!doctype html><html>Sign in</html>' });
    expect(await extractDocText(url)).toMatchObject({ ok: false, reason: 'unreadable' });
    mockFetch.mockResolvedValue({ ok: true, text: async () => '   ' });
    expect(await extractDocText(url)).toMatchObject({ ok: false, reason: 'unreadable' });
    mockFetch.mockResolvedValue({ ok: false, text: async () => '' });
    expect(await extractDocText(url)).toMatchObject({ ok: false, reason: 'unreadable' });
  });

  it('returns Confluence text on a successful fetch', async () => {
    mockConfluence.mockResolvedValue({ ok: true, text: 'Confluence page text' });
    expect(await extractDocText('https://checkout.atlassian.net/wiki/spaces/ENG/pages/123')).toEqual({
      ok: true,
      text: 'Confluence page text',
      provider: 'confluence',
    });
  });

  it('maps Confluence not_visible to a non-actionable unreadable, and unavailable to unavailable', async () => {
    const url = 'https://checkout.atlassian.net/wiki/spaces/ENG/pages/123';
    mockConfluence.mockResolvedValue({ ok: false, reason: 'not_visible' });
    expect(await extractDocText(url)).toMatchObject({ ok: false, reason: 'unreadable', userActionable: false });
    mockConfluence.mockResolvedValue({ ok: false, reason: 'unavailable' });
    expect(await extractDocText(url)).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('with AI_PROVIDER=mock, claims any https URL and returns canned text', async () => {
    process.env.AI_PROVIDER = 'mock';
    const r = await extractDocText('https://www.some-random-url.com/doc');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.provider).toBe('gdoc');
      expect(r.text).toMatch(/MOCK DOCUMENT/);
    }
  });
});
