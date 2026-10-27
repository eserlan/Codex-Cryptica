/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import {
  getAllExamples,
  getConnectedExample,
  getRelatedExamples,
} from "#lib/content/examples/registry.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import Page from "./+page.svelte";

const example = getAllExamples()[0];
const data = {
  example,
  related: getRelatedExamples(example),
  connected: getConnectedExample(example),
};

describe("/examples/[slug] route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("uses the widescreen canvas", () => {
    render(Page, { props: { data } });

    const article = screen.getByTestId("example-article");
    expect(article.className).toContain("max-w-7xl");
    expect(article.className).not.toContain("max-w-3xl");
  });

  it("keeps generation context before the output and floats it right on desktop", () => {
    render(Page, { props: { data } });

    const context = screen.getByTestId("example-context");
    expect(context.className).toContain("lg:sticky");
    expect(context.className).toContain("lg:col-start-9");

    const output = screen.getByRole("heading", {
      name: "Generated output",
      hidden: true,
    });
    // DOM order is the mobile reading order: context comes first.
    expect(
      context.compareDocumentPosition(output) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders exactly one h1 and the generator link", () => {
    render(Page, { props: { data } });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen
        .getByTestId("example-context")
        .querySelector(`a[href="${example.generator.href}"]`),
    ).not.toBeNull();
  });

  it("moves related links into the sidebar from lg and keeps them inline below", () => {
    render(Page, { props: { data } });

    const aside = screen.getByTestId("example-context");
    expect(aside.tagName).toBe("ASIDE");
    expect(aside.getAttribute("aria-labelledby")).toBe("example-aside-heading");
    expect(screen.getByTestId("example-aside-panel").className).toContain(
      "bg-theme-surface/30",
    );
    // The stacked list is hidden at lg, where the sidebar carries it.
    const inline = screen.queryByTestId("example-related-inline");
    if (inline) expect(inline.className).toContain("lg:hidden");
  });
});
