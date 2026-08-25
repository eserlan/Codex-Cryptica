import { describe, it, expect, vi } from "vitest";
import { load, entries } from "./+page";

vi.mock("$lib/config/seo-comparisons", () => ({
  comparisons: {
    "test-comp": {
      slug: "test-comp",
      title: "Test Comparison",
      description: "Test Description",
      faq: [],
      keywords: [],
    },
  },
}));

describe("Comparisons SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid comparison pages", () => {
      const res = load({ params: { slug: "test-comp" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.comparison.title).toBe("Test Comparison");
    });

    it("should throw error for invalid comparisons", () => {
      expect(() => load({ params: { slug: "invalid-slug" } } as any)).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of comparison slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([{ slug: "test-comp" }]);
    });
  });
});

describe("Responsible AI trust banner config", () => {
  it("world-anvil comparison has aiTrustSection enabled", async () => {
    const { comparisons: realComparisons } = (await vi.importActual(
      "$lib/config/seo-comparisons",
    )) as typeof import("$lib/config/seo-comparisons");
    expect(realComparisons["world-anvil"].aiTrustSection).toBe(true);
  });

  it("non-World-Anvil comparisons do not have aiTrustSection", async () => {
    const { comparisons: realComparisons } = (await vi.importActual(
      "$lib/config/seo-comparisons",
    )) as typeof import("$lib/config/seo-comparisons");
    const others = Object.entries(realComparisons).filter(
      ([slug]) => slug !== "world-anvil",
    );
    for (const [, page] of others) {
      expect(page.aiTrustSection).toBeFalsy();
    }
  });
});

describe("Kanka self-hosted comparison config", () => {
  it("covers self-hosted intent, risk reversal, proof, and fair-fit guidance", async () => {
    const { comparisons: realComparisons } = (await vi.importActual(
      "$lib/config/seo-comparisons",
    )) as typeof import("$lib/config/seo-comparisons");
    const kanka = realComparisons["kanka-alternative"];

    expect(kanka.eyebrow).toMatch(/self-hosted Kanka alternative/i);
    expect(kanka.keywords).toContain("kanka self hosted");
    expect(kanka.hostingComparison?.rows.length).toBeGreaterThan(0);
    expect(kanka.productProof?.imageSrc).toBeTruthy();
    expect(kanka.decisionGuidance).toHaveLength(2);
    expect(`${kanka.introText} ${kanka.secondaryCtaText}`).toMatch(
      /copy of your campaign|Kanka copy/i,
    );
  });

  it("does not repeat outdated entity-limit or proprietary-format claims", async () => {
    const { comparisons: realComparisons } = (await vi.importActual(
      "$lib/config/seo-comparisons",
    )) as typeof import("$lib/config/seo-comparisons");
    const pageCopy = JSON.stringify(realComparisons["kanka-alternative"]);

    expect(pageCopy).not.toContain("Limited on free tier");
    expect(pageCopy).not.toContain("No (Proprietary)");
    expect(pageCopy).toMatch(/Unlimited campaigns and entries/i);
  });
});
