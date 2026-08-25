/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SEOComparisonPageData } from "$lib/config/seo-comparisons";
import SEOPageLayout from "./SEOPageLayout.svelte";

vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("$app/environment", () => ({
  browser: true,
}));

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;
  };
}

describe("SEOPageLayout Breadcrumb & Schema Generation", () => {
  const mockData = {
    slug: "test-feature",
    title: "Test Feature Title",
    description: "Test Feature Description",
    h1: "Test H1 Header",
    subheading: "Test Subheading",
    introText: "Test Intro Text",
    faq: [{ question: "Q1", answer: "A1" }],
    ctaText: "Test CTA",
    keywords: ["test", "keyword"],
    features: [],
  };

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("generates correct three-level breadcrumb when nested canonicalUrl is provided", () => {
    render(SEOPageLayout, {
      props: {
        data: mockData,
        type: "solution",
        canonicalUrl: "/features/test-feature",
      },
    });

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    let breadcrumbFound = false;

    scripts.forEach((script) => {
      try {
        const json = JSON.parse(script.innerHTML);
        if (json["@type"] === "BreadcrumbList") {
          breadcrumbFound = true;
          expect(json.itemListElement).toHaveLength(3);
          expect(json.itemListElement[0].name).toBe("Home");
          expect(json.itemListElement[1].name).toBe("Features");
          expect(json.itemListElement[1].item).toBe(
            "https://codexcryptica.com/features",
          );
          expect(json.itemListElement[2].name).toBe("Test H1 Header");
          expect(json.itemListElement[2].item).toBe(
            "https://codexcryptica.com/features/test-feature",
          );
        }
      } catch {
        // ignore JSON parsing of non-breadcrumb scripts
      }
    });

    expect(breadcrumbFound).toBe(true);
  });

  it("generates standard breadcrumbs when no canonicalUrl is provided", () => {
    render(SEOPageLayout, {
      props: {
        data: mockData,
        type: "solution",
      },
    });

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    let breadcrumbFound = false;

    scripts.forEach((script) => {
      try {
        const json = JSON.parse(script.innerHTML);
        if (json["@type"] === "BreadcrumbList") {
          breadcrumbFound = true;
          expect(json.itemListElement).toHaveLength(3);
          expect(json.itemListElement[0].name).toBe("Home");
          expect(json.itemListElement[1].name).toBe("Solutions");
          expect(json.itemListElement[1].item).toBe(
            "https://codexcryptica.com/solutions",
          );
          expect(json.itemListElement[2].name).toBe("Test H1 Header");
          expect(json.itemListElement[2].item).toBe(
            "https://codexcryptica.com/solutions/test-feature",
          );
        }
      } catch {
        // ignore
      }
    });

    expect(breadcrumbFound).toBe(true);
  });

  // The wordmark and header CTA moved to MarketingShell when the shared shell
  // landed; their UTM values are pinned in marketing-shell.test.ts. What stays
  // this component's responsibility is the hero and footer CTAs.
  describe("UTM Referral Attribution Links", () => {
    it("renders solution-type navigation and CTA links with solution UTM params", () => {
      const { container } = render(SEOPageLayout, {
        props: {
          data: mockData,
          type: "solution",
        },
      });

      const heroCtaBtn = container.querySelector(
        "#hero-primary-cta",
      ) as HTMLAnchorElement;
      const footerCtaBtn = container.querySelector(
        "#footer-cta-btn",
      ) as HTMLAnchorElement;

      expect(heroCtaBtn).toBeTruthy();
      expect(heroCtaBtn.getAttribute("href")).toContain(
        "utm_source=solution-hero",
      );

      expect(footerCtaBtn).toBeTruthy();
      expect(footerCtaBtn.getAttribute("href")).toContain(
        "utm_source=solution-footer",
      );

      // Negative path check: verify links are not bare root links lacking UTM params
      expect(heroCtaBtn.getAttribute("href")).not.toBe("/");
      expect(footerCtaBtn.getAttribute("href")).not.toBe("/");
    });

    it("renders comparison-type navigation and CTA links with vs UTM params", () => {
      const mockComparisonData = {
        ...mockData,
        competitorName: "World Anvil",
        comparisonTable: [],
        verdict: "Codex wins",
      };

      const { container } = render(SEOPageLayout, {
        props: {
          data: mockComparisonData as any,
          type: "comparison",
        },
      });

      const heroCtaBtn = container.querySelector(
        "#hero-primary-cta",
      ) as HTMLAnchorElement;
      const footerCtaBtn = container.querySelector(
        "#footer-cta-btn",
      ) as HTMLAnchorElement;

      expect(heroCtaBtn.getAttribute("href")).toContain("utm_source=vs-hero");
      expect(footerCtaBtn.getAttribute("href")).toContain(
        "utm_source=vs-footer",
      );
    });
  });
});

