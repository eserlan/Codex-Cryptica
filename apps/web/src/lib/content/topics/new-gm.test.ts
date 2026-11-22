import { describe, expect, it } from "vitest";
import { getAllAnswerSlugs } from "../answers/registry";
import { match as isGeneratorSlug } from "../../../params/generator_slug";
import { NEW_GM_TOPIC_CONFIG } from "./new-gm";
import { DND_TOPIC_CONFIG } from "./dnd";
import { listJobHubLinks, buildJobHubJsonLd, buildJobHubBreadcrumbJsonLd } from "./job-hub-json-ld";
import { topicEntries } from "../discovery/entries/topics";

const answerSlugs = new Set(getAllAnswerSlugs());

describe("new GM topic hub", () => {
  it("is a system-neutral first-session pathway, separate from the D&D DM hub", () => {
    expect(NEW_GM_TOPIC_CONFIG.canonicalPath).toBe("/topics/new-gm");
    expect(NEW_GM_TOPIC_CONFIG.jobs.map((job) => job.id)).toEqual([
      "choose", "agree", "prepare", "run", "after",
    ]);
    expect(DND_TOPIC_CONFIG.relatedTopics.map((topic) => topic.href)).toContain("/topics/new-gm");
    const entry = topicEntries.find((topic) => topic.id === "topic-new-gm");
    expect(entry).toMatchObject({ indexable: true, status: "live", userJob: "navigate" });
    expect(entry?.acknowledgedOverlap).toEqual(expect.arrayContaining([
      expect.objectContaining({ with: "topic-dnd", reason: expect.any(String) }),
    ]));
  });

  it("links only to published resources", () => {
    const allowed = new Set([
      "/tools/session-prep-builder",
      "/topics/dnd",
      "/topics/dnd-beginners",
      "/topics",
    ]);
    const bad = listJobHubLinks(NEW_GM_TOPIC_CONFIG).filter(({ href }) => {
      if (href.startsWith("/answers/")) return !answerSlugs.has(href.slice(9));
      if (href.startsWith("/generators/")) return !isGeneratorSlug(href.slice(12));
      return !allowed.has(href);
    });
    expect(bad).toEqual([]);
  });

  it("does not repeat a guide within the body or its supporting links", () => {
    const hrefs = [
      ...NEW_GM_TOPIC_CONFIG.primaryCta.supportingLinks,
      ...NEW_GM_TOPIC_CONFIG.jobs.flatMap((job) => job.links),
    ].map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("provides structured data and a clear beginner starting point", () => {
    expect(NEW_GM_TOPIC_CONFIG.primaryCta.action.href).toBe(
      "/answers/how-do-i-start-gming-for-the-first-time",
    );
    const collection = JSON.parse(buildJobHubJsonLd(NEW_GM_TOPIC_CONFIG));
    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.mainEntity.itemListElement.length).toBe(
      listJobHubLinks(NEW_GM_TOPIC_CONFIG).length,
    );
    const breadcrumbs = JSON.parse(buildJobHubBreadcrumbJsonLd(NEW_GM_TOPIC_CONFIG));
    expect(breadcrumbs.itemListElement.at(-1).item).toContain("/topics/new-gm");
  });
});
