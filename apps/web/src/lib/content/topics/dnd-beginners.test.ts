import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllLandingPageSlugs } from "../for/registry";
import { DND_BEGINNERS_TOPIC_CONFIG } from "./dnd-beginners";
import {
  buildBeginnerHubBreadcrumbJsonLd,
  buildBeginnerHubJsonLd,
  listBeginnerHubLinks,
} from "./beginner-hub-json-ld";

const answerSlugs = new Set(getAllAnswerSlugs());
const forSlugs = new Set(getAllLandingPageSlugs());

const resolves = (href: string): boolean => {
  const [path] = href.split("?");
  if (path.startsWith("/answers/")) return answerSlugs.has(path.slice(9));
  if (path.startsWith("/for/")) return forSlugs.has(path.slice(5));
  return ["/dice", "/topics/dnd", "/explore"].includes(path);
};

describe("D&D beginner topic hub config (#3896)", () => {
  it("owns /topics/dnd-beginners and is player-facing", () => {
    expect(DND_BEGINNERS_TOPIC_CONFIG.canonicalPath).toBe(
      "/topics/dnd-beginners",
    );
    expect(
      DND_BEGINNERS_TOPIC_CONFIG.learningSteps.map((step) => step.id),
    ).toEqual([
      "before-first-session",
      "understand-character",
      "understand-dice",
      "first-combat",
    ]);
    for (const step of DND_BEGINNERS_TOPIC_CONFIG.learningSteps) {
      expect(step.links.length).toBeGreaterThan(0);
      expect(step.takeaways.length).toBeGreaterThan(0);
    }
  });

  it("makes #3889 the primary Start Here entry", () => {
    expect(DND_BEGINNERS_TOPIC_CONFIG.startHere.primaryLink.href).toBe(
      "/answers/what-should-a-new-dnd-player-know-before-their-first-game",
    );
    expect(DND_BEGINNERS_TOPIC_CONFIG.startHere.playLoopSteps).toHaveLength(4);
  });

  it("integrates all child Answers from the cluster into the learning path", () => {
    const allHrefs = new Set(
      listBeginnerHubLinks(DND_BEGINNERS_TOPIC_CONFIG).map((l) => l.href),
    );
    expect(allHrefs).toContain(
      "/answers/what-should-a-new-dnd-player-know-before-their-first-game",
    );
    expect(allHrefs).toContain(
      "/answers/how-do-i-read-a-dnd-character-sheet-as-a-beginner",
    );
    expect(allHrefs).toContain("/answers/which-dice-do-i-roll-in-dnd-and-when");
    expect(allHrefs).toContain(
      "/answers/what-can-i-do-on-my-turn-in-dnd-combat",
    );
    expect(allHrefs).toContain(
      "/answers/what-do-i-need-to-bring-to-my-first-dnd-game",
    );
  });

  it("only links to pages the site actually publishes", () => {
    const broken = listBeginnerHubLinks(DND_BEGINNERS_TOPIC_CONFIG)
      .filter((link) => !resolves(link.href))
      .map((link) => link.href);
    expect(broken).toEqual([]);

    const relatedBroken = DND_BEGINNERS_TOPIC_CONFIG.relatedTopics
      .filter((t) => !resolves(t.href))
      .map((t) => t.href);
    expect(relatedBroken).toEqual([]);
  });

  it("clearly distinguishes Learn Now from Learn Later", () => {
    const { learnNow, learnLater } = DND_BEGINNERS_TOPIC_CONFIG.scopeComparison;
    expect(learnNow.items.length).toBeGreaterThanOrEqual(4);
    expect(learnLater.items.length).toBeGreaterThanOrEqual(4);
    expect(learnNow.title).toBe("Learn now");
    expect(learnLater.title).toBe("Learn later");
  });

  it("cross-links with the GM-facing D&D hub (/topics/dnd)", () => {
    const relatedHrefs = DND_BEGINNERS_TOPIC_CONFIG.relatedTopics.map(
      (t) => t.href,
    );
    expect(relatedHrefs).toContain("/topics/dnd");

    const toolHrefs = DND_BEGINNERS_TOPIC_CONFIG.toolsAndNextSteps.links.map(
      (l) => l.href,
    );
    expect(toolHrefs).toContain("/topics/dnd");
  });

  it("emits valid collection and breadcrumb structured data", () => {
    const collection = JSON.parse(
      buildBeginnerHubJsonLd(DND_BEGINNERS_TOPIC_CONFIG),
    );
    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.mainEntity.itemListElement.length).toBe(
      listBeginnerHubLinks(DND_BEGINNERS_TOPIC_CONFIG).length,
    );

    const crumbs = JSON.parse(
      buildBeginnerHubBreadcrumbJsonLd(DND_BEGINNERS_TOPIC_CONFIG),
    );
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement.at(-1).item).toContain(
      "/topics/dnd-beginners",
    );
  });
});
