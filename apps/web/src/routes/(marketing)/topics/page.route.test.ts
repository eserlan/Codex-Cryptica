/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { listLiveTopics } from "#lib/content/topics/directory.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import Page from "./+page.svelte";
import { load, prerender } from "./+page.js";

const EXPECTED = [
  ["/topics/heists", "Heists"],
  ["/topics/puzzles", "Puzzles"],
  ["/topics/pirates", "Pirates & High Seas"],
  ["/topics/solo-rpg", "Solo RPGs"],
  ["/topics/dnd", "Running D&D"],
  ["/topics/dnd-beginners", "D&D for Beginners"],
  ["/topics/star-systems", "Star Systems & Sci-Fi"],
];

describe("/topics route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("is prerendered and loads the six live topics", () => {
    expect(prerender).toBe(true);
    const result = (load as unknown as () => { topics: unknown[] })();
    expect(result.topics).toHaveLength(7);
  });

  it("renders a link per topic in order", () => {
    const { container } = render(Page, {
      props: { data: { topics: listLiveTopics() } },
    });
    expect(container.querySelector("h1")?.textContent).toBe("Topics");
    const links = [...container.querySelectorAll("ul.grid a")];
    expect(
      links.map((a) => [
        a.getAttribute("href"),
        a.querySelector("h2")?.textContent?.trim(),
      ]),
    ).toEqual(EXPECTED);
    for (const icon of container.querySelectorAll("ul.grid a span")) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
    expect(container.querySelector("ul.grid")?.className).toContain(
      "xl:grid-cols-3",
    );
  });

  it("is indexable with a canonical URL and title", () => {
    render(Page, { props: { data: { topics: listLiveTopics() } } });
    expect(document.title).toBe("Topics | Codex Cryptica");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe("https://codexcryptica.com/topics");
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).not.toContain("noindex");
    expect(document.head.innerHTML).not.toContain("noindex");
  });

  it("emits CollectionPage and BreadcrumbList JSON-LD", () => {
    render(Page, { props: { data: { topics: listLiveTopics() } } });
    const docs = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ].map((s) => JSON.parse(s.textContent ?? "{}"));
    const collection = docs.find((d) => d["@type"] === "CollectionPage");
    const crumbs = docs.find((d) => d["@type"] === "BreadcrumbList");
    expect(collection.mainEntity["@type"]).toBe("ItemList");
    expect(collection.mainEntity.itemListElement).toHaveLength(7);
    expect(crumbs.itemListElement).toHaveLength(3);
    expect(crumbs.itemListElement[2].item).toBe(
      "https://codexcryptica.com/topics",
    );
  });
});
