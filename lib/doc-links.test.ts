import { beforeEach, describe, expect, it } from 'vitest';

import { displayDocUrl, docLinkBadge, docProviderLabel, normalizeDocLink } from './doc-links';

beforeEach(() => {
  // The dev mock claims every https URL as a Google Doc; these tests are about
  // the real classification rules.
  delete process.env.AI_PROVIDER;
});

// A valid link is always storable; only "can we read it" is provider-dependent.
describe('normalizeDocLink', () => {
  it('recognises a Google Doc as readable', () => {
    const r = normalizeDocLink('https://docs.google.com/document/d/abc123XYZ_-/edit');
    expect(r).toEqual({
      ok: true,
      link: { url: 'https://docs.google.com/document/d/abc123XYZ_-/edit', provider: 'gdoc', analysable: true },
    });
  });

  it('recognises a Confluence Cloud page as readable', () => {
    const r = normalizeDocLink('https://checkout.atlassian.net/wiki/spaces/PROD/pages/123/Scope');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.link.provider).toBe('confluence');
    expect(r.link.analysable).toBe(true);
  });

  it('accepts a self-hosted Confluence host', () => {
    const r = normalizeDocLink('https://confluence.example.com/display/PROD/Scope');
    expect(r.ok && r.link.provider).toBe('confluence');
  });

  // An atlassian.net link outside /wiki is a Jira issue, not a page.
  it('treats a Jira link as a generic link, not Confluence', () => {
    const r = normalizeDocLink('https://checkout.atlassian.net/browse/HIVE-61');
    expect(r.ok && r.link.provider).toBe('link');
  });

  it('accepts any other https link as a generic, un-analysable link', () => {
    const r = normalizeDocLink('https://www.notion.so/some-page');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.link).toMatchObject({ provider: 'link', analysable: false });
  });

  it('trims surrounding whitespace', () => {
    const r = normalizeDocLink('  https://example.com/doc  ');
    expect(r.ok && r.link.url).toBe('https://example.com/doc');
  });

  it.each([
    { input: 'http://example.com/doc', why: 'plain http' },
    { input: 'javascript:alert(1)', why: 'a script URL' },
    { input: 'ftp://example.com/doc', why: 'a non-web scheme' },
    { input: 'not a url', why: 'free text' },
    { input: '', why: 'an empty string' },
    { input: null, why: 'a non-string' },
    { input: undefined, why: 'undefined' },
  ])('rejects $why', ({ input }) => {
    expect(normalizeDocLink(input).ok).toBe(false);
  });
});

describe('docProviderLabel', () => {
  it('names the providers it knows and falls back to the neutral label', () => {
    expect(docProviderLabel('gdoc')).toBe('Google Doc');
    expect(docProviderLabel('confluence')).toBe('Confluence');
    expect(docProviderLabel(null)).toBe('Link');
    expect(docProviderLabel('wat')).toBe('Link');
  });
});

describe('docLinkBadge', () => {
  it('flags an un-read doc so a link-only submission is visible', () => {
    expect(docLinkBadge('confluence', false)).toBe('Confluence · not read');
    expect(docLinkBadge('gdoc', true)).toBe('Google Doc');
    expect(docLinkBadge('gdoc', false)).toBe('Google Doc · not read');
  });
});

describe('displayDocUrl', () => {
  it('drops the scheme and trailing slash but nothing else', () => {
    expect(displayDocUrl('https://docs.google.com/document/d/abc/edit/')).toBe(
      'docs.google.com/document/d/abc/edit',
    );
  });
});
