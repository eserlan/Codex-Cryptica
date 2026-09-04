import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LandingPageConfig } from "$lib/content/for/schema";

const previewTheme = vi.fn();

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    previewTheme: (id: string | null) => previewTheme(id),
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

describe("/for/[slug] theme preview", () => {
  beforeEach(() => {
    previewTheme.mockClear();
  });

  it("previews the theme a pack declares", () => {
    render(LandingPage, {
      props: { data: { config: makeConfig({ theme: "fantasy" }) } },
    });

    expect(previewTheme).toHaveBeenCalledWith("fantasy");
  });

  it("clears the preview for a pack with no theme", () => {
    // SvelteKit reuses this component between /for/[slug] pages, so onDestroy
    // does not run in between. A campaign-style pack ships without a theme; if
    // it only set a preview when one existed, it would inherit the theme of
    // whichever page the reader came from.
    render(LandingPage, {
      props: { data: { config: makeConfig({ theme: undefined }) } },
    });

    expect(previewTheme).toHaveBeenCalledWith(null);
    expect(previewTheme).not.toHaveBeenCalledWith("fantasy");
  });
});
