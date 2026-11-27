import { describe, expect, it } from "vitest";
import { slugMeta, type ValidSlug } from "./generator-page-meta";
import { slugDrafts } from "./generator-page-drafts";
import { getGeneratorGuide } from "./generator-page-guides";

const allExpectedSlugs: ValidSlug[] = [
  "business",
  "npc",
  "one-shot-adventure-generator",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "artifact-generator",
  "faction",
  "faction-roster",
  "quest",
  "rumour",
  "puzzle",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "nomad-clan",
  "dark-fantasy-faction",
  "urban-fantasy-faction",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "news-sheet-generator",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "plot-twist-generator",
  "bbeg-generator",
  "comic-book-event-generator",
  "origin-generator",
  "villain-scheme-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "constellation",
  "alien-race",
  "creature",
  "encounter",
  "heist",
  "holiday",
  "personality",
  "tome",
  "point-crawl",
  "mystery-investigation",
];

describe("generator-page-meta completeness and social preview tags", () => {
  it("uses the Mystery & Investigation Generator's rendered social screenshot", () => {
    expect(slugMeta["mystery-investigation"].ogImage).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-mystery-investigation.png",
    );
    expect(slugMeta["mystery-investigation"].ogImageAlt).toMatch(
      /player-facing clues and a separate GM-only truth panel/,
    );
    expect(slugMeta["mystery-investigation"].relatedLinks).toContainEqual({
      href: "/answers/how-do-you-run-a-mystery-without-railroading",
      label: "Run a mystery without railroading",
    });
    expect(slugMeta["mystery-investigation"].relatedLinks).toContainEqual({
      href: "/answers/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
      label: "Handle a plausible but wrong conclusion",
    });
  });

  it("uses Puzzle's own rendered social screenshot", () => {
    expect(slugMeta.puzzle.ogImage).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-puzzle.png",
    );
    expect(slugMeta.puzzle.ogImage).not.toContain("generator-quest");
  });

  it("uses Business's own rendered social screenshot", () => {
    expect(slugMeta.business.ogImage).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-business.png",
    );
    expect(slugMeta.business.ogImageAlt).toMatch(/Business Generator/);
  });

  it("describes how campaign context affects AI and offline nomad clan drafts", () => {
    expect(slugMeta["nomad-clan"].faqs).toContainEqual({
      question: "Can I aim the clan at my current campaign?",
      answer:
        "With AI generation on, campaign context is used as input to tailor the clan, and the draft is asked to include it. Offline drafts display your context under Who they are, but do not use it to tailor the other generated details.",
    });
  });

  it("describes the Holiday generator's calendar mode and social preview", () => {
    expect(slugMeta.holiday.faqs).toContainEqual(
      expect.objectContaining({ question: "Can I generate a full calendar?" }),
    );
    expect(slugMeta.holiday.ogImage).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-holiday.jpg",
    );
    expect(slugMeta.holiday.ogImageAlt).toBeTruthy();
    expect(slugMeta.holiday.relatedLinks).toContainEqual({
      href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
      label: "Run political intrigue and faction play",
    });
  });

  it("preserves the Council Vote FAQs and related generators", () => {
    expect(slugMeta["council-vote"].faqs).toHaveLength(3);
    expect(slugMeta["council-vote"].relatedLinks).toEqual([
      { href: "/generators/quest", label: "Quest Hook Generator" },
      { href: "/generators/faction", label: "Faction Generator" },
      { href: "/generators/kingdom", label: "Kingdom Generator" },
    ]);
  });

  it("gives urban fantasy factions distinct metadata and related hubs", () => {
    const meta = slugMeta["urban-fantasy-faction"];
    expect(meta.canonicalPath).toBe("/generators/urban-fantasy-faction");
    expect(meta.pageTitle).toContain("Urban Fantasy Faction Generator");
    expect(meta.metaDescription).toContain("modern supernatural");
    expect(meta.introText).toContain("not cities");
    expect(meta.keywords).toEqual(
      expect.arrayContaining([
        "urban fantasy faction generator",
        "modern fantasy faction generator",
        "supernatural faction generator",
        "hidden-world faction generator",
        "mage cabal generator",
        "occult faction generator",
        "modern occult RPG factions",
      ]),
    );
    expect(meta.relatedLinks?.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "/generators/vampire",
        "/generators/cosmic-horror",
        "/generators/cyberpunk",
        "/generators/modern",
      ]),
    );
  });

  it("has metadata entries for all valid generator slugs", () => {
    const keys = Object.keys(slugMeta);
    expect(keys.length).toBe(allExpectedSlugs.length);
    for (const slug of allExpectedSlugs) {
      expect(slugMeta[slug], `Missing metadata for slug ${slug}`).toBeDefined();
    }
  });

  for (const slug of allExpectedSlugs) {
    describe(`slug: ${slug}`, () => {
      it("has non-empty title and description", () => {
        const meta = slugMeta[slug];
        expect(meta.pageTitle.trim().length).toBeGreaterThan(10);
        expect(meta.metaDescription.trim().length).toBeGreaterThan(20);
      });

      it("has a valid canonical path starting with /generators/", () => {
        const meta = slugMeta[slug];
        expect(meta.canonicalPath.startsWith("/generators/")).toBe(true);
      });

      it("has a valid social preview override when provided", () => {
        const meta = slugMeta[slug];
        if (meta.ogImage) {
          expect(meta.ogImage.startsWith("https://")).toBe(true);
          expect(
            meta.ogImageAlt,
            `Expected ogImageAlt for ${slug}`,
          ).toBeDefined();
          expect(meta.ogImageAlt?.trim().length).toBeGreaterThan(10);
        } else {
          expect(meta.ogImageAlt).toBeUndefined();
        }
      });

      it("has valid keywords array", () => {
        const meta = slugMeta[slug];
        expect(Array.isArray(meta.keywords)).toBe(true);
        expect(meta.keywords!.length).toBeGreaterThan(0);
      });
    });
  }

  describe("heist and puzzle cluster-link integrity (#2850)", () => {
    it("heist generator links to its answer guide and its worked example", () => {
      const hrefs = slugMeta.heist.relatedLinks?.map((link) => link.href) ?? [];
      expect(hrefs).toContain(
        "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      );
      expect(hrefs).toContain(
        "/examples/the-breakwater-vault-space-western-heist",
      );
    });

    it("puzzle generator links to its answer guide and its worked example", () => {
      const hrefs =
        slugMeta.puzzle.relatedLinks?.map((link) => link.href) ?? [];
      expect(hrefs).toContain(
        "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      );
      expect(hrefs).toContain("/examples/the-venting-helix-derelict-hazard");
    });

    it("point crawl title keeps the primary phrase and fits the 70-character audit limit (#4371)", () => {
      const { pageTitle } = slugMeta["point-crawl"];
      expect(pageTitle).toBe(
        "Point Crawl Generator | RPG Route Map Maker | Codex Cryptica",
      );
      expect(pageTitle.length).toBeLessThanOrEqual(70);
      expect(pageTitle.startsWith("Point Crawl Generator")).toBe(true);
    });

    it("provides a pre-rendered initial draft and usage guide for every valid generator slug", () => {
      for (const slug of allExpectedSlugs) {
        const draft = slugDrafts[slug];
        expect(draft, `Missing slugDrafts entry for ${slug}`).toBeTruthy();
        expect(draft!.title.trim().length).toBeGreaterThan(0);
        expect(draft!.content.trim().length).toBeGreaterThan(0);

        const guide = getGeneratorGuide(slug, slugMeta[slug].introTitle);
        expect(guide.summary.trim().length).toBeGreaterThan(20);
        expect(guide.tips.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

describe("Quest editorial example", () => {
  it("provides a coherent Event example and four substantive FAQs", () => {
    expect(slugDrafts.quest).toMatchObject({
      title: "The Millrace Ultimatum",
      type: "event",
    });
    for (const section of ["The Hook", "Location", "Key NPC", "Threat"]) {
      expect(slugDrafts.quest!.content).toContain("### " + section);
    }
    for (const section of ["Complication", "The Twist", "Reward"]) {
      expect(slugDrafts.quest!.lore).toContain("### " + section);
    }
    expect(slugMeta.quest.faqs).toHaveLength(4);
    expect(
      slugMeta.quest.faqs?.map(({ answer }) => answer).join(" "),
    ).toContain("one Event entry");
  });
});

describe("Personality editorial example and FAQ", () => {
  it("keeps Iona Pell's portrayable cues distinct from the private pressures", () => {
    const draft = slugDrafts.personality!;
    expect(draft).toMatchObject({
      type: "character",
      kind: "personality",
      title: "Iona Pell",
      labels: ["personality", "personality-generator", "imported-draft"],
    });
    for (const heading of [
      "Core Personality",
      "Speech & Conversational Style",
      "Mannerism / Tell",
      "Roleplaying Cues",
    ]) {
      expect(draft.content).toContain(`### ${heading}`);
    }
    for (const heading of [
      "Outward Demeanour vs Inner Nature",
      "Drives",
      "Virtue and Flaw",
      "Contradiction",
      "Under Pressure",
      "Social Behaviour",
      "Boundary / Trigger",
      "Example Reactions",
    ]) {
      expect(draft.lore).toContain(`### ${heading}`);
    }
    expect(draft.content).not.toContain("altered court transcript");
    expect(draft.lore).toContain("altered court transcript");
  });

  it("does not claim that random non-AI profiles use the controls or update existing characters", () => {
    const answers = slugMeta.personality.faqs
      ?.map(({ answer }) => answer)
      .join(" ");
    expect(answers).toContain(
      "picks a prewritten personality at random, independent of those choices",
    );
    expect(answers).toContain("it does not incorporate the context");
    expect(answers).toContain("one new Character");
    expect(answers).toContain("does not automatically add relationships");
    expect(answers).toContain("rather than importing a second one");
    expect(answers).toContain("already configured for Guest Character Chat");
  });
});

describe("Faction Roster editorial example", () => {
  it("has a named faction, four distinct complete members and connections to other members only", () => {
    const draft = slugDrafts["faction-roster"]!;
    expect(draft).toMatchObject({
      type: "note",
      title: "The Lantern Wardens' Notable Members",
    });
    const sections = draft.content.split("\n\n");
    const names = sections.map((section) => section.match(/^### (.+?):/)?.[1]);
    expect(names).toEqual(["Mara Fen", "Oren Pike", "Lin Voss", "Tess Reed"]);
    for (const [index, section] of sections.entries()) {
      for (const field of [
        "Duty",
        "Motive",
        "Stance",
        "Trait",
        "Wants right now",
        "Leverage",
        "Connection",
      ]) {
        expect(section).toContain(`**${field}**:`);
      }
      const connection = section.match(
        /- \*\*Connection\*\*: .+\(([^)]+)\)$/m,
      )?.[1];
      expect(names).toContain(connection);
      expect(connection).not.toBe(names[index]);
    }
    expect(draft.lore).toContain("### How This Roster Divides");
    expect(
      slugMeta["faction-roster"].faqs?.map(({ answer }) => answer).join(" "),
    ).toContain("not separate Character entries or graph links");
  });
});

describe("RPG Item editorial example", () => {
  it("illustrates a common ring with its appearance and a bounded property in the GM reference", () => {
    const draft = slugDrafts.item!;
    expect(draft).toMatchObject({
      type: "item",
      title: "The Tollwarden's Ring",
      labels: ["rpg-item", "imported-draft"],
    });
    expect(draft.content).toContain("three-arched bridge");
    expect(draft.content).not.toContain("### Magical Properties");
    expect(draft.lore).toContain("**Type**: Ring");
    expect(draft.lore).toContain("**Rarity**: Common");
    expect(draft.lore).toContain("### Magical Properties");
    expect(draft.lore).toContain("cannot reveal the cause");
    expect(draft.lore).toContain("### Lore & History");
  });

  it("describes the shared magic-item engine and does not promise mundane generation or automatic links", () => {
    const answers = slugMeta.item.faqs?.map(({ answer }) => answer).join(" ");
    expect(answers).toContain("Common is a rarity, not a non-magical setting");
    expect(answers).toContain("independently of the chosen rarity");
    expect(answers).toContain("one Item in your local vault");
    expect(answers).toContain(
      "history and offline campaign context appear in the main document",
    );
    expect(answers).toContain(
      "Only sections headed GM Reference Information or Magical Properties are kept separately",
    );
    expect(answers).toContain(
      "AI headings can vary, so check the rendered document before sharing it",
    );
    expect(answers).toContain(
      "do not automatically become graph connections or inventory entries",
    );
  });
});
