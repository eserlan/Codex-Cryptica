import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/svelte";
import { load, entries } from "./+page";
import Page from "./+page.svelte";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

// Stub Element.prototype.animate for Svelte transitions compatibility in Vitest
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

describe("Imports SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid importer pages", () => {
      const res = load({ params: { slug: "obsidian-vault" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.importPage.slug).toBe("obsidian-vault");
    });

    it("should throw error for invalid importer slugs", () => {
      expect(() =>
        load({ params: { slug: "invalid-importer" } } as any),
      ).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of valid importer slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([
        { slug: "obsidian-vault" },
        { slug: "world-anvil-export" },
        { slug: "kanka-json" },
        { slug: "legendkeeper-json" },
      ]);
    });
  });

  describe("Component Schema Injection", () => {
    afterEach(() => {
      document.head.innerHTML = "";
    });

    it("should inject JSON-LD schemas into the rendered document", () => {
      const mockPageData = {
        slug: "obsidian-vault",
        competitorName: "Obsidian",
        title: "Test Import Title",
        description: "Test Import Description",
        h1: "Test Import H1",
        subheading: "Test Subheading",
        introText: "Test Intro",
        ctaText: "Test CTA",
        keywords: ["test"],
        features: [
          { title: "F1", description: "D1", icon: "icon-[lucide--zap]" },
        ],
        faq: [{ question: "Q1", answer: "A1" }],
      };

      render(Page, {
        props: {
          data: {
            importPage: mockPageData,
          },
        },
      });

      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      let softwareAppFound = false;
      let breadcrumbFound = false;

      scripts.forEach((script) => {
        try {
          const json = JSON.parse(script.innerHTML);
          if (json["@type"] === "SoftwareApplication") {
            softwareAppFound = true;
            expect(json.name).toBe("Codex Cryptica");
            expect(json.description).toBe("Test Import Description");
            expect(json.mainEntity["@type"]).toBe("FAQPage");
          } else if (json["@type"] === "BreadcrumbList") {
            breadcrumbFound = true;
            expect(json.itemListElement).toHaveLength(3);
            expect(json.itemListElement[1].name).toBe("Import");
            expect(json.itemListElement[2].name).toBe("Test Import H1");
          }
        } catch {
          // ignore
        }
      });

      expect(softwareAppFound).toBe(true);
      expect(breadcrumbFound).toBe(true);
    });
  });
});
