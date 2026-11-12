import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LandingPageConfig } from "#lib/content/for/schema.js";

const setPublicTheme = vi.fn();

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("#lib/stores/public-theme.svelte.js", () => ({
  publicThemeStore: {
    setTheme: (id: string) => setPublicTheme(id),
  },
}));

import LandingPage from "./+page.svelte";

const makeConfig = (
  overrides: Partial<LandingPageConfig> = {},
): LandingPageConfig => ({
  slug: "test-page",
  kind: "genre",
  seo: { title: "Title", description: "Description" },
  hero: { title: "Hero", tagline: "Tagline", problemStatement: "Problem" },
  useCases: [],
  recommendedTools: [],
  cta: { title: "CTA", buttonText: "Go", buttonHref: "/app" },
  ...overrides,
});

describe("/for/[slug] public genre context", () => {
  beforeEach(() => {
    setPublicTheme.mockClear();
  });

  it("publishes the theme a pack declares", () => {
    render(LandingPage, {
      props: { data: { config: makeConfig({ theme: "fantasy" }) } },
    });

    expect(setPublicTheme).toHaveBeenCalledWith("fantasy");
  });

  it("does not erase browsing genre on a pack with no theme", () => {
    // Genre-less public pages inherit the visitor's existing public context.
    render(LandingPage, {
      props: { data: { config: makeConfig({ theme: undefined }) } },
    });

    expect(setPublicTheme).not.toHaveBeenCalled();
  });
});

describe("/for/[slug] canonical metadata", () => {
  it("states the same apex URL in the canonical link and og:url", () => {
    render(LandingPage, {
      props: { data: { config: makeConfig({ slug: "meta-page" }) } },
    });

    const canonical = document.head
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href");
    const ogUrl = document.head
      .querySelector('meta[property="og:url"]')
      ?.getAttribute("content");

    expect(canonical).toMatch(/^https:\/\/codexcryptica\.com\/for\/meta-page/);
    expect(ogUrl).toBe(canonical);
    expect(
      document.head.querySelectorAll('meta[property="og:url"]'),
    ).toHaveLength(1);
  });
});
