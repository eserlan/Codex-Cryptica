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
        sectionLinks().map((link) => link.href),
        answers,
        matchGenerator_slug,
      ),
    ).toEqual([]);
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

const DIAGRAM = CONFIG.inlineExample.diagram;
const PROSE = CONFIG.inlineExample.parts.map((p) => p.text).join(" ");
const nodeName = (id: string) => DIAGRAM.nodes.find((n) => n.id === id)?.name;

/** Returns links whose endpoints are not node ids. */
function findUnknownEndpoints(
  nodes: { id: string }[],
  links: { from: string; to: string }[],
): string[] {
  const ids = new Set(nodes.map((n) => n.id));
  return links.flatMap((l) => [l.from, l.to]).filter((id) => !ids.has(id));
}

describe("star systems hero and diagram", () => {
  it("reuses the OG asset as a 1600x900 hero without naming the Drift", () => {
    expect(CONFIG.heroImage.src).toBe(CONFIG.ogImage);
    expect(CONFIG.heroImage.width).toBe(1600);
    expect(CONFIG.heroImage.height).toBe(900);
    expect(CONFIG.heroImage.alt.length).toBeGreaterThan(10);
    expect(CONFIG.heroImage.alt).not.toContain("Halden");
  });

  it("lists three named nodes, three routes and two flows", () => {
    expect(DIAGRAM.nodes.map((n) => n.name)).toEqual([
      "Tern Anchorage",
      "Coldwell",
      "Veyra Deep",
    ]);
    const pairs = (kind: string) =>
      DIAGRAM.links
        .filter((l) => l.kind === kind)
        .map((l) => `${nodeName(l.from)}>${nodeName(l.to)}`);
    expect(pairs("route")).toEqual([
      "Tern Anchorage>Coldwell",
      "Coldwell>Veyra Deep",
      "Veyra Deep>Tern Anchorage",
    ]);
    expect(pairs("flow")).toEqual([
      "Coldwell>Veyra Deep",
      "Veyra Deep>Coldwell",
    ]);
    expect(findUnknownEndpoints(DIAGRAM.nodes, DIAGRAM.links)).toEqual([]);
  });

  it("flags only the Tern Anchorage to Coldwell route", () => {
    const flagged = DIAGRAM.links.filter((l) => l.flashpoint);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].kind).toBe("route");
    expect([nodeName(flagged[0].from), nodeName(flagged[0].to)]).toEqual([
      "Tern Anchorage",
      "Coldwell",
    ]);
  });

  it("agrees with the prose", () => {
    const routes = CONFIG.inlineExample.parts.find(
      (p) => p.term === "Routes and travel",
    )!.text;
    for (const node of DIAGRAM.nodes) expect(routes).toContain(node.name);
    for (const fact of [
      "two-day",
      "four-day",
      "short hop",
      "customs gate",
      "rock storms",
      "heavy tugs",
    ]) {
      expect(PROSE).toContain(fact);
    }
  });

  it("has no coordinates or orbital terms", () => {
    expect(JSON.stringify(DIAGRAM)).not.toMatch(/orbit|\bAU\b|\bkm\b/i);
  });

  it("reports a link to an unknown node id", () => {
    expect(
      findUnknownEndpoints(DIAGRAM.nodes, [{ from: "tern", to: "nowhere" }]),
    ).toEqual(["nowhere"]);
  });
});
