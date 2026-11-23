import { describe, expect, it } from "vitest";
import { isCurrentPointCrawlRefinement } from "./point-crawl-refinement.js";

describe("point crawl refinement ownership", () => {
  it("rejects a result after the selected crawl changes during module loading", () => {
    const requestedCrawl = { id: "old" };
    const replacementCrawl = { id: "new" };

    expect(
      isCurrentPointCrawlRefinement(1, 1, replacementCrawl, requestedCrawl),
    ).toBe(false);
  });

  it("rejects a superseded request even while the crawl object is unchanged", () => {
    const crawl = { id: "current" };

    expect(isCurrentPointCrawlRefinement(1, 2, crawl, crawl)).toBe(false);
  });
});
