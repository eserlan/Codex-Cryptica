/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { CASTLE_FLOORPLAN_RESOURCES } from "$lib/content/resources/castle-floorplans";

vi.mock("$app/paths", () => ({ base: "" }));

import Page from "./+page.svelte";

describe("/resources/castle-floorplans route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("sets the title and canonical URL", () => {
    render(Page);

    expect(document.title).toBe(
      "Great Castle Floorplans for RPGs and Worldbuilding | Codex Cryptica",
    );

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink?.getAttribute("href")).toBe(
      "https://codexcryptica.com/resources/castle-floorplans",
    );
  });

  it("emits both the CollectionPage and BreadcrumbList JSON-LD snippets", () => {
    render(Page);

    const scripts = document.head.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(2);

    const [collectionPage, breadcrumb] = Array.from(scripts).map((script) =>
      JSON.parse(script.textContent ?? "{}"),
    );
    expect(collectionPage["@type"]).toBe("CollectionPage");
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
  });

  it("links out to every curated source", () => {
    const { getByRole } = render(Page);

    for (const resource of CASTLE_FLOORPLAN_RESOURCES) {
      const link = getByRole("link", {
        name: `View the ${resource.name} floor plans`,
      });
      expect(link.getAttribute("href")).toBe(resource.url);
    }
  });

  it("links back to the related answers and generators", () => {
    const { getByRole } = render(Page);

    expect(
      getByRole("link", {
        name: /what should an rpg settlement contain\?/i,
      }).getAttribute("href"),
    ).toBe("/answers/what-should-an-rpg-settlement-contain");
    expect(
      getByRole("link", {
        name: /what makes a good heist target\?/i,
      }).getAttribute("href"),
    ).toBe("/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg");
  });
});
