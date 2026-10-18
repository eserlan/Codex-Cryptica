import { describe, it, expect } from "vitest";
import { getLandingPageCanonicalUrl } from "./canonical";
import { getAllLandingPages, getLandingPage } from "./registry";
import type { LandingPageConfig } from "./schema";

describe("getLandingPageCanonicalUrl", () => {
  it("derives the canonical URL from the slug", () => {
    const westMarches = getLandingPage("west-marches")!;
    expect(getLandingPageCanonicalUrl(westMarches)).toBe(
      "https://codexcryptica.com/for/west-marches",
    );
  });

  it("gives every registered landing page a canonical URL on its own route", () => {
    for (const page of getAllLandingPages()) {
      expect(getLandingPageCanonicalUrl(page), page.slug).toBe(
        `https://codexcryptica.com/for/${page.slug}`,
      );
    }
  });

  it("honours an explicit canonical that points elsewhere", () => {
    const consolidated: LandingPageConfig = {
      slug: "moved-page",
      kind: "use-case",
      seo: {
        title: "Moved",
        description: "Moved",
        canonical: "https://codexcryptica.com/for/sandbox-campaigns",
      },
      hero: { title: "Moved", tagline: "Moved", problemStatement: "Moved" },
      useCases: [],
      recommendedTools: [],
      cta: { title: "CTA", buttonText: "Go", buttonHref: "/app" },
    };

    expect(getLandingPageCanonicalUrl(consolidated)).toBe(
      "https://codexcryptica.com/for/sandbox-campaigns",
    );
  });
});
