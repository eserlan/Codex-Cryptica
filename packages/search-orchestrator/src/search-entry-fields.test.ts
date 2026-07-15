import { describe, expect, it } from "vitest";
import { buildSearchAliases, buildSearchKeywords } from "./search-entry-fields";

describe("search-entry-fields", () => {
  it("preserves non-nullish metadata values and stringifies array values", () => {
    const keywords = buildSearchKeywords({
      labels: ["tag-a"],
      lore: "Lore",
      metadata: {
        chapter: 0,
        hidden: false,
        facets: [1, false, "north", null, undefined],
      },
    });

    expect(keywords).toBe("tag-a Lore 0 false 1 false north");
  });

  it("stringifies non-nullish aliases", () => {
    const aliases = buildSearchAliases({
      aliases: ["The Hero", 0, false, null, undefined],
    });

    expect(aliases).toBe("The Hero 0 false");
  });
});
