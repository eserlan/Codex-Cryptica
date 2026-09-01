/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({ base: "" }));

import Page from "./+page.svelte";

describe("/explore route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("publishes dedicated Open Graph and Twitter metadata", () => {
    render(Page);

    const expectedImage =
      "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";

    expect(document.title).toBe("Explore Codex Cryptica | Codex Cryptica");
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe(
      "Every section of Codex Cryptica in one place — worlds, examples, generators, tools, guides, and the campaign directory.",
    );
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content"),
    ).toBe("Explore Codex Cryptica's connected campaign-building tools");
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
});
