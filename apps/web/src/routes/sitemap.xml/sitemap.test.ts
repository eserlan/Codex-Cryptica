import { describe, it, expect, vi } from "vitest";
import { GET } from "./+server";

const { RA_SLUGS } = vi.hoisted(() => ({
  RA_SLUGS: [
    "lore-oracle-not-the-author",
    "worldbuilding-tool-without-ai",
    "worldbuilding-ai-needs-your-lore",
    "drafts-are-not-canon",
    "ai-campaign-prep-without-losing-your-voice",
    "ai-slop-is-context-failure",
    "revising-your-lore-with-the-oracle",
  ],
}));

vi.mock("$lib/config/seo-pages", () => ({
  solutions: {
    "test-sol": { slug: "test-sol" },
  },
  featuresConfig: {
    "test-feat": { slug: "test-feat" },
  },
  importsConfig: {
    "test-import": { slug: "test-import" },
  },
}));

vi.mock("$lib/config/seo-comparisons", () => ({
  comparisons: {
    "test-comp": { slug: "test-comp" },
  },
}));

vi.mock("$lib/content/blog-content", () => ({
  loadLocalBlogArticles: vi.fn().mockReturnValue([
    { slug: "test-blog-post", publishedAt: "2026-06-01T12:00:00.000Z" },
    ...RA_SLUGS.map((slug) => ({
      slug,
      publishedAt: "2026-06-06T16:00:00.000Z",
    })),
  ]),
}));

describe("Sitemap.xml API Endpoint", () => {
  it("should return a valid XML response with all routes", async () => {
    const response = await GET();
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml");

    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://codexcryptica.com/tools");
    expect(xml).toContain("https://codexcryptica.com/generators");
    expect(xml).toContain("https://codexcryptica.com/generators/faction");
    expect(xml).toContain(
      "https://codexcryptica.com/tools/vampire-clan-generator",
    );
    expect(xml).toContain("https://codexcryptica.com/solutions/test-sol");
    expect(xml).toContain("https://codexcryptica.com/vs/test-comp");
    expect(xml).toContain("https://codexcryptica.com/features/test-feat");
    expect(xml).toContain("https://codexcryptica.com/import/test-import");
    expect(xml).toContain("https://codexcryptica.com/generators/npc");
    expect(xml).toContain("https://codexcryptica.com/generators/random");
    expect(xml).toContain("https://codexcryptica.com/blog/test-blog-post");
    // Responsible AI pillar page
    expect(xml).toContain(
      "https://codexcryptica.com/responsible-ai-worldbuilding",
    );
    // All seven RA series articles
    for (const slug of RA_SLUGS) {
      expect(xml).toContain(`https://codexcryptica.com/blog/${slug}`);
    }
  });
});
