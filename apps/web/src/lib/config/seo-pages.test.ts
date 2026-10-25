import { describe, expect, it } from "vitest";
import { solutions } from "./seo-pages";

describe("solution page secondary CTAs", () => {
  it("send the name generator CTA to the canonical route (#4392)", () => {
    expect(solutions["ai-worldbuilding-tool"].secondaryCtaHref).toBe(
      "/generators/fantasy-names",
    );
  });

  it("never link the legacy fantasy name tool, which canonicalises away", () => {
    const legacy = Object.values(solutions).filter(
      (page) => page.secondaryCtaHref === "/tools/fantasy-name-generator",
    );
    expect(legacy).toEqual([]);
  });
});
