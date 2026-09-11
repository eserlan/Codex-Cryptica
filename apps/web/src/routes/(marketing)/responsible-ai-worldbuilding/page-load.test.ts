import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { load } from "./+page";
import Page from "./+page.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/content/blog-content", () => ({
  loadBlogIndex: vi.fn().mockResolvedValue([
    {
      slug: "lore-oracle-not-the-author",
      title: "Author Test",
      publishedAt: "2026-06-06T10:00:00Z",
    },
    {
      slug: "worldbuilding-tool-without-ai",
      title: "Optional Test",
      publishedAt: "2026-06-06T12:00:00Z",
    },
    {
      slug: "other-post",
      title: "Should Be Ignored",
      publishedAt: "2026-06-05T00:00:00Z",
    },
  ]),
}));

vi.mock("$lib/seo/site", () => ({
  buildAbsoluteUrl: (path: string) => `https://example.com${path}`,
}));

describe("responsible-ai-worldbuilding page loader", () => {
  it("loads only the relevant responsible AI articles in the correct series sequence", async () => {
    const result = (await load({
      params: {},
      route: { id: "/(marketing)/responsible-ai-worldbuilding" },
      url: new URL("https://example.com"),
    } as any)) as { articles: Array<{ slug: string }>; canonicalUrl: string };

    expect(result.articles).toBeDefined();
    expect(result.articles.length).toBe(2);
    expect(result.articles[0].slug).toBe("lore-oracle-not-the-author");
    expect(result.articles[1].slug).toBe("worldbuilding-tool-without-ai");
    expect(result.canonicalUrl).toBe(
      "https://example.com/responsible-ai-worldbuilding",
    );
  });
});

describe("responsible-ai-worldbuilding component", () => {
  it("renders page content without an embedded navigation header", () => {
    const mockData = {
      articles: [
        {
          slug: "lore-oracle-not-the-author",
          title: "Author Test",
          publishedAt: "2026-06-06T10:00:00Z",
        },
      ],
      canonicalUrl: "https://example.com/responsible-ai-worldbuilding",
    };

    const { container } = render(Page, { props: { data: mockData as any } });

    // The shared shell owns the sticky site header; the page should have no internal <header> nav
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("#logo-link")).toBeNull();
    expect(container.querySelector("#nav-cta-btn")).toBeNull();

    // Verify main content renders
    expect(
      screen.getByRole("heading", {
        name: /Responsible AI for RPG Worldbuilding/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /The 7 Pillars of Responsible AI/i }),
    ).toBeTruthy();
  });
});
