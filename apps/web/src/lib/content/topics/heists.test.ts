import { describe, expect, it } from "vitest";
import { HEIST_TOPIC_CONFIG } from "./heists";
import {
  buildHeistTopicBreadcrumbJsonLd,
  buildHeistTopicJsonLd,
} from "./json-ld";

const sectionLinks = () => [
  ...HEIST_TOPIC_CONFIG.coreGuides,
  ...HEIST_TOPIC_CONFIG.workedExamples,
  ...HEIST_TOPIC_CONFIG.generators,
  ...HEIST_TOPIC_CONFIG.relatedTopics,
];

describe("heist topic hub config (#3118)", () => {
  it("owns the canonical /topics/heists path with standalone copy", () => {
    expect(HEIST_TOPIC_CONFIG.canonicalPath).toBe("/topics/heists");
    expect(HEIST_TOPIC_CONFIG.title).toBeTruthy();
    expect(HEIST_TOPIC_CONFIG.metaTitle).toContain("Heists");
    expect(HEIST_TOPIC_CONFIG.leadParagraph.length).toBeGreaterThan(100);
    expect(HEIST_TOPIC_CONFIG.thesisPoints.length).toBeGreaterThanOrEqual(2);
    for (const point of HEIST_TOPIC_CONFIG.thesisPoints) {
      expect(point.title).toBeTruthy();
      expect(point.summary.length).toBeGreaterThan(20);
    }
  });

  it("surfaces guides, genre-varied examples, and the generator", () => {
    expect(HEIST_TOPIC_CONFIG.coreGuides.length).toBeGreaterThanOrEqual(2);
    expect(
      HEIST_TOPIC_CONFIG.workedExamples.map((example) => example.genre),
    ).toContain("Cyberpunk");
    for (const example of HEIST_TOPIC_CONFIG.workedExamples) {
      expect(example.highlight).toBeTruthy();
    }
    expect(
      HEIST_TOPIC_CONFIG.generators.some(
        (tool) => tool.href === "/generators/heist",
      ),
    ).toBe(true);
  });

  it("keeps every hub link root-relative, with no repeats inside a section", () => {
    const sections = [
      HEIST_TOPIC_CONFIG.coreGuides,
      HEIST_TOPIC_CONFIG.workedExamples,
      HEIST_TOPIC_CONFIG.generators,
      HEIST_TOPIC_CONFIG.relatedTopics,
    ];
    for (const section of sections) {
      const hrefs = section.map((link) => link.href);
      for (const href of hrefs) {
        expect(href.startsWith("/")).toBe(true);
        expect(href.endsWith("/")).toBe(false);
      }
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
    // Related topics stay adjacent-cluster links, not a site directory.
    expect(HEIST_TOPIC_CONFIG.relatedTopics.length).toBeLessThanOrEqual(4);
    // Workflow steps reuse hub links rather than introducing new URLs.
    const sectionHrefs = sectionLinks().map((link) => link.href);
    for (const item of HEIST_TOPIC_CONFIG.workflow) {
      expect(sectionHrefs).toContain(item.recommendedResource.href);
    }
  });

  it("routes the workflow through the Answer → Example → Generator path", () => {
    const steps = HEIST_TOPIC_CONFIG.workflow;
    expect(steps.map((item) => item.step)).toEqual([1, 2, 3, 4]);
    const targets = steps.map((item) => item.recommendedResource.href);
    expect(targets.some((href) => href.startsWith("/answers/"))).toBe(true);
    expect(targets.some((href) => href.startsWith("/examples/"))).toBe(true);
    expect(targets).toContain("/generators/heist");
  });
});

describe("heist topic hub JSON-LD (#3118)", () => {
  it("emits a CollectionPage linking every cluster resource", () => {
    const data = JSON.parse(buildHeistTopicJsonLd());
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://codexcryptica.com/topics/heists");
    const items = data.mainEntity.itemListElement;
    expect(data.mainEntity["@type"]).toBe("ItemList");
    expect(items.length).toBe(
      HEIST_TOPIC_CONFIG.coreGuides.length +
        HEIST_TOPIC_CONFIG.workedExamples.length +
        HEIST_TOPIC_CONFIG.generators.length,
    );
    items.forEach((entry: { position: number }, index: number) => {
      expect(entry.position).toBe(index + 1);
    });
    for (const entry of items) {
      expect(entry.item.url.startsWith("https://")).toBe(true);
    }
  });

  it("emits a BreadcrumbList ending at the hub", () => {
    const data = JSON.parse(buildHeistTopicBreadcrumbJsonLd());
    expect(data["@type"]).toBe("BreadcrumbList");
    const trail = data.itemListElement;
    expect(trail).toHaveLength(3);
    expect(trail[trail.length - 1].item).toBe(
      "https://codexcryptica.com/topics/heists",
    );
  });

  it("never emits a raw closing script tag", () => {
    for (const snippet of [
      buildHeistTopicJsonLd(),
      buildHeistTopicBreadcrumbJsonLd(),
    ]) {
      expect(snippet).not.toContain("</script>");
      expect(() => JSON.parse(snippet)).not.toThrow();
    }
  });
});
