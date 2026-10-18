import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllExampleSlugs } from "../examples/registry";
import { PIRATE_TOPIC_CONFIG } from "./pirates";
import { buildTopicBreadcrumbJsonLd, buildTopicJsonLd } from "./json-ld";

const sectionLinks = () => [
  ...PIRATE_TOPIC_CONFIG.coreGuides,
  ...PIRATE_TOPIC_CONFIG.workedExamples,
  ...PIRATE_TOPIC_CONFIG.generators,
  ...PIRATE_TOPIC_CONFIG.relatedTopics,
];

describe("pirate topic hub config (#3655)", () => {
  it("owns the canonical path and explains its distinct navigation job", () => {
    expect(PIRATE_TOPIC_CONFIG.canonicalPath).toBe("/topics/pirates");
    expect(PIRATE_TOPIC_CONFIG.label).toBe("pirate");
    expect(PIRATE_TOPIC_CONFIG.metaTitle).toContain("Pirate");
    expect(PIRATE_TOPIC_CONFIG.leadParagraph.length).toBeGreaterThan(100);
    expect(PIRATE_TOPIC_CONFIG.thesisPoints).toHaveLength(3);
  });

  it("connects every requested pirate campaign answer", () => {
    const guideHrefs = new Set(
      PIRATE_TOPIC_CONFIG.coreGuides.map((guide) => guide.href),
    );
    expect(guideHrefs).toEqual(
      new Set([
        "/answers/what-ttrpg-should-i-play-for-a-pirate-campaign",
        "/answers/how-do-i-run-a-pirate-campaign-focused-on-exploration",
        "/answers/how-do-i-make-sea-travel-interesting-in-a-ttrpg",
        "/answers/how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
        "/answers/how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
        "/answers/how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
        "/answers/what-kind-of-ship-should-a-pirate-crew-start-with",
      ]),
    );
  });

  it("includes the campaign page, generator hub and supporting generators", () => {
    const guideAndToolHrefs = new Set(
      [
        ...PIRATE_TOPIC_CONFIG.generators,
        ...PIRATE_TOPIC_CONFIG.relatedTopics,
      ].map((link) => link.href),
    );
    for (const href of [
      "/for/pirates-high-seas",
      "/generators/pirate",
      "/generators/ship-generator",
      "/generators/settlement",
      "/generators/faction",
    ]) {
      expect(guideAndToolHrefs).toContain(href);
    }
    expect(PIRATE_TOPIC_CONFIG.workedExamples).toHaveLength(1);
    expect(PIRATE_TOPIC_CONFIG.workedExamples[0].href).toBe(
      "/examples/letters-of-marque-expired-pirate-adventure",
    );
  });

  it("links only to published answers and examples", () => {
    const answerSlugs = new Set(getAllAnswerSlugs());
    const exampleSlugs = new Set(getAllExampleSlugs());
    for (const link of sectionLinks()) {
      const [, section, slug] = link.href.split("/");
      if (section === "answers") expect(answerSlugs.has(slug)).toBe(true);
      if (section === "examples") expect(exampleSlugs.has(slug)).toBe(true);
    }
  });

  it("keeps links unique within each section and workflow links in the hub", () => {
    const sections = [
      PIRATE_TOPIC_CONFIG.coreGuides,
      PIRATE_TOPIC_CONFIG.workedExamples,
      PIRATE_TOPIC_CONFIG.generators,
      PIRATE_TOPIC_CONFIG.relatedTopics,
    ];
    for (const section of sections) {
      const hrefs = section.map((link) => link.href);
      expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }

    const sectionHrefs = sectionLinks().map((link) => link.href);
    expect(PIRATE_TOPIC_CONFIG.workflow.map((item) => item.step)).toEqual([
      1, 2, 3, 4,
    ]);
    for (const item of PIRATE_TOPIC_CONFIG.workflow) {
      expect(sectionHrefs).toContain(item.recommendedResource.href);
    }
  });
});

describe("pirate topic hub JSON-LD (#3655)", () => {
  it("emits a CollectionPage with every guide, example and generator", () => {
    const data = JSON.parse(buildTopicJsonLd(PIRATE_TOPIC_CONFIG));
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://codexcryptica.com/topics/pirates");
    const items = data.mainEntity.itemListElement;
    expect(items).toHaveLength(
      PIRATE_TOPIC_CONFIG.coreGuides.length +
        PIRATE_TOPIC_CONFIG.workedExamples.length +
        PIRATE_TOPIC_CONFIG.generators.length,
    );
    expect(
      items.every((entry: { item: { url: string } }) =>
        entry.item.url.startsWith("https://"),
      ),
    ).toBe(true);
  });

  it("emits a breadcrumb ending at the canonical hub and safe JSON", () => {
    const snippets = [
      buildTopicJsonLd(PIRATE_TOPIC_CONFIG),
      buildTopicBreadcrumbJsonLd(PIRATE_TOPIC_CONFIG),
    ];
    for (const snippet of snippets) {
      expect(snippet).not.toContain("</script>");
      expect(() => JSON.parse(snippet)).not.toThrow();
    }

    const breadcrumbs = JSON.parse(snippets[1]);
    const trail = breadcrumbs.itemListElement;
    expect(trail[trail.length - 1].item).toBe(
      "https://codexcryptica.com/topics/pirates",
    );
  });
});
