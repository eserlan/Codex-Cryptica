import { describe, expect, it } from "vitest";
import {
  STATIC_SITEMAP_ROUTES,
  configPageRoutes,
  contentRoute,
  escapeXml,
  renderSitemapDocument,
  renderSitemapUrl,
} from "./sitemap-routes";

describe("sitemap routes", () => {
  it("lists every static path once, each starting with a slash", () => {
    const paths = STATIC_SITEMAP_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith("/"))).toBe(true);
  });

  it("keeps the 301 stub tool pages out of the sitemap", () => {
    const paths = STATIC_SITEMAP_ROUTES.map((route) => route.path);
    expect(paths).not.toContain("/tools/dnd-npc-generator");
    expect(paths).not.toContain("/tools/faction-generator");
  });

  it("builds generated pages as monthly, priority 0.8", () => {
    expect(contentRoute("/vs/obsidian")).toEqual({
      path: "/vs/obsidian",
      changefreq: "monthly",
      priority: "0.8",
    });
  });

  it("escapes XML special characters in locations", () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe(
      "a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;",
    );
    const row = renderSitemapUrl({
      loc: "https://x.test/?a=1&b=2",
      changefreq: "weekly",
      priority: "0.5",
    });
    expect(row).toContain("<loc>https://x.test/?a=1&amp;b=2</loc>");
  });

  it("only writes lastmod when one is given", () => {
    const base = {
      loc: "https://x.test/",
      changefreq: "weekly" as const,
      priority: "1.0",
    };
    expect(renderSitemapUrl(base)).not.toContain("<lastmod>");
    expect(renderSitemapUrl({ ...base, lastmod: "2026-01-01" })).toContain(
      "<lastmod>2026-01-01</lastmod>",
    );
  });

  it("wraps rows in the urlset document with the stylesheet", () => {
    const xml = renderSitemapDocument(["  <url></url>"]);
    expect(xml).toContain(
      '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    );
    expect(xml).toContain("<urlset");
    expect(xml).toContain("  <url></url>");
  });
});

describe("configPageRoutes", () => {
  it("maps solution and comparison slugs to their public paths", () => {
    const paths = configPageRoutes({
      solutions: { dm: {} },
      comparisons: { notion: {} },
    }).map((route) => route.path);
    expect(paths).toEqual(["/solutions/dm", "/vs/notion"]);
  });

  it("returns nothing for empty configs", () => {
    expect(configPageRoutes({ solutions: {}, comparisons: {} })).toEqual([]);
  });
});
