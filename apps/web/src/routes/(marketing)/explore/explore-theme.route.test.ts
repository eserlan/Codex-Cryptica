/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import Page from "./+page.svelte";

describe("/explore label browsing theme", () => {
  beforeEach(() => {
    setPublicTheme.mockClear();
  });

  it("publishes the matching hub theme for a themed label", () => {
    render(Page, {
      props: { data: { label: "cyberpunk", results: [] } },
    });

    expect(setPublicTheme).toHaveBeenCalledWith("cyberpunk");
  });

  it("does not theme a label with no matching hub", () => {
    render(Page, {
      props: { data: { label: "unknown-thing", results: [] } },
    });

    expect(setPublicTheme).not.toHaveBeenCalled();
  });

  it("keeps the browsing genre when there is no label", () => {
    render(Page, {
      props: { data: { label: "", results: [] } },
    });

    expect(setPublicTheme).not.toHaveBeenCalled();
  });

  it("never indexes the theme map with an inherited Object.prototype key", () => {
    // Regression test: `label` comes straight off the query string, so an
    // object-keyed lookup (`HUB_SLUG_TO_THEME_ID[label]`) must not resolve
    // `__proto__`/`constructor`/`toString` to an inherited property instead
    // of `undefined`.
    for (const label of ["__proto__", "constructor", "toString"]) {
      setPublicTheme.mockClear();
      render(Page, { props: { data: { label, results: [] } } });
      expect(setPublicTheme).not.toHaveBeenCalled();
    }
  });
});
