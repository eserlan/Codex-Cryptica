import { describe, expect, it } from "vitest";
import { matchGenerator_slug } from "../../../params";
import { getAllAnswerSlugs } from "../answers/registry";
import { STAR_SYSTEMS_TOPIC_CONFIG as CONFIG } from "./star-systems";
import { buildTopicBreadcrumbJsonLd, buildTopicJsonLd } from "./json-ld";

const sectionLinks = () => [
  ...CONFIG.coreGuides,
  ...CONFIG.generators,
  ...CONFIG.relatedTopics,
];

const primaryActionHrefs = () => [
  CONFIG.primaryAction.href,
  CONFIG.primaryAction.secondary.href,
];

/** Returns the hrefs that point at an unpublished answer or generator. */
function findBrokenLinks(
  hrefs: string[],
  answerSlugs: Set<string>,
  isGenerator: (slug: string) => boolean,
): string[] {
  return hrefs.filter((href) => {
    const [, section, slug] = href.split("/");
    if (section === "answers") return !answerSlugs.has(slug);
    if (section === "generators") return !isGenerator(slug);
    return false;
  });
}

describe("star systems topic hub config", () => {
  it("owns the canonical path, label and standalone copy", () => {
    expect(CONFIG.canonicalPath).toBe("/topics/star-systems");
    expect(CONFIG.slug).toBe("star-systems");
    expect(CONFIG.label).toBe("sci-fi");
    expect(CONFIG.title).toBe("Star Systems & Sci-Fi Campaign Building");
    expect(CONFIG.metaTitle.endsWith("| Codex Cryptica")).toBe(true);
    expect(CONFIG.leadParagraph.length).toBeGreaterThan(100);
    expect(CONFIG.ogImage).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/.+\.jpg$/,
    );
    expect(CONFIG.ogImageAlt.length).toBeGreaterThan(10);
    expect(CONFIG.thesisPoints.length).toBeGreaterThanOrEqual(4);
  });

  it("leads with the core answer and lists the five supporting generators", () => {
    expect(CONFIG.coreGuides).toHaveLength(6);
    expect(CONFIG.coreGuides[0].href).toBe(
      "/answers/how-to-create-a-sci-fi-star-system-for-an-rpg",
    );
    expect(CONFIG.coreGuides[0].focus).toMatch(/core/i);
    expect(CONFIG.generators.map((tool) => tool.href)).toEqual([
      "/generators/star-system",
      "/generators/world",
      "/generators/alien-race",
      "/generators/ship-generator",
      "/generators/faction",
    ]);
    expect(CONFIG.generators[0].badge).toBe("Primary Tool");
    for (const tool of CONFIG.generators.slice(1)) {
      expect(tool.badge).toBe("Supporting Tool");
    }
  });

  it("links only to published answers and generators", () => {
    const answers = new Set(getAllAnswerSlugs());
    expect(
      findBrokenLinks(
        [...sectionLinks().map((link) => link.href), ...primaryActionHrefs()],
        answers,
        matchGenerator_slug,
      ),
    ).toEqual([]);
  });

  it("points the primary action at the star system generator", () => {
    expect(CONFIG.primaryAction.href).toBe("/generators/star-system");
  });

  it("rejects an unknown answer or generator slug", () => {
    const answers = new Set(getAllAnswerSlugs());
    expect(
      findBrokenLinks(
        ["/answers/not-a-real-answer", "/generators/not-a-generator"],
        answers,
        matchGenerator_slug,
      ),
    ).toEqual(["/answers/not-a-real-answer", "/generators/not-a-generator"]);
  });

  it("keeps links root-relative with no repeats, and workflow hrefs from hub sections", () => {
    for (const section of [
      CONFIG.coreGuides,
      CONFIG.generators,
      CONFIG.relatedTopics,
    ]) {
      const hrefs = section.map((link) => link.href);
      for (const href of hrefs) {
        expect(href.startsWith("/")).toBe(true);
        expect(href.endsWith("/")).toBe(false);
      }
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
    expect(CONFIG.relatedTopics.length).toBeLessThanOrEqual(3);
    const allowed = [...CONFIG.coreGuides, ...CONFIG.generators].map(
      (link) => link.href,
    );
    expect(CONFIG.workflow.map((item) => item.step)).toEqual([1, 2, 3, 4, 5]);
    for (const item of CONFIG.workflow) {
      expect(allowed).toContain(item.recommendedResource.href);
    }
    expect(CONFIG.workflow[4].recommendedResource.href).toBe(
      "/generators/star-system",
    );
  });

  it("has an inline example with destinations, factions and a flashpoint", () => {
    const example = CONFIG.inlineExample;
    expect(CONFIG.workedExamples).toEqual([]);
    const terms = example.parts.map((part) => part.term.toLowerCase());
    const destinations = example.parts.find((p) =>
      p.term.toLowerCase().includes("destination"),
    );
    expect(destinations).toBeDefined();
    const places = (destinations?.text ?? "")
      .split(/(?<=\.)\s+/)
      .map((sentence) => sentence.split(" is ")[0]);
    expect(places.length).toBeGreaterThanOrEqual(3);
    expect(places.length).toBeLessThanOrEqual(5);
    const routes = example.parts.find((p) => p.term.includes("Routes"));
    for (const place of places) {
      expect(destinations?.text).toContain(place);
      expect(routes?.text).toContain(place);
    }
    expect(terms.some((t) => t.includes("route"))).toBe(true);
    expect(terms.some((t) => t.includes("resource"))).toBe(true);
    expect(terms.some((t) => t.includes("flashpoint"))).toBe(true);
    const flashpoint = example.parts.find((p) =>
      p.term.toLowerCase().includes("flashpoint"),
    );
    expect(places.some((place) => flashpoint?.text.includes(place))).toBe(true);
    const factions = example.parts.find((p) => p.term === "Factions");
    expect(factions?.text).toContain("Tugmasters");
    expect(factions?.text).toContain("Free Miners");
    expect(example.highlight.length).toBeGreaterThan(10);
    expect(JSON.stringify(example)).not.toMatch(/Kestrel|Nacre|Dross/);
  });
});

describe("star systems topic hub JSON-LD", () => {
  it("counts guides plus generators in the ItemList", () => {
    const data = JSON.parse(buildTopicJsonLd(CONFIG));
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe("https://codexcryptica.com/topics/star-systems");
    expect(data.mainEntity.itemListElement).toHaveLength(
      CONFIG.coreGuides.length + CONFIG.generators.length,
    );
  });

  it("ends the BreadcrumbList at the hub and never emits a closing script tag", () => {
    const crumbs = buildTopicBreadcrumbJsonLd(CONFIG);
    const data = JSON.parse(crumbs);
    const trail = data.itemListElement;
    expect(trail[trail.length - 1].item).toBe(
      "https://codexcryptica.com/topics/star-systems",
    );
    for (const snippet of [buildTopicJsonLd(CONFIG), crumbs]) {
      expect(snippet).not.toContain("</script>");
    }
  });
});
