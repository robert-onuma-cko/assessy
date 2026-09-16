// Confluence Cloud read client — the second document provider behind
// lib/prd/extractors.ts (Google Docs was the first).
//
// Credentials are the SAME as Jira's: one Atlassian API token authorises both
// /rest/api/3/ (Jira) and /wiki/api/v2/ (Confluence) on the same site, so this
// module reads JIRA_SUBDOMAIN / JIRA_USERNAME / JIRA_API_KEY rather than
// inventing its own trio. Renaming them to ATLASSIAN_* would be tidier and would
// also break the deployed Jira sync, so they keep the Jira names and this comment
// explains why.
//
// Unlike Google Docs (per-user OAuth, so Hive sees what the viewer sees), this is
// ONE service identity for everyone: Hive reads exactly what that account can
// read, no more and no less. Two consequences that shape the code below:
//
//   • a page the account cannot see returns 404, not 403 — indistinguishable from
//     a deleted page — so the failure copy must talk about granting the service
//     account space access, not about "sharing the doc with yourself";
//   • a 401/403 is OUR configuration failing, never the user's document, and maps
//     to `unavailable` so the UI doesn't tell them to fix their permissions.
//
// Pure fetch, no Prisma and no React, so services/actions/components can all
// reach it.

/** Named entities that actually appear in Confluence storage format. */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  zwj: "",
  zwnj: "",
  shy: "",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  middot: "·",
  bull: "•",
  deg: "°",
  times: "×",
  minus: "−",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  larr: "←",
  rarr: "→",
  harr: "↔",
  check: "✓",
};

// Storage format is XHTML, which guarantees only the five XML entities — but
// Confluence emits the HTML set anyway (&nbsp;, &ldquo;, &zwj; all appear in real
// pages). Left encoded they reach the model as literal "&nbsp;" noise, which is
// why this runs before anything else looks at the text.
export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (whole, name: string) => {
      const hit = ENTITIES[name.toLowerCase()];
      return hit === undefined ? whole : hit;
    });
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Elements whose boundaries are a line break in the plain-text rendering. */
const BLOCK_TAGS =
  "p|div|br|hr|li|ul|ol|tr|table|thead|tbody|h[1-6]|blockquote|pre|section|article|dt|dd";

