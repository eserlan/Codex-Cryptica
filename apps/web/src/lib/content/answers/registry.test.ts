import { describe, it, expect } from "vitest";
import {
  getAnswer,
  getAllAnswers,
  getAllAnswerSlugs,
  getRelatedAnswers,
  answerPath,
} from "./registry";
import { AnswerConfigSchema, type AnswerConfig } from "./schema";
import { answers } from "./pages";
import { getAllLandingPageSlugs } from "../for/registry";
import { solutions } from "$lib/config/seo-pages";
import { featuresConfig } from "$lib/config/seo-features";
import { match as isGeneratorSlug } from "../../../params/generator_slug";
import {
  buildAnswerFaqJsonLd,
  buildAnswerBreadcrumbJsonLd,
  buildAnswerIndexJsonLd,
} from "./json-ld";

const makeAnswer = (
  overrides: Partial<AnswerConfig> & Pick<AnswerConfig, "slug">,
): AnswerConfig =>
  AnswerConfigSchema.parse({
    question: "Test question?",
    kind: "definition",
    shortAnswer: "A direct answer that stands on its own.",
    sections: [
      { kind: "prose", heading: "Why", paragraphs: ["Because of reasons."] },
    ],
    relatedAnswers: [],
    seo: { title: "Test", description: "Test description" },
    ...overrides,
  });

const mockRegistry: Record<string, AnswerConfig> = {
  alpha: makeAnswer({ slug: "alpha", relatedAnswers: ["beta", "missing"] }),
  beta: makeAnswer({ slug: "beta" }),
};

describe("answer registry", () => {
  describe("getAnswer", () => {
    it("returns the parsed answer for a known slug", () => {
      expect(getAnswer("alpha", mockRegistry)?.slug).toBe("alpha");
    });

    it("returns undefined for an unknown slug", () => {
      expect(getAnswer("nope", mockRegistry)).toBeUndefined();
    });
  });

  describe("getAllAnswers", () => {
    it("returns every answer in registration order", () => {
      expect(getAllAnswers(mockRegistry).map((a) => a.slug)).toEqual([
        "alpha",
        "beta",
      ]);
    });
  });

  describe("getAllAnswerSlugs", () => {
    it("returns the slugs used for prerendering and the sitemap", () => {
      expect(getAllAnswerSlugs(mockRegistry)).toEqual(["alpha", "beta"]);
    });
  });

  describe("getRelatedAnswers", () => {
    it("resolves related slugs to their configs", () => {
      const related = getRelatedAnswers(mockRegistry.alpha, mockRegistry);
      expect(related.map((a) => a.slug)).toEqual(["beta"]);
    });

    it("drops slugs that no longer exist rather than throwing", () => {
      // "missing" is in alpha's relatedAnswers but not in the registry.
      expect(() =>
        getRelatedAnswers(mockRegistry.alpha, mockRegistry),
      ).not.toThrow();
      expect(getRelatedAnswers(mockRegistry.beta, mockRegistry)).toEqual([]);
    });
  });

  describe("answerPath", () => {
    it("defaults to /answers/<slug>", () => {
      expect(answerPath(mockRegistry.alpha)).toBe("/answers/alpha");
    });

    it("honours an explicit canonical when one is set", () => {
      const custom = makeAnswer({
        slug: "gamma",
        seo: {
          title: "T",
          description: "D",
          canonical: "/answers/other-slug",
        },
      });
      expect(answerPath(custom)).toBe("/answers/other-slug");
    });
  });
});

