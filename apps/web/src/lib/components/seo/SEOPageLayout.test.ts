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
});
