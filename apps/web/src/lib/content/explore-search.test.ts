import { describe, expect, it } from "vitest";
import {
  buildExploreSearchIndex,
  searchExplore,
  EXPLORE_SEARCH_LIMIT,
} from "./explore-search";
import { getAllPublicContent } from "./labels/aggregate";

const item = (
  title: string,
  summary = "s",
  keywords: string[] = [],
  kind: "answer" | "for" = "answer",
) => ({ kind, title, summary, href: `/x/${title}`, keywords });

describe("searchExplore", () => {
  const index = buildExploreSearchIndex([
    item("Pirate ship guide"),
    item("Sea campaigns", "Sail with a pirate crew"),
    item("Pirate Campaign Guide", "s", ["pirate rpg campaign manager"], "for"),
    item("Dungeon maps"),
  ]);

  it("matches titles case-insensitively and ranks title hits first", () => {
    const titles = searchExplore(index, "PIRATE").map((r) => r.title);
    expect(titles.slice(0, 2)).toEqual([
      "Pirate ship guide",
      "Pirate Campaign Guide",
    ]);
    expect(titles).toContain("Sea campaigns");
    expect(titles).not.toContain("Dungeon maps");
  });

  it("requires every word to match, across title and aliases", () => {
    expect(
      searchExplore(index, "pirate rpg manager").map((r) => r.title),
    ).toEqual(["Pirate Campaign Guide"]);
    expect(searchExplore(index, "pirate dungeon")).toEqual([]);
  });

  it("returns nothing for blank or unmatched queries", () => {
    expect(searchExplore(index, "   ")).toEqual([]);
    expect(searchExplore(index, "zzzqqq")).toEqual([]);
  });

  it("caps the number of results", () => {
    const many = buildExploreSearchIndex(
      Array.from({ length: 50 }, (_, i) => item(`Pirate ${i}`)),
    );
    expect(searchExplore(many, "pirate")).toHaveLength(EXPLORE_SEARCH_LIMIT);
  });
});

describe("real public content", () => {
  const index = buildExploreSearchIndex(getAllPublicContent());

  it("finds the pirate hub and example for 'pirate'", () => {
    const hrefs = searchExplore(index, "pirate", 100).map((r) => r.href);
    expect(hrefs).toContain("/generators/pirate");
    expect(hrefs).toContain(
      "/examples/letters-of-marque-expired-pirate-adventure",
    );
  });

  it("finds a /for guide by its subject", () => {
    const results = searchExplore(index, "space western", 100);
    expect(
      results.some(
        (r) => r.kind === "for" && r.href.endsWith("/for/space-western"),
      ),
    ).toBe(true);
  });

  it("finds a /for page through its registry alias", () => {
    const hrefs = searchExplore(index, "d&d campaign organiser").map(
      (r) => r.href,
    );
    expect(hrefs.some((h) => h.endsWith("/for/dungeons-and-dragons"))).toBe(
      true,
    );
  });
});