describe("answer schema", () => {
  it("rejects a slug that is not kebab-case", () => {
    expect(() => makeAnswer({ slug: "Not Kebab" })).toThrow();
  });

  it("rejects an answer with no sections", () => {
    expect(() => makeAnswer({ slug: "empty", sections: [] })).toThrow();
  });

  it("rejects an external or relative related link href", () => {
    expect(() =>
      makeAnswer({
        slug: "bad-link",
        relatedTools: [
          {
            title: "Elsewhere",
            description: "Off site",
            href: "https://example.com",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("published answers", () => {
  const published = getAllAnswers();

  it("publishes at least eight distinct answers", () => {
    // The first content pack's acceptance bar (#2564).
    expect(published.length).toBeGreaterThanOrEqual(8);
  });

  it("keys every answer by its own slug", () => {
    for (const [key, answer] of Object.entries(answers)) {
      expect(key).toBe(answer.slug);
    }
  });

  it("gives every answer a unique question and unique metadata", () => {
    const questions = published.map((a) => a.question.toLowerCase());
    const titles = published.map((a) => a.seo.title);
    const descriptions = published.map((a) => a.seo.description);
    expect(new Set(questions).size).toBe(questions.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("never links to an answer that does not exist", () => {
    const slugs = new Set(getAllAnswerSlugs());
    for (const answer of published) {
      for (const related of answer.relatedAnswers) {
        expect(slugs, `${answer.slug} → ${related}`).toContain(related);
      }
    }
  });

  it("never links an answer to itself", () => {
    for (const answer of published) {
      expect(answer.relatedAnswers).not.toContain(answer.slug);
    }
  });

  it("cross-links every answer to at least one other answer", () => {
    for (const answer of published) {
      expect(
        answer.relatedAnswers.length,
        `${answer.slug} has no related answers`,
      ).toBeGreaterThan(0);
    }
  });

  it("points every answer at a live Codex surface", () => {
    for (const answer of published) {
      const outbound =
        answer.relatedTools.length + answer.relatedForPages.length;
      expect(outbound, `${answer.slug} links nowhere`).toBeGreaterThan(0);
    }
  });

  it("only links to routes the site actually publishes", () => {
    // #2564 is explicit that answers must link to live capabilities only. A
    // hand-written href is the easiest thing on these pages to get wrong, so
    // it is checked against the same registries the routes are built from.
    const forSlugs = new Set(getAllLandingPageSlugs());
    const toolPages = new Set([
      "cyberpunk-nomad-clan-generator",
      "dnd-npc-generator",
      "faction-generator",
      "fantasy-name-generator",
      "quest-hook-generator",
      "rpg-npc-generator",
      "vampire-clan-generator",
    ]);

    const isLive = (href: string): boolean => {
      const [section, slug, ...rest] = href.replace(/^\//, "").split("/");
      if (rest.length > 0) return false;
      if (!slug)
        return ["answers", "tools", "generators", "for"].includes(section);
      switch (section) {
        case "answers":
          return getAllAnswerSlugs().includes(slug);
        case "for":
          return forSlugs.has(slug);
        case "generators":
          return isGeneratorSlug(slug);
        case "tools":
          return toolPages.has(slug);
        case "solutions":
          return slug in solutions;
        case "features":
          return slug in featuresConfig;
        default:
          return false;
      }
    };

    for (const answer of published) {
      const hrefs = [
        ...answer.relatedTools.map((t) => t.href),
        ...answer.relatedForPages.map((p) => p.href),
        ...(answer.codexConnection ? [answer.codexConnection.href] : []),
      ];
      for (const href of hrefs) {
        expect(isLive(href), `${answer.slug} links to dead route ${href}`).toBe(
          true,
        );
      }
    }
  });

  it("gives each answer a substantive body, not a stub", () => {
    for (const answer of published) {
      expect(answer.shortAnswer.length, answer.slug).toBeGreaterThan(140);
      expect(answer.sections.length, answer.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("includes a concrete worked example on every answer", () => {
    for (const answer of published) {
      expect(
        answer.sections.some((section) => section.kind === "example"),
        `${answer.slug} has no example block`,
      ).toBe(true);
    }
  });

  it("uses British English spellings, not American ones", () => {
    // The pack's editorial rule (#2564). A curated list rather than a broad
    // `\w+ize` pattern, which flags legitimate words like "assize" and "sized".
    const americanisms =
      /\b(?:organiz|recogniz|realiz|specializ|characteriz|apologiz|analyz|color|honor|behavior|rumor|favorite|neighbor|center|theater|catalog|gray|traveled|traveling|canceled|defense|offense)\w*\b/i;
    for (const answer of published) {
      const body = JSON.stringify(answer);
      expect(body.match(americanisms)?.[0] ?? null, answer.slug).toBeNull();
    }
  });

  it("keeps titles and descriptions within a sensible length for search results", () => {
    for (const answer of published) {
      expect(answer.seo.title.length, answer.slug).toBeLessThanOrEqual(75);
      expect(answer.seo.description.length, answer.slug).toBeLessThanOrEqual(
        185,
      );
    }
  });
});

describe("answer structured data", () => {
  const answer = mockRegistry.alpha;

  it("emits a single-question FAQPage carrying the direct answer", () => {
    const parsed = JSON.parse(buildAnswerFaqJsonLd(answer));
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(1);
    expect(parsed.mainEntity[0].name).toBe(answer.question);
    expect(parsed.mainEntity[0].acceptedAnswer.text).toBe(answer.shortAnswer);
  });

  it("emits a Home → Answers → question breadcrumb with absolute URLs", () => {
    const parsed = JSON.parse(buildAnswerBreadcrumbJsonLd(answer));
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement.map((i: { name: string }) => i.name)).toEqual(
      ["Home", "Answers", answer.question],
    );
    for (const item of parsed.itemListElement) {
      expect(item.item).toMatch(/^https?:\/\//);
    }
  });

  it("emits the index as an ItemList in registry order", () => {
    const parsed = JSON.parse(buildAnswerIndexJsonLd(getAllAnswers()));
    expect(parsed["@type"]).toBe("ItemList");
    expect(parsed.itemListElement).toHaveLength(getAllAnswerSlugs().length);
    expect(parsed.itemListElement[0].position).toBe(1);
  });

  it("escapes < so JSON-LD cannot break out of its script element", () => {
    const risky = makeAnswer({
      slug: "risky",
      shortAnswer: "Answers may mention </script> without breaking the page.",
    });
    expect(buildAnswerFaqJsonLd(risky)).not.toContain("</script>");
    expect(buildAnswerFaqJsonLd(risky)).toContain("\\u003c");
  });
});
