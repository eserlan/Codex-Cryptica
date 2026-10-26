import { describe, it, expect } from "vitest";
import { PRERENDER_ENTRIES } from "./prerender-entries";

describe("PRERENDER_ENTRIES", () => {
  it("prerenders every parameterless route, not only the ones the crawler reaches", () => {
    // Without "*", pages such as /changelog, /for and /topics/* are skipped
    // silently whenever no crawled page links to them.
    expect(PRERENDER_ENTRIES).toContain("*");
  });

  it("lists only root-relative paths besides the wildcard", () => {
    const invalid = PRERENDER_ENTRIES.filter(
      (entry) => entry !== "*" && !entry.startsWith("/"),
    );
    expect(invalid).toEqual([]);
  });
});
