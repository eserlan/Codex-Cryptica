import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllExampleSlugs } from "../examples/registry";
import { SOLO_RPG_TOPIC_CONFIG } from "./solo-rpg";
import { buildTopicBreadcrumbJsonLd, buildTopicJsonLd } from "./json-ld";
import { getPublicContentByLabel } from "../labels/aggregate";
import { isContentClusterSlug } from "../labels";

const sectionLinks = () => [
  ...SOLO_RPG_TOPIC_CONFIG.coreGuides,
  ...SOLO_RPG_TOPIC_CONFIG.workedExamples,
  ...SOLO_RPG_TOPIC_CONFIG.generators,
  ...SOLO_RPG_TOPIC_CONFIG.relatedTopics,
];

describe("solo RPG topic hub config (#3139)", () => {
  it("owns the canonical path and registers solo-rpg as a content cluster", () => {
    expect(SOLO_RPG_TOPIC_CONFIG.canonicalPath).toBe("/topics/solo-rpg");
    expect(SOLO_RPG_TOPIC_CONFIG.label).toBe("solo-rpg");
    expect(isContentClusterSlug("solo-rpg")).toBe(true);
    expect(SOLO_RPG_TOPIC_CONFIG.metaTitle).toContain("Solo RPGs");
    expect(SOLO_RPG_TOPIC_CONFIG.leadParagraph.length).toBeGreaterThan(100);
    expect(SOLO_RPG_TOPIC_CONFIG.thesisPoints).toHaveLength(3);
  });

  it("walks the beginner path from start to campaign log", () => {
    const steps = SOLO_RPG_TOPIC_CONFIG.workflow;
    expect(steps.map((item) => item.step)).toEqual([1, 2, 3, 4, 5]);
    expect(steps[0].recommendedResource.href).toBe(
      "/answers/how-do-you-play-a-tabletop-rpg-by-yourself",
    );
    expect(steps[4].recommendedResource.href).toBe(
      "/answers/how-do-you-keep-notes-for-a-solo-rpg-campaign",
    );
    const sectionHrefs = sectionLinks().map((link) => link.href);
    for (const item of steps) {
      expect(sectionHrefs).toContain(item.recommendedResource.href);
    }
  });

  it("surfaces the child answers and the supporting generators", () => {
    const guideHrefs = SOLO_RPG_TOPIC_CONFIG.coreGuides.map(
      (guide) => guide.href,
    );
    for (const href of [
      "/answers/how-do-you-play-a-tabletop-rpg-by-yourself",
      "/answers/what-is-a-solo-rpg-oracle",
      "/answers/how-do-you-keep-a-solo-rpg-from-feeling-random",
      "/answers/how-do-you-keep-notes-for-a-solo-rpg-campaign",
      "/answers/what-rpg-system-is-good-for-solo-play",
    ]) {
      expect(guideHrefs).toContain(href);
    }
    const toolHrefs = SOLO_RPG_TOPIC_CONFIG.generators.map((tool) => tool.href);
    expect(toolHrefs[0]).toBe("/generators/rumour");
    expect(toolHrefs).toContain("/generators/personality");
  });

  it("keeps every hub link root-relative, with no repeats inside a section", () => {
    const sections = [
      SOLO_RPG_TOPIC_CONFIG.coreGuides,
      SOLO_RPG_TOPIC_CONFIG.workedExamples,
      SOLO_RPG_TOPIC_CONFIG.generators,
      SOLO_RPG_TOPIC_CONFIG.relatedTopics,
    ];
    for (const section of sections) {
      const hrefs = section.map((link) => link.href);
      for (const href of hrefs) {
        expect(href.startsWith("/")).toBe(true);
        expect(href.endsWith("/")).toBe(false);
      }
      expect(new Set(hrefs).size).toBe(hrefs.length);
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

  it("uses R2-hosted images", () => {
    expect(SOLO_RPG_TOPIC_CONFIG.ogImage).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/.+\.jpg$/,
    );
    expect(SOLO_RPG_TOPIC_CONFIG.ogImageAlt.length).toBeGreaterThan(10);
    for (const example of SOLO_RPG_TOPIC_CONFIG.workedExamples) {
      expect(example.image?.src).toMatch(
        /^https:\/\/assets\.codexcryptica\.com\//,
      );
    }
  });
});

describe("solo RPG cluster membership (#3139)", () => {
  it("leads the solo-rpg label with the hub and includes every child answer", () => {
    const results = getPublicContentByLabel("solo-rpg");
    expect(results[0]).toMatchObject({
      kind: "topic",
      href: "/topics/solo-rpg",
    });
    const hrefs = results.map((result) => result.href);
    for (const href of [
      "/answers/how-do-you-play-a-tabletop-rpg-by-yourself",
      "/answers/what-is-a-solo-rpg-oracle",
      "/answers/how-do-you-keep-a-solo-rpg-from-feeling-random",
      "/answers/how-do-you-keep-notes-for-a-solo-rpg-campaign",
      "/answers/what-rpg-system-is-good-for-solo-play",
    ]) {
      expect(hrefs).toContain(href);
    }
  });
});

describe("solo RPG topic hub JSON-LD (#3139)", () => {
  it("emits a CollectionPage linking every cluster resource", () => {
    const data = JSON.parse(buildTopicJsonLd(SOLO_RPG_TOPIC_CONFIG));
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://codexcryptica.com/topics/solo-rpg");
    expect(data.mainEntity.itemListElement.length).toBe(
      SOLO_RPG_TOPIC_CONFIG.coreGuides.length +
        SOLO_RPG_TOPIC_CONFIG.workedExamples.length +
        SOLO_RPG_TOPIC_CONFIG.generators.length,
    );
  });

  it("emits a BreadcrumbList ending at the hub and never a raw closing script tag", () => {
    const breadcrumb = buildTopicBreadcrumbJsonLd(SOLO_RPG_TOPIC_CONFIG);
    const trail = JSON.parse(breadcrumb).itemListElement;
    expect(trail[trail.length - 1].item).toBe(
      "https://codexcryptica.com/topics/solo-rpg",
    );
    for (const snippet of [
      buildTopicJsonLd(SOLO_RPG_TOPIC_CONFIG),
      breadcrumb,
    ]) {
      expect(snippet).not.toContain("</script>");
    }
  });
});
