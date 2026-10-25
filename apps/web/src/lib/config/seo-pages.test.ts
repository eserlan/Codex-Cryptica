import { describe, expect, it } from "vitest";
import { solutions } from "./seo-pages";

describe("solution page secondary CTAs", () => {
  it("send the name generator CTA to the canonical route (#4392)", () => {
    expect(solutions["ai-worldbuilding-tool"].secondaryCtaHref).toBe(
      "/generators/fantasy-names",
    );
  });
});
