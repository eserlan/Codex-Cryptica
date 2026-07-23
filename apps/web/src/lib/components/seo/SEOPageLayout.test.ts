/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it, vi, afterEach } from "vitest";
import SEOPageLayout from "./SEOPageLayout.svelte";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
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

  describe("UTM Referral Attribution Links", () => {
    it("renders solution-type navigation and CTA links with solution UTM params", () => {
      const { container } = render(SEOPageLayout, {
        props: {
          data: mockData,
          type: "solution",
        },
      });

      const logoLink = container.querySelector("#logo-link") as HTMLAnchorElement;
      const navCtaBtn = container.querySelector("#nav-cta-btn") as HTMLAnchorElement;
      const heroCtaBtn = container.querySelector("#hero-primary-cta") as HTMLAnchorElement;
      const footerCtaBtn = container.querySelector("#footer-cta-btn") as HTMLAnchorElement;

      expect(logoLink).toBeTruthy();
      expect(logoLink.getAttribute("href")).toContain("utm_source=solution-logo");
      expect(logoLink.getAttribute("href")).toContain("utm_medium=nav");
      expect(logoLink.getAttribute("href")).toContain("utm_campaign=seo-funnel");

      expect(navCtaBtn).toBeTruthy();
      expect(navCtaBtn.getAttribute("href")).toContain("utm_source=solution-nav");

      expect(heroCtaBtn).toBeTruthy();
      expect(heroCtaBtn.getAttribute("href")).toContain("utm_source=solution-hero");

      expect(footerCtaBtn).toBeTruthy();
      expect(footerCtaBtn.getAttribute("href")).toContain("utm_source=solution-footer");

      // Negative path check: verify links are not bare root links lacking UTM params
      expect(logoLink.getAttribute("href")).not.toBe("/");
      expect(navCtaBtn.getAttribute("href")).not.toBe("/");
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

      const logoLink = container.querySelector("#logo-link") as HTMLAnchorElement;
      const navCtaBtn = container.querySelector("#nav-cta-btn") as HTMLAnchorElement;
      const heroCtaBtn = container.querySelector("#hero-primary-cta") as HTMLAnchorElement;
      const footerCtaBtn = container.querySelector("#footer-cta-btn") as HTMLAnchorElement;

      expect(logoLink.getAttribute("href")).toContain("utm_source=vs-logo");
      expect(navCtaBtn.getAttribute("href")).toContain("utm_source=vs-nav");
      expect(heroCtaBtn.getAttribute("href")).toContain("utm_source=vs-hero");
      expect(footerCtaBtn.getAttribute("href")).toContain("utm_source=vs-footer");
    });
  });
});
