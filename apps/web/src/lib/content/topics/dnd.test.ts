import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllLandingPageSlugs, getLandingPage } from "../for/registry";
import { match as isGeneratorSlug } from "../../../params/generator_slug";
import { isHubThemeSlug } from "../hub-themes";
import { DND_TOPIC_CONFIG } from "./dnd";
import {
  buildJobHubBreadcrumbJsonLd,
  buildJobHubJsonLd,
  listJobHubLinks,
} from "./job-hub-json-ld";

const answerSlugs = new Set(getAllAnswerSlugs());
const forSlugs = new Set(getAllLandingPageSlugs());

const resolves = (href: string): boolean => {
  const [path] = href.split("?");
  if (path.startsWith("/answers/")) return answerSlugs.has(path.slice(9));
  if (path.startsWith("/for/")) return forSlugs.has(path.slice(5));
  if (path.startsWith("/generators/")) {
    const slug = path.slice(12);
    return isGeneratorSlug(slug) || isHubThemeSlug(slug as never);
  }
  return [
    "/tools/session-prep-builder",
    "/topics/puzzles",
    "/topics/heists",
    "/solutions/rpg-knowledge-graph",
    "/explore",
  ].includes(path);
};

describe("D&D topic hub config (#3856)", () => {
  it("owns /topics/dnd and is organised around the six DM jobs", () => {
    expect(DND_TOPIC_CONFIG.canonicalPath).toBe("/topics/dnd");
    expect(DND_TOPIC_CONFIG.jobs.map((job) => job.id)).toEqual([
      "start",
      "prep",
      "adventure",
      "run",
      "world",
      "track",
    ]);
    for (const job of DND_TOPIC_CONFIG.jobs) {
      expect(job.links.length).toBeGreaterThan(0);
    }
  });

  it("only links to pages the site actually publishes", () => {
    const broken = listJobHubLinks(DND_TOPIC_CONFIG)
      .filter((link) => !resolves(link.href))
      .map((link) => link.href);
    expect(broken).toEqual([]);
  });

  it("makes the system-neutral Session Prep Builder the primary conversion", () => {
    expect(DND_TOPIC_CONFIG.primaryCta.action.href).toBe(
      "/tools/session-prep-builder",
    );
    expect(DND_TOPIC_CONFIG.primaryCta.action.label).toBe(
      "Prep my next D&D session",
    );
  });

  it("surfaces the existing D&D answers rather than copying them", () => {
    const hrefs = new Set(listJobHubLinks(DND_TOPIC_CONFIG).map((l) => l.href));
    expect(hrefs).toContain(
      "/answers/what-should-a-new-dnd-player-learn-first",
    );
    expect(hrefs).toContain(
      "/answers/how-do-you-run-dnd-for-a-large-group-of-players",
    );
  });

  it("does not list the same page twice", () => {
    const all = [
      ...DND_TOPIC_CONFIG.primaryCta.supportingLinks,
      ...DND_TOPIC_CONFIG.jobs.flatMap((job) => job.links),
    ].map((link) => link.href);
    const dupes = all.filter((href, i) => all.indexOf(href) !== i);
    expect(dupes).toEqual([]);
  });

  it("cross-links with /for/dungeons-and-dragons in both directions", () => {
    expect(DND_TOPIC_CONFIG.relatedTopics.map((t) => t.href)).toContain(
      "/for/dungeons-and-dragons",
    );
    const pack = getLandingPage("dungeons-and-dragons");
    expect(pack?.recommendedTools.map((t) => t.href)).toContain("/topics/dnd");
  });

  it("emits collection and breadcrumb structured data", () => {
    const collection = JSON.parse(buildJobHubJsonLd(DND_TOPIC_CONFIG));
    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.mainEntity.itemListElement.length).toBe(
      listJobHubLinks(DND_TOPIC_CONFIG).length,
    );
    const crumbs = JSON.parse(buildJobHubBreadcrumbJsonLd(DND_TOPIC_CONFIG));
    expect(crumbs.itemListElement.at(-1).item).toContain("/topics/dnd");
  });
});
