import { describe, expect, it } from "vitest";

import { decodeEntities, parseConfluenceUrl, storageToText } from "./confluence";
import { confluenceFailure } from "./doc-extractors";

// The URL shapes are the part most likely to meet something unexpected in the
// wild, and the only part we can pin without a live site.
describe("parseConfluenceUrl", () => {
  it("reads the id from a modern page URL with a title slug", () => {
    expect(
      parseConfluenceUrl(
        "https://checkout.atlassian.net/wiki/spaces/Fabric/pages/8617918598/2026-07-20+Execution+Plan",
      ),
    ).toEqual({ kind: "id", pageId: "8617918598" });
  });

  it("reads the id when there is no title slug", () => {
    expect(
      parseConfluenceUrl(
        "https://checkout.atlassian.net/wiki/spaces/PROD/pages/30015491",
      ),
    ).toEqual({
      kind: "id",
      pageId: "30015491",
    });
  });

  it("reads the id from an edit-mode URL", () => {
    expect(
      parseConfluenceUrl(
        "https://checkout.atlassian.net/wiki/spaces/PROD/pages/edit-v2/30015491",
      ),
    ).toEqual({
      kind: "id",
      pageId: "30015491",
    });
  });

  it("reads the id from a legacy pageId query", () => {
    expect(
      parseConfluenceUrl(
        "https://confluence.example.com/pages/viewpage.action?pageId=778899",
      ),
    ).toEqual({
      kind: "id",
      pageId: "778899",
    });
  });

  it("ignores an anchor or comment fragment", () => {
    expect(
      parseConfluenceUrl(
        "https://checkout.atlassian.net/wiki/spaces/PROD/pages/123456/Title#Title-Risks",
      ),
    ).toEqual({ kind: "id", pageId: "123456" });
  });

  it("flags a tiny link as needing a redirect", () => {
    expect(parseConfluenceUrl("https://checkout.atlassian.net/wiki/x/AbCdEf")).toEqual({
      kind: "tiny",
      url: "https://checkout.atlassian.net/wiki/x/AbCdEf",
    });
  });

  // The one shape we deliberately refuse. Resolving a title needs CQL search,
  // which this site's service account is refused (403) — and guessing is worse
  // than failing, because two spaces can hold the same page title.
  it("refuses a /display/ title URL rather than guessing", () => {
    expect(
      parseConfluenceUrl("https://confluence.example.com/display/PROD/Scope+Doc"),
    ).toEqual({
      kind: "unresolvable",
    });
  });

  it("does not mistake a non-numeric path segment for an id", () => {
    expect(
      parseConfluenceUrl(
        "https://checkout.atlassian.net/wiki/spaces/PROD/pages/overview",
      ),
    ).toEqual({
      kind: "unresolvable",
    });
  });

  it("survives a malformed URL", () => {
    expect(parseConfluenceUrl("not a url")).toEqual({ kind: "unresolvable" });
  });
});

describe("decodeEntities", () => {
  // Real sample, straight off the Disputes domain page: storage format ships the
  // HTML entity set even though XHTML only guarantees five.
  it("decodes the entities Confluence actually emits", () => {
    expect(
      decodeEntities(
        "&nbsp;&ldquo;Help our merchants win&rdquo;&nbsp;&mdash; a non&#8209;trivial job",
      ),
    ).toContain("“Help our merchants win”");
  });

  it("decodes numeric and hex references", () => {
    expect(decodeEntities("caf&#233; &#x2713;")).toBe("café ✓");
  });

  it("drops zero-width joiners that would otherwise litter the text", () => {
    expect(decodeEntities("👩&zwj;🚀")).toBe("👩🚀");
  });

  it("leaves an unknown entity alone rather than eating it", () => {
    expect(decodeEntities("&notarealentity; stays")).toBe("&notarealentity; stays");
  });
});

