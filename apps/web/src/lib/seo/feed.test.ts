import { describe, it, expect } from "vitest";
import {
  escapeXml,
  renderAtomFeed,
  sortFeedEntries,
  type FeedEntry,
} from "./feed";

const meta = {
  title: "Test & feed",
  subtitle: "Sub",
  author: "Codex Cryptica",
  selfUrl: "https://example.com/feed.xml",
  siteUrl: "https://example.com/",
};

const entry = (over: Partial<FeedEntry> = {}): FeedEntry => ({
  title: "Hello <World>",
  url: "https://example.com/a",
  publishedAt: "2026-06-01",
  summary: 'A "quoted" & summary',
  contentType: "answer",
  categories: ["Worldbuilding", "answer"],
  ...over,
});

describe("feed", () => {
  it("escapes XML and strips illegal control characters", () => {
    expect(escapeXml(`<a href="x">&'\u0001\uFFFE\uFFFF\uD800</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;",
    );
  });

  it("renders canonical url, dates, categories and escaped text", () => {
    const xml = renderAtomFeed(meta, [entry()]);
    expect(xml).toContain("<id>https://example.com/a</id>");
    expect(xml).toContain("<title>Hello &lt;World&gt;</title>");
    expect(xml).toContain("<published>2026-06-01T00:00:00.000Z</published>");
    expect(xml).toContain("<updated>2026-06-01T00:00:00.000Z</updated>");
    expect(xml).toContain('<category term="Worldbuilding"/>');
    // content type is not duplicated when already present
    expect(xml.match(/term="answer"/g)).toHaveLength(1);
    expect(xml).toContain("Test &amp; feed");
  });

  it("uses updatedAt only when provided", () => {
    const xml = renderAtomFeed(meta, [entry({ updatedAt: "2026-07-01" })]);
    expect(xml).toContain("<published>2026-06-01T00:00:00.000Z</published>");
    expect(xml).toContain("<updated>2026-07-01T00:00:00.000Z</updated>");
  });

  it("sorts newest first and is deterministic for ties", () => {
    const sorted = sortFeedEntries([
      entry({ url: "https://example.com/b", publishedAt: "2026-01-01" }),
      entry({ url: "https://example.com/z", publishedAt: "2026-05-01" }),
      entry({ url: "https://example.com/c", publishedAt: "2026-05-01" }),
    ]);
    expect(sorted.map((e) => e.url.slice(-1))).toEqual(["c", "z", "b"]);
  });

  it("renders a valid empty feed", () => {
    const xml = renderAtomFeed(meta, []);
    expect(xml).toContain("<updated>1970-01-01T00:00:00.000Z</updated>");
    expect(xml).not.toContain("<entry>");
  });

  it("provides the feed author and skips entries with invalid dates", () => {
    const xml = renderAtomFeed(meta, [entry({ publishedAt: "not-a-date" })]);
    expect(xml).toContain("<author><name>Codex Cryptica</name></author>");
    expect(xml).not.toContain("<entry>");
  });

  it("falls back to publishedAt when updatedAt is malformed", () => {
    const xml = renderAtomFeed(meta, [entry({ updatedAt: "not-a-date" })]);
    expect(xml).toContain("<updated>2026-06-01T00:00:00.000Z</updated>");
  });
});
