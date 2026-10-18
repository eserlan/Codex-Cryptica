/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const previewTheme = vi.fn();

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    previewTheme: (id: string | null) => previewTheme(id),
  },
}));

import Page from "./+page.svelte";

describe("/explore label theme preview", () => {
  beforeEach(() => {
    previewTheme.mockClear();
  });

  it("previews the matching hub theme for a themed label", () => {
    render(Page, {
      props: { data: { label: "cyberpunk", results: [] } },
    });

    expect(previewTheme).toHaveBeenCalledWith("cyberpunk");
  });

  it("does not theme a label with no matching hub", () => {
    render(Page, {
      props: { data: { label: "unknown-thing", results: [] } },
    });

    expect(previewTheme).toHaveBeenCalledWith(null);
  });

  it("clears the preview when there is no label", () => {
    render(Page, {
      props: { data: { label: "", results: [] } },
    });

    expect(previewTheme).toHaveBeenCalledWith(null);
  });

  it("never indexes the theme map with an inherited Object.prototype key", () => {
    // Regression test: `label` comes straight off the query string, so an
    // object-keyed lookup (`HUB_SLUG_TO_THEME_ID[label]`) must not resolve
    // `__proto__`/`constructor`/`toString` to an inherited property instead
    // of `undefined`.
    for (const label of ["__proto__", "constructor", "toString"]) {
      previewTheme.mockClear();
      render(Page, { props: { data: { label, results: [] } } });
      expect(previewTheme).toHaveBeenCalledWith(null);
    }
  });
});
