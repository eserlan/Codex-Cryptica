/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import { HUB_THEME_SLUGS } from "#lib/content/hub-themes.js";
import { GENERATOR_CATALOGUE } from "#lib/content/generator-catalogue.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => (p === "" ? "/" : p),
}));

describe("Generator hubs", () => {
  it("links to the Cosmic Horror generator hub", () => {
    render(Page);

    const link = screen.getByRole("link", { name: /cosmic horror hub/i });

    expect(link.getAttribute("href")).toBe("/generators/cosmic-horror");
    expect(link.querySelector("span.font-header")).toBeTruthy();
  });

  it("keeps the cosmic-horror hub distinct from the vampire hub", () => {
    render(Page);

    expect(
      screen.getByRole("link", { name: /vampire hub/i }).getAttribute("href"),
    ).toBe("/generators/vampire");
  });
});

describe("Generator index structure", () => {
  it("links every theme hub", () => {
    const { container } = render(Page);

    for (const slug of HUB_THEME_SLUGS) {
      expect(
        container.querySelector(`a[href="/generators/${slug}"]`),
        slug,
      ).toBeTruthy();
    }
  });

  it("links every catalogued generator, including previously unlisted ones", () => {
    const { container } = render(Page);

    for (const entry of GENERATOR_CATALOGUE) {
      expect(
        container.querySelector(`a[href="/generators/${entry.slug}"]`),
        entry.slug,
      ).toBeTruthy();
    }
    expect(
      screen.getByRole("link", { name: /sci-fi world generator/i }),
    ).toBeTruthy();
  });

  it("offers jump links to each category section", () => {
    const { container } = render(Page);
    const nav = screen.getByRole("navigation", {
      name: /generator categories/i,
    });
    const link = nav.querySelector('a[href="#places"]');

    expect(link).toBeTruthy();
    expect(container.querySelector("section#places")).toBeTruthy();
    expect(nav.querySelector('a[href="#not-a-category"]')).toBeNull();
  });

  it("never produces protocol-relative links (e.g. //generators/...)", () => {
    const { container } = render(Page);
    const links = container.querySelectorAll<HTMLAnchorElement>("a[href]");

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href.startsWith("//")).toBe(false);
      if (href.startsWith("/generators")) {
        expect(href).toMatch(/^\/generators\/[a-z0-9-]+$/);
      }
    }
  });
});