const baseComparison: SEOComparisonPageData = {
  slug: "test-alternative",
  competitorName: "Test Tool",
  title: "Codex Cryptica vs Test Tool",
  description: "A fair comparison.",
  h1: "Keep the control. Skip the server.",
  subheading: "A local-first alternative.",
  introText: "Try Codex with a copy of your campaign.",
  ctaText: "Open Codex",
  keywords: ["test tool alternative"],
  features: [
    {
      title: "Local files",
      description: "Your working files stay local.",
      icon: "icon-[lucide--file-text]",
    },
  ],
  comparisonTable: [
    {
      feature: "Working data",
      competitorHas: "Application-managed",
      codexHas: "Local Markdown",
    },
  ],
  verdict: "Choose the workflow that fits your group.",
  faq: [],
};

describe("SEOPageLayout comparison details", () => {
  it("renders optional hosting, decision, and product-proof sections", () => {
    render(SEOPageLayout, {
      props: {
        type: "comparison",
        data: {
          ...baseComparison,
          hostingComparison: {
            eyebrow: "Self-hosted or local-first?",
            title: "A server is one way to own your campaign",
            description: "Local-first removes the server from the equation.",
            columns: ["Hosted Test Tool", "Self-hosted Test Tool", "Codex"],
            rows: [
              {
                factor: "You maintain infrastructure",
                values: ["No", "Yes", "No server"],
              },
            ],
          },
          productProof: {
            eyebrow: "See it in action",
            title: "Your campaign becomes a connected world",
            description: "Explore entities and relationships visually.",
            imageSrc: "/images/living-lore-graph.png",
            imageAlt: "Campaign relationship graph in Codex Cryptica",
            imageWidth: 1996,
            imageHeight: 1089,
            caption: "The relationship graph uses the same local vault data.",
          },
          decisionGuidance: [
            {
              title: "Choose Test Tool if…",
              description: "Hosted collaboration is the priority.",
              items: ["You want a hosted service"],
            },
            {
              title: "Choose Codex Cryptica if…",
              description: "Local control is the priority.",
              items: ["You want offline access"],
            },
          ],
        } as SEOComparisonPageData,
      },
    });

    expect(
      screen.getByRole("heading", {
        name: "A server is one way to own your campaign",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("table", {
        name: "Self-hosted and local-first operating model comparison",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("img", {
          name: "Campaign relationship graph in Codex Cryptica",
        })
        .getAttribute("loading"),
    ).toBe("lazy");
    expect(
      screen.getByRole("heading", { name: "Choose Test Tool if…" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Choose Codex Cryptica if…" }),
    ).toBeTruthy();
  });

  it("omits optional comparison sections when they are not configured", () => {
    render(SEOPageLayout, {
      props: { type: "comparison", data: baseComparison },
    });

    expect(
      screen.queryByRole("heading", {
        name: "A server is one way to own your campaign",
      }),
    ).toBeNull();
    expect(screen.queryByText("See it in action")).toBeNull();
    expect(screen.queryByText("Choose Test Tool if…")).toBeNull();
  });
});
