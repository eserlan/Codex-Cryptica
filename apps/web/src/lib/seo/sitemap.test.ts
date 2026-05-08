import { describe, expect, it } from "vitest";
import { buildSitemapEntries, buildSitemapXml } from "./sitemap";

describe("sitemap builder", () => {
  it("includes the public blog archive and every blog post", () => {
    const entries = buildSitemapEntries(
      [
        {
          id: "post-1",
          slug: "first-post",
          title: "First Post",
          description: "A short summary",
          publishedAt: "2026-04-05T00:00:00.000Z",
        },
        {
          id: "post-2",
          slug: "second-post",
          title: "Second Post",
          description: "Another summary",
          publishedAt: "2026-04-04T00:00:00.000Z",
        },
      ],
      "https://example.com",
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ loc: "https://example.com/blog" }),
        expect.objectContaining({
          loc: "https://example.com/blog/first-post",
          lastmod: "2026-04-05T00:00:00.000Z",
        }),
        expect.objectContaining({
          loc: "https://example.com/blog/second-post",
          lastmod: "2026-04-04T00:00:00.000Z",
        }),
      ]),
    );
  });

  it("serializes valid sitemap XML", () => {
    const xml = buildSitemapXml([
      {
        loc: "https://example.com/blog/first-post",
        changefreq: "monthly",
        priority: "0.8",
        lastmod: "2026-04-05T00:00:00.000Z",
      },
    ]);

    expect(xml).toContain(
      '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    );
    expect(xml).toContain("<loc>https://example.com/blog/first-post</loc>");
    expect(xml).toContain("<lastmod>2026-04-05T00:00:00.000Z</lastmod>");
  });
});
