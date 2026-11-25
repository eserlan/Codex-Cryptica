/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";
import BlogPage from "./+page.svelte";
import ArticlePage from "./[slug]/+page.svelte";
import { publicThemeStore } from "#lib/stores/public-theme.svelte.js";
import { THEME_STORAGE_KEY } from "#lib/theme/theme-dom.js";

const article = {
  id: "test-article",
  title: "A Test Article",
  description: "A short test article.",
  publishedAt: "2026-01-01T00:00:00.000Z",
  author: "Test Author",
  slug: "test-article",
  content: "# A Test Article\n\nThe article body.",
  keywords: [],
};

describe("blog theme jargon", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    publicThemeStore.clear();
    localStorage.setItem(THEME_STORAGE_KEY, "horror");
  });

  it("uses the saved world theme for blog index actions without a public genre", () => {
    render(BlogPage, {
      props: {
        data: {
          articles: [article],
          canonicalUrl: "https://example.test/blog",
        },
      },
    });

    expect(screen.getByText("Examine Records")).toBeTruthy();
  });

  it("uses the saved world theme for article labels without a public genre", () => {
    render(ArticlePage, {
      props: {
        data: {
          article,
          canonicalUrl: "https://example.test/blog/test-article",
        },
      },
    });

    expect(screen.getByText("Tome Entry")).toBeTruthy();
  });
});