// Storage format → plain text.
//
// Not a general HTML-to-text pass; it is tuned to the three things that make a
// Confluence page unreadable to a language model if you only strip tags:
//
//   1. table cells glue together ("RiskHighOwnerJane"), so cells get " | ";
//   2. macros carry their payload in CDATA or in ac:rich-text-body — the shell is
//      noise but the body is the document, so shells go and bodies stay;
//   3. ac:link has no text of its own; the target's title is the only readable
//      thing in it, and dropping it loses every cross-reference the doc makes.
export function storageToText(storage: string): string {
  let s = storage;

  // Comments and doctype first, so their contents can't be mistaken for markup.
  s = s.replace(/<!--[\s\S]*?-->/g, " ").replace(/<!DOCTYPE[^>]*>/gi, " ");

  // Unwrap CDATA — this is where code blocks and several macros keep their text.
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  // Wholly non-textual elements, dropped with their contents.
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<ac:image\b[^>]*>[\s\S]*?<\/ac:image>/gi, " ");
  s = s.replace(/<ac:image\b[^>]*\/>/gi, " ");

  // Macro *parameters* are configuration (colour, layout, page size), not prose.
  // Dropped before the shells so their values never leak into the text.
  s = s.replace(/<ac:parameter\b[^>]*>[\s\S]*?<\/ac:parameter>/gi, " ");

  // A link's readable content is the target's title/filename.
  s = s.replace(
    /<ri:(?:page|attachment|blog-post)\b[^>]*?ri:(?:content-title|filename)="([^"]*)"[^>]*\/?>/gi,
    " $1 ",
  );
  s = s.replace(/<ri:url\b[^>]*?ri:value="([^"]*)"[^>]*\/?>/gi, " $1 ");

  // Task lists: keep the state, since "complete" vs "incomplete" is often the
  // only thing distinguishing a done plan from an aspirational one.
  s = s.replace(/<ac:task-status>\s*complete\s*<\/ac:task-status>/gi, " [x] ");
  s = s.replace(/<ac:task-status>\s*incomplete\s*<\/ac:task-status>/gi, " [ ] ");

  // Table cells before generic blocks, so the separator survives.
  s = s.replace(/<\/(td|th)>/gi, " | ");

  // Block boundaries → newlines.
  s = s.replace(new RegExp(`<(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n");
  s = s.replace(new RegExp(`</(?:${BLOCK_TAGS})\\s*>`, "gi"), "\n");

  // Everything else — inline tags and macro shells — goes, contents kept.
  s = s.replace(/<[^>]+>/g, " ");

  s = decodeEntities(s);

  // Collapse whitespace without collapsing paragraphs: a blank line is structure
  // the model reads as a section break, so runs of newlines cap at two.
  return s
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*\|\s*/gm, "")
    .replace(/\s*\|\s*$/gm, "")
    .trim();
}

// ─── Config ──────────────────────────────────────────────────────────────────

export function confluenceConfigured(): boolean {
  return !!(
    process.env.JIRA_SUBDOMAIN &&
    process.env.JIRA_USERNAME &&
    process.env.JIRA_API_KEY
  );
}

function siteBase(): string {
  return `https://${process.env.JIRA_SUBDOMAIN}.atlassian.net`;
}

function authHeader(): string {
  const token = Buffer.from(
    `${process.env.JIRA_USERNAME}:${process.env.JIRA_API_KEY}`,
  ).toString("base64");
  return `Basic ${token}`;
}

// ─── URL → page id ───────────────────────────────────────────────────────────

export type ParsedConfluenceUrl =
  // A page id was in the URL, so no network call is needed to find it.
  | { kind: "id"; pageId: string }
  // A /wiki/x/<hash> short link: only a redirect reveals the real page.
  | { kind: "tiny"; url: string }
  // Recognisably Confluence, but nothing in the path identifies a page.
  | { kind: "unresolvable" };

// Every URL shape Confluence hands out, and what each yields:
//
//   /wiki/spaces/KEY/pages/123456/Title        → id      (the modern default)
//   /wiki/spaces/KEY/pages/123456              → id
//   /wiki/spaces/KEY/pages/edit-v2/123456      → id      (edit/embed variants)
//   …?pageId=123456                            → id      (legacy viewpage.action)
//   /wiki/x/AbCdEf                             → tiny    (needs a redirect)
//   /wiki/display/KEY/Page+Title               → UNRESOLVABLE, see below
//
// The last one is the interesting failure. Resolving a title to an id needs CQL
// search, and this site's search aggregator rejects the service account (403), so
// there is no lookup available to fall back on. Guessing is worse than failing —
// two spaces can hold the same title — so it returns unresolvable and the user
// gets asked for the normal page link, which is one click away in Confluence.
export function parseConfluenceUrl(raw: string): ParsedConfluenceUrl {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { kind: "unresolvable" };
  }

  const byQuery = u.searchParams.get("pageId");
  if (byQuery && /^\d+$/.test(byQuery)) return { kind: "id", pageId: byQuery };

  // …/pages/<optional edit-v2 or similar segment>/<digits>
  const inPath = u.pathname.match(/\/pages\/(?:[a-z0-9-]+\/)?(\d+)(?:\/|$)/i);
  if (inPath) return { kind: "id", pageId: inPath[1] };

  if (/\/(?:wiki\/)?x\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) {
    return { kind: "tiny", url: u.toString() };
  }

  return { kind: "unresolvable" };
}

