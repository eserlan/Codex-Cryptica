import { describe, it, expect, vi } from "vitest";
import { GET } from "./+server";

vi.mock("$lib/config/seo-pages", () => ({
  solutions: {
    "test-sol": { slug: "test-sol" },
  },
  comparisons: {
    "test-comp": { slug: "test-comp" },
  },
}));

vi.mock("$lib/content/blog-content", () => ({
  loadLocalBlogArticles: vi
    .fn()
    .mockReturnValue([
      { slug: "test-blog-post", publishedAt: "2026-06-01T12:00:00.000Z" },
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
    expect(xml).toContain("https://codexcryptica.com/solutions/test-sol");
    expect(xml).toContain("https://codexcryptica.com/vs/test-comp");
    expect(xml).toContain("https://codexcryptica.com/generators/npc");
    expect(xml).toContain("https://codexcryptica.com/blog/test-blog-post");
  });
});
