/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { getAllExamples } from "#lib/content/examples/registry.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import Page from "./+page.svelte";

describe("/examples route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("uses a dedicated social preview image", () => {
    render(Page, { props: { data: { examples: getAllExamples() } } });

    const expectedImage =
      "https://assets.codexcryptica.com/announcements/ship-cinder-wren.jpg";

    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content"),
    ).toBe(
      "The Cinder Wren, a space-western ship generated with Codex Cryptica",
    );
    expect(
      document
        .querySelector('meta[property="og:image:width"]')
        ?.getAttribute("content"),
    ).toBe("1376");
    expect(
      document
        .querySelector('meta[property="og:image:height"]')
        ?.getAttribute("content"),
    ).toBe("768");
    expect(
      document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).not.toBe("https://codexcryptica.com/og-image.png");
  });

  it("fills the widescreen canvas and adds a column on large screens", () => {
    const { container } = render(Page, {
      props: { data: { examples: getAllExamples() } },
    });

    expect(container.querySelector(".max-w-7xl")).not.toBeNull();
    expect(container.querySelector(".max-w-5xl")).toBeNull();
    expect(container.querySelector("ul.grid")?.className).toContain(
      "xl:grid-cols-3",
    );
  });
});