// Follow a /wiki/x/<hash> short link one hop to recover the page id. Deliberately
// `redirect: 'manual'` — following it would fetch the whole HTML page just to
// throw it away, and a login redirect would look like success.
async function resolveTinyLink(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { Authorization: authHeader(), Accept: "text/html" },
      cache: "no-store",
    });
    const location = res.headers.get("location");
    if (!location) return null;
    const absolute = new URL(location, siteBase()).toString();
    const parsed = parseConfluenceUrl(absolute);
    return parsed.kind === "id" ? parsed.pageId : null;
  } catch {
    return null;
  }
}

/** Resolve any recognised Confluence URL to a page id, or null. */
export async function resolveConfluencePageId(url: string): Promise<string | null> {
  const parsed = parseConfluenceUrl(url);
  if (parsed.kind === "id") return parsed.pageId;
  if (parsed.kind === "tiny") return resolveTinyLink(parsed.url);
  return null;
}

// ─── Fetching ────────────────────────────────────────────────────────────────

export interface ConfluencePage {
  id: string;
  title: string;
  /** Confluence's own version counter — the cheap freshness signal. */
  version: number;
  /** Raw storage-format XHTML; run through storageToText for prose. */
  storage: string;
}

export type ConfluenceFetchResult =
  | { ok: true; page: ConfluencePage }
  // Not visible to the service account, or gone. Confluence cannot tell us which.
  | { ok: false; reason: "not_visible" }
  // Our credentials or the site are the problem, not the user's page.
  | { ok: false; reason: "unavailable" };

