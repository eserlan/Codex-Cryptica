import { describe, it, expect } from "vitest";
import {
  ANSWER_CATEGORIES,
  getAnswerCategory,
  groupAnswersByCategory,
} from "./categories";
import { getAllAnswers, getAllAnswerSlugs } from "./registry";

describe("answer categories", () => {
  it("assigns every published answer to exactly one category", () => {
    const publishedSlugs = getAllAnswerSlugs();
    const assignedSlugs = ANSWER_CATEGORIES.flatMap((c) => c.slugs);

    // No unassigned answers
    for (const slug of publishedSlugs) {
      expect(assignedSlugs, `Missing category for answer "${slug}"`).toContain(
        slug,
      );
    }

    // No orphan slugs in categories
    for (const slug of assignedSlugs) {
      expect(
        publishedSlugs,
        `Category references unknown answer "${slug}"`,
      ).toContain(slug);
    }

    // No duplicates across categories
    expect(new Set(assignedSlugs).size).toBe(assignedSlugs.length);
  });

  it("gives each category a unique id, title, description, and icon", () => {
    const ids = ANSWER_CATEGORIES.map((c) => c.id);
    const titles = ANSWER_CATEGORIES.map((c) => c.title);
    const icons = ANSWER_CATEGORIES.map((c) => c.icon);

    expect(new Set(ids).size).toBe(ANSWER_CATEGORIES.length);
    expect(new Set(titles).size).toBe(ANSWER_CATEGORIES.length);
    expect(new Set(icons).size).toBe(ANSWER_CATEGORIES.length);

    for (const category of ANSWER_CATEGORIES) {
      expect(category.slugs.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(10);
      expect(category.icon).toMatch(/^icon-\[.+\]$/);
    }
  });

  describe("getAnswerCategory", () => {
    it("finds the category for a known slug", () => {
      const cat = getAnswerCategory(
        "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
      );
      expect(cat?.id).toBe("getting-started");
    });

    it("returns undefined for an unknown slug", () => {
      expect(getAnswerCategory("unknown-slug-not-in-answers")).toBeUndefined();
    });
  });

  describe("groupAnswersByCategory", () => {
    it("groups all published answers into the defined categories", () => {
      const allAnswers = getAllAnswers();
      const grouped = groupAnswersByCategory(allAnswers);

      expect(grouped.length).toBe(ANSWER_CATEGORIES.length);
      const totalAnswers = grouped.reduce(
        (sum, g) => sum + g.answers.length,
        0,
      );
      expect(totalAnswers).toBe(allAnswers.length);
    });

    it("omits categories that have no matching answers", () => {
      const subset = getAllAnswers().filter(
        (a) => a.slug === "what-is-a-point-crawl",
      );
      const grouped = groupAnswersByCategory(subset);

      expect(grouped.length).toBe(1);
      expect(grouped[0].category.id).toBe("worldbuilding");
      expect(grouped[0].answers.length).toBe(1);
    });
  });
});