describe("storageToText", () => {
  it("keeps paragraph structure as blank lines", () => {
    expect(storageToText("<p>First para.</p><p>Second para.</p>")).toBe(
      "First para.\n\nSecond para.",
    );
  });

  // The failure this exists to prevent: stripped tags glue cells into
  // "RiskHighOwnerJane", which a model reads as one nonsense token.
  it("separates table cells so they do not glue together", () => {
    const html =
      "<table><tbody><tr><th>Risk</th><td>High</td></tr><tr><th>Owner</th><td>Jane</td></tr></tbody></table>";
    const text = storageToText(html);
    expect(text).toContain("Risk | High");
    expect(text).toContain("Owner | Jane");
  });

  it("keeps a macro body while dropping the macro shell and its parameters", () => {
    const html = `<ac:structured-macro ac:name="panel">
        <ac:parameter ac:name="bgColor">#eeeeee</ac:parameter>
        <ac:rich-text-body><p>The success metric is 20% fewer manual reviews.</p></ac:rich-text-body>
      </ac:structured-macro>`;
    const text = storageToText(html);
    expect(text).toContain("The success metric is 20% fewer manual reviews.");
    expect(text).not.toContain("#eeeeee");
    expect(text).not.toContain("bgColor");
  });

  it("unwraps CDATA so code blocks survive", () => {
    const html =
      '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[SELECT 1;]]></ac:plain-text-body></ac:structured-macro>';
    expect(storageToText(html)).toContain("SELECT 1;");
  });

  it("keeps a cross-reference as the linked page title", () => {
    const html =
      '<p>See <ac:link><ri:page ri:content-title="Solution Design" /></ac:link> for detail.</p>';
    expect(storageToText(html)).toContain("Solution Design");
  });

  it("keeps task state, since done and planned are different documents", () => {
    const html =
      "<ac:task-list><ac:task><ac:task-status>complete</ac:task-status><ac:task-body>Load test</ac:task-body></ac:task>" +
      "<ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>Rollback drill</ac:task-body></ac:task></ac:task-list>";
    const text = storageToText(html);
    expect(text).toContain("[x] Load test");
    expect(text).toContain("[ ] Rollback drill");
  });

  it("drops images entirely", () => {
    const html =
      '<p>Before</p><ac:image><ri:attachment ri:filename="diagram.png" /></ac:image><p>After</p>';
    const text = storageToText(html);
    expect(text).not.toContain("diagram.png");
    expect(text).toContain("Before");
    expect(text).toContain("After");
  });

  it("strips comments and doctype", () => {
    expect(storageToText("<!-- reviewer note: fix this --><p>Body</p>")).toBe("Body");
  });

  it("caps runs of blank lines at one, so sections stay distinguishable", () => {
    expect(storageToText("<p>A</p><p></p><p></p><p></p><p>B</p>")).toBe("A\n\nB");
  });

  it("returns empty string for a macro-only page (the too-short trigger)", () => {
    const html =
      '<ac:structured-macro ac:name="excerpt-include"><ac:parameter ac:name="page">Other</ac:parameter></ac:structured-macro>';
    expect(storageToText(html)).toBe("");
  });
});

// Which failures refuse the link, and which save it un-analysed.
//
// This is a regression guard, not a nicety. Before Confluence became a readable
// provider, a Confluence link always saved as link-only. If an unreadable page
// started refusing instead, an owner whose PRD lives in a space Hive cannot see
// would be unable to record it at all — blocked by a permission they don't hold.
describe("confluenceFailure", () => {
  it("saves the link when the reader lacks space access — not the user’s to fix", () => {
    const r = confluenceFailure("not_visible");
    expect(r).toMatchObject({ ok: false, reason: "unreadable", userActionable: false });
    // The copy must not tell them to "share it": the reader is a service account.
    expect(r.detail).toMatch(/space admin/i);
    expect(r.detail).not.toMatch(/share it/i);
  });

  it("saves the link when there is no readable text — they cannot fix a diagram", () => {
    expect(confluenceFailure("too_short")).toMatchObject({ userActionable: false });
  });

  it("refuses a URL with no page id — that fix IS theirs, and it is one click", () => {
    const r = confluenceFailure("unresolvable");
    expect(r).toMatchObject({ userActionable: true });
    expect(r.detail).toMatch(/copy the URL/i);
  });

  it("refuses on our own outage, so a retry is not pre-empted by a saved unread link", () => {
    expect(confluenceFailure("unavailable")).toMatchObject({
      reason: "unavailable",
      userActionable: true,
    });
  });
});