async function confluenceGet(path: string): Promise<Response | null> {
  try {
    return await fetch(`${siteBase()}/wiki${path}`, {
      headers: { Authorization: authHeader(), Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/** One page with its storage body. */
export async function fetchConfluencePage(
  pageId: string,
): Promise<ConfluenceFetchResult> {
  if (!confluenceConfigured()) return { ok: false, reason: "unavailable" };

  const res = await confluenceGet(`/api/v2/pages/${pageId}?body-format=storage`);
  if (!res) return { ok: false, reason: "unavailable" };

  // 404 is the permission answer as well as the deleted answer — Confluence hides
  // the difference on purpose, so we must not claim to know which it is.
  if (res.status === 404) return { ok: false, reason: "not_visible" };
  // 401/403 mean the token is wrong or unlicensed: ours to fix, never theirs.
  if (res.status === 401 || res.status === 403) {
    console.error(
      `[confluence] auth rejected (${res.status}) — check JIRA_USERNAME / JIRA_API_KEY`,
    );
    return { ok: false, reason: "unavailable" };
  }
  if (!res.ok) {
    console.error(`[confluence] page ${pageId} responded ${res.status}`);
    return { ok: false, reason: "unavailable" };
  }

  try {
    const raw = (await res.json()) as {
      id?: string | number;
      title?: string;
      version?: { number?: number };
      body?: { storage?: { value?: string } };
    };
    return {
      ok: true,
      page: {
        id: String(raw.id ?? pageId),
        title: raw.title ?? "",
        version: Number(raw.version?.number ?? 0),
        storage: raw.body?.storage?.value ?? "",
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Direct child page ids, oldest first, capped. Errors return [] rather than
 * throwing: a parent we could read is still worth grading without its children.
 */
export async function fetchChildPageIds(
  pageId: string,
  limit: number,
): Promise<string[]> {
  if (limit <= 0) return [];
  const res = await confluenceGet(
    `/api/v2/pages/${pageId}/children?limit=${Math.min(limit, 250)}`,
  );
  if (!res?.ok) return [];
  try {
    const raw = (await res.json()) as { results?: { id?: string | number }[] };
    return (raw.results ?? [])
      .map((r) => String(r.id))
      .filter((id) => /^\d+$/.test(id))
      .slice(0, limit);
  } catch {
    return [];
  }
}

// Deliberately absent: a fetchConfluencePageVersion / confluenceFreshness pair
// for automatic staleness detection. It was written, then removed — nothing read
// the stored version, and a schedule would check documents at moments unrelated
// to when anyone acts on them. Refreshing is a manual gesture instead (re-save the
// link → re-fetch + re-grade in one step), which is a clearer signal of intent
// than a background job guessing. `version` is still returned on a read below, for
// anyone who wants to display it.

// ─── Whole-document read ─────────────────────────────────────────────────────

/**
 * One level of children only. A PRD is routinely a parent page plus children,
 * and reading the parent alone grades a table of contents — then tells the owner
 * their PRD is thin, which is the tool's fault and reads like theirs. Deeper than
 * one level starts pulling in unrelated sub-trees.
 */
export const MAX_CHILD_PAGES = 20;

/**
 * Roughly 15k prompt tokens — a 25-to-30-page document.
 *
 * Was 200_000, set by guesswork before anything real had been read. The first
 * live extraction (a page plus 20 children) came to 125k chars and broke the
 * grader: the model's reasoning budget scales with the input, so the verdict JSON
 * was truncated and unparseable. Raising max_tokens in lib/ai.ts fixed that case,
 * but the failure mode returns for any document large enough, so the cap now sits
 * well inside the envelope that is measured to work rather than at the edge of it.
 *
 * The tail of a document this long cannot change a verdict anyway — but a
 * truncated verdict fails the whole check, which is a far worse outcome.
 */
export const MAX_DOC_CHARS = 60_000;

/**
 * Below this we call a page unreadable rather than grading it.
 *
 * Three real cases all produce a technically-successful read with no prose: a
 * page whose content sits inside an excerpt-include or a diagram, an unpublished
 * draft, and a stub someone linked early. Grading any of them scores a real
 * document badly for a reason the owner cannot act on — so the honest answer is
 * "we could not read this", not 22/100.
 */
export const MIN_DOC_CHARS = 400;

export type ConfluenceDocResult =
  | {
      ok: true;
      text: string;
      title: string;
      pageId: string;
      version: number;
      truncated: boolean;
    }
  | { ok: false; reason: "not_visible" | "unavailable" | "unresolvable" | "too_short" };

/**
 * Read a Confluence page and one level of children as a single plain-text
 * document. Child text is prefixed with its title so the model can tell a
 * section boundary from a topic change.
 */
export async function fetchConfluenceDocText(url: string): Promise<ConfluenceDocResult> {
  if (!confluenceConfigured()) return { ok: false, reason: "unavailable" };

  const pageId = await resolveConfluencePageId(url);
  if (!pageId) return { ok: false, reason: "unresolvable" };

  const root = await fetchConfluencePage(pageId);
  if (!root.ok) return { ok: false, reason: root.reason };

  const parts = [storageToText(root.page.storage)];
  let truncated = false;

  const childIds = await fetchChildPageIds(pageId, MAX_CHILD_PAGES);
  for (const childId of childIds) {
    if (parts.join("\n\n").length >= MAX_DOC_CHARS) {
      truncated = true;
      break;
    }
    const child = await fetchConfluencePage(childId);
    if (!child.ok) continue;
    const childText = storageToText(child.page.storage);
    if (!childText) continue;
    parts.push(`## ${child.page.title}\n\n${childText}`);
  }

  let text = parts.filter(Boolean).join("\n\n").trim();

  if (text.length > MAX_DOC_CHARS) {
    text = text.slice(0, MAX_DOC_CHARS);
    truncated = true;
  }
  // Say so in the text itself: the grader must not read a cut-off document as an
  // incomplete one and mark it down for the missing sections.
  if (truncated) {
    text +=
      "\n\n[Document truncated for length — later sections were not included in this check.]";
  }

  if (text.length < MIN_DOC_CHARS) return { ok: false, reason: "too_short" };

  return {
    ok: true,
    text,
    title: root.page.title,
    pageId,
    version: root.page.version,
    truncated,
  };
}
