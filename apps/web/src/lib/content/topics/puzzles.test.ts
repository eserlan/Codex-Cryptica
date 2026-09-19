import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllExampleSlugs } from "../examples/registry";
import { PUZZLE_TOPIC_CONFIG } from "./puzzles";
import { buildTopicBreadcrumbJsonLd, buildTopicJsonLd } from "./json-ld";

const sectionLinks = () => [
  ...PUZZLE_TOPIC_CONFIG.coreGuides,
  ...PUZZLE_TOPIC_CONFIG.workedExamples,
  ...PUZZLE_TOPIC_CONFIG.generators,
  ...PUZZLE_TOPIC_CONFIG.relatedTopics,
];

describe("puzzle topic hub config (#3119)", () => {
  it("owns the canonical /topics/puzzles path with standalone copy", () => {
    expect(PUZZLE_TOPIC_CONFIG.canonicalPath).toBe("/topics/puzzles");
    expect(PUZZLE_TOPIC_CONFIG.label).toBe("puzzle");
    expect(PUZZLE_TOPIC_CONFIG.metaTitle).toContain("Puzzles");
    expect(PUZZLE_TOPIC_CONFIG.leadParagraph.length).toBeGreaterThan(100);
    expect(PUZZLE_TOPIC_CONFIG.thesisPoints.length).toBeGreaterThanOrEqual(2);
    for (const point of PUZZLE_TOPIC_CONFIG.thesisPoints) {
      expect(point.title).toBeTruthy();
      expect(point.summary.length).toBeGreaterThan(20);
    }
  });

  it("surfaces guides, genre-varied examples, and the puzzle generator first", () => {
    expect(PUZZLE_TOPIC_CONFIG.coreGuides.length).toBeGreaterThanOrEqual(2);
    expect(
      PUZZLE_TOPIC_CONFIG.workedExamples.map((example) => example.genre),
    ).toEqual(["Classic Fantasy", "Cyberpunk", "Space Opera"]);
    for (const example of PUZZLE_TOPIC_CONFIG.workedExamples) {
      expect(example.highlight).toBeTruthy();
    }
    expect(PUZZLE_TOPIC_CONFIG.generators[0].href).toBe("/generators/puzzle");
  });

  it("uses R2-hosted images with valid metadata", () => {
    expect(PUZZLE_TOPIC_CONFIG.ogImage).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/.+\.jpg$/,
    );
    expect(PUZZLE_TOPIC_CONFIG.ogImageAlt.length).toBeGreaterThan(10);
    const images = [
      ...PUZZLE_TOPIC_CONFIG.workedExamples.map((example) => example.image),
      ...PUZZLE_TOPIC_CONFIG.generators.map(
        (tool) => (tool as { image?: { src: string } }).image,
      ),
    ].filter((image) => image !== undefined);
    expect(images.length).toBeGreaterThanOrEqual(3);
    for (const image of images) {
      expect(image.src).toMatch(/^https:\/\/assets\.codexcryptica\.com\//);
    }
  });

  it("keeps every hub link root-relative, with no repeats inside a section", () => {
    const sections = [
      PUZZLE_TOPIC_CONFIG.coreGuides,
      PUZZLE_TOPIC_CONFIG.workedExamples,
      PUZZLE_TOPIC_CONFIG.generators,
      PUZZLE_TOPIC_CONFIG.relatedTopics,
    ];
    for (const section of sections) {
      const hrefs = section.map((link) => link.href);
      for (const href of hrefs) {
        expect(href.startsWith("/")).toBe(true);
        expect(href.endsWith("/")).toBe(false);
      }
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
    expect(PUZZLE_TOPIC_CONFIG.relatedTopics.length).toBeLessThanOrEqual(4);
    const sectionHrefs = sectionLinks().map((link) => link.href);
    for (const item of PUZZLE_TOPIC_CONFIG.workflow) {
      expect(sectionHrefs).toContain(item.recommendedResource.href);
    }
  });

  it("only links to answers and examples that are actually published", () => {
    const answers = new Set(getAllAnswerSlugs());
    const examples = new Set(getAllExampleSlugs());
    for (const link of sectionLinks()) {
      const [, section, slug] = link.href.split("/");
      if (section === "answers") expect(answers.has(slug)).toBe(true);
      if (section === "examples") expect(examples.has(slug)).toBe(true);
    }
  });

  it("routes the workflow through the Answer → Example → Generator path", () => {
    const steps = PUZZLE_TOPIC_CONFIG.workflow;
    expect(steps.map((item) => item.step)).toEqual([1, 2, 3, 4]);
    const targets = steps.map((item) => item.recommendedResource.href);
    expect(targets.some((href) => href.startsWith("/answers/"))).toBe(true);
    expect(targets.some((href) => href.startsWith("/examples/"))).toBe(true);
    expect(targets).toContain("/generators/puzzle");
  });
});

describe("puzzle topic hub JSON-LD (#3119)", () => {
  it("emits a CollectionPage linking every cluster resource", () => {
    const data = JSON.parse(buildTopicJsonLd(PUZZLE_TOPIC_CONFIG));
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://codexcryptica.com/topics/puzzles");
    const items = data.mainEntity.itemListElement;
    expect(items.length).toBe(
      PUZZLE_TOPIC_CONFIG.coreGuides.length +
        PUZZLE_TOPIC_CONFIG.workedExamples.length +
        PUZZLE_TOPIC_CONFIG.generators.length,
    );
    for (const entry of items) {
      expect(entry.item.url.startsWith("https://")).toBe(true);
    }
  });

  it("emits a BreadcrumbList ending at the hub", () => {
    const data = JSON.parse(buildTopicBreadcrumbJsonLd(PUZZLE_TOPIC_CONFIG));
    const trail = data.itemListElement;
    expect(trail).toHaveLength(3);
    expect(trail[trail.length - 1].item).toBe(
      "https://codexcryptica.com/topics/puzzles",
    );
  });

  it("never emits a raw closing script tag", () => {
    for (const snippet of [
      buildTopicJsonLd(PUZZLE_TOPIC_CONFIG),
      buildTopicBreadcrumbJsonLd(PUZZLE_TOPIC_CONFIG),
    ]) {
      expect(snippet).not.toContain("</script>");
      expect(() => JSON.parse(snippet)).not.toThrow();
    }
  });
});
