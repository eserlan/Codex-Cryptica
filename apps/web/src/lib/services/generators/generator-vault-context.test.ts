import { describe, it, expect } from "vitest";
import {
  buildVaultContext,
  detectVaultLanguages,
  findSingleQuestHook,
  latestTemporalYear,
  suggestPrimaryLanguageId,
} from "./generator-vault-context";
import type { Entity } from "schema";

function entity(
  overrides: Partial<Entity> & { id: string; title: string; type: string },
): Entity {
  return {
    content: "",
    lore: "",
    labels: [],
    connections: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as Entity;
}

const categories = [
  { id: "character", label: "Character" },
  { id: "location", label: "Location" },
];

describe("latestTemporalYear", () => {
  it("returns the highest year across date/start_date/end_date", () => {
    const a = entity({ id: "a", title: "A", type: "event" });
    (a as unknown as { date: { year: number } }).date = { year: 1200 };
    const b = entity({ id: "b", title: "B", type: "event" });
    (b as unknown as { end_date: { year: number } }).end_date = { year: 1247 };
    const c = entity({ id: "c", title: "C", type: "event" });
    (c as unknown as { start_date: { year: number } }).start_date = {
      year: 1100,
    };
    expect(latestTemporalYear({ a, b, c })).toBe(1247);
  });

  it("returns undefined when no entity carries a structured date", () => {
    const a = entity({ id: "a", title: "A", type: "character" });
    expect(latestTemporalYear({ a })).toBeUndefined();
    expect(latestTemporalYear({})).toBeUndefined();
  });
});

describe("findSingleQuestHook", () => {
  it("returns the only quest-generator entry in memory", () => {
    const hook = entity({
      id: "quest-1",
      title: "The Silent Bell",
      type: "event",
      labels: ["rpg-quest", "quest-generator"],
    });
    expect(findSingleQuestHook({ hook })).toBe(hook);
  });

  it("returns undefined when there are zero or multiple quest hooks", () => {
    const first = entity({
      id: "quest-1",
      title: "First",
      type: "event",
      labels: ["quest-generator"],
    });
    const second = entity({
      id: "quest-2",
      title: "Second",
      type: "event",
      labels: ["rpg-quest"],
    });
    expect(findSingleQuestHook({})).toBeUndefined();
    expect(findSingleQuestHook({ first, second })).toBeUndefined();
  });

  it("does not classify an ordinary event as a quest hook", () => {
    const event = entity({ id: "event-1", title: "Festival", type: "event" });
    expect(findSingleQuestHook({ event })).toBeUndefined();
  });
});

describe("buildVaultContext (T042/T047)", () => {
  it("includes category labels and theme in context", () => {
    const ctx = buildVaultContext({
      themeId: "fantasy",
      categoryLabels: categories,
      allEntities: {},
    });
    expect(ctx.categoryLabels).toEqual(categories);
    expect(ctx.themeId).toBe("fantasy");
    expect(ctx.includedContext).toContain("categories");
    expect(ctx.includedContext).toContain("theme");
  });

  it("workspace theme does not add theme to includedContext", () => {
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: {},
    });
    expect(ctx.includedContext).not.toContain("theme");
  });

  it("includes source entity excerpt in contextual mode", () => {
    const src = entity({
      id: "e1",
      title: "Kaeldar",
      type: "character",
      content: "A guard.",
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { e1: src },
    });
    expect(ctx.sourceEntity?.title).toBe("Kaeldar");
    expect(ctx.includedContext).toContain("source");
  });

  it("caps neighbors at 5", () => {
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const others: Record<string, Entity> = { src };
    for (let i = 0; i < 8; i++) {
      others[`e${i}`] = entity({
        id: `e${i}`,
        title: `NPC ${i}`,
        type: "character",
      });
    }
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: others,
    });
    expect(ctx.neighbors.length).toBeLessThanOrEqual(5);
  });

  it("truncates long content for non-source (neighbor/world) entities", () => {
    const longText = "x".repeat(500);
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const neighbor = entity({
      id: "n1",
      title: "Big",
      type: "character",
      content: longText,
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, n1: neighbor },
      connectedIds: new Set(["n1"]),
    });
    const n = ctx.neighbors.find((e) => e.id === "n1");
    expect(n?.contentExcerpt.length).toBeLessThanOrEqual(304);
  });

  it("truncates prose at the last complete sentence boundary, not mid-sentence", () => {
    // Two short sentences, then a long run-on well past the 300-char excerpt
    // cap — the excerpt must end after "second sentence." (a real sentence
    // boundary within the limit), never mid-word/mid-sentence into the run-on.
    const prose =
      "This is the first sentence. This is the second sentence. " +
      "This is a very long run-on sentence that goes on and on ".repeat(6) +
      "and finally ends.";
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const neighbor = entity({
      id: "n1",
      title: "Big",
      type: "character",
      content: prose,
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, n1: neighbor },
      connectedIds: new Set(["n1"]),
    });
    const excerpt = ctx.neighbors.find((e) => e.id === "n1")?.contentExcerpt;
    expect(excerpt).toBe(
      "This is the first sentence. This is the second sentence.",
    );
    expect(excerpt?.endsWith("sentence.")).toBe(true);
    expect(excerpt).not.toContain("…");
  });

  it("falls back to a word boundary (not a sentence one) for a single long run-on with no earlier break", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const neighbor = entity({
      id: "n1",
      title: "Big",
      type: "character",
      content: words,
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, n1: neighbor },
      connectedIds: new Set(["n1"]),
    });
    const excerpt = ctx.neighbors.find((e) => e.id === "n1")?.contentExcerpt;
    expect(excerpt?.endsWith("…")).toBe(true);
    const withoutEllipsis = excerpt!.slice(0, -1);
    // The cut must land exactly on a word boundary in the source text — the
    // character immediately after it in the original is a space, proving no
    // word was sliced mid-token.
    expect(words.startsWith(withoutEllipsis)).toBe(true);
    expect(words[withoutEllipsis.length]).toBe(" ");
  });

  it("keeps a generous source excerpt but caps extreme length", () => {
    const shortLore = "l".repeat(1000);
    const hugeLore = "h".repeat(5000);
    const src = entity({
      id: "e1",
      title: "Anchor",
      type: "character",
      content: shortLore,
      lore: hugeLore,
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { e1: src },
    });
    // under the source cap → kept in full
    expect(ctx.sourceEntity?.contentExcerpt).toBe(shortLore);
    // over the cap → bounded (much larger than a background excerpt, but not 5k)
    expect(ctx.sourceEntity?.loreExcerpt?.length).toBeLessThanOrEqual(1501);
    expect(ctx.sourceEntity?.loreExcerpt?.length).toBeGreaterThan(1000);
  });

  it("flattens markdown headings and newlines in excerpts", () => {
    const src = entity({
      id: "e1",
      title: "Guild",
      type: "faction",
      lore: "## Summary\nA guild of scribes.\n\n## Creed\nPreserve all ink.",
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { e1: src },
    });
    const lore = ctx.sourceEntity?.loreExcerpt ?? "";
    expect(lore).not.toContain("##");
    expect(lore).not.toContain("\n");
    expect(lore).toContain("Summary A guild of scribes.");
  });

  it("includes title hints from all entities", () => {
    const e1 = entity({ id: "a", title: "Kaeldar", type: "character" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { a: e1 },
    });
    expect(ctx.existingTitles).toContain("Kaeldar");
  });

  it("scopes the name ban list to the target entity type", () => {
    const npc = entity({ id: "a", title: "Kaeldar", type: "character" });
    const event = entity({
      id: "b",
      title: "Exodus of the Arcanum",
      type: "event",
    });
    const place = entity({ id: "c", title: "Great Library", type: "location" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { a: npc, b: event, c: place },
      targetEntityType: "character",
    });
    expect(ctx.existingTitles).toContain("Kaeldar");
    expect(ctx.existingTitles).not.toContain("Exodus of the Arcanum");
    expect(ctx.existingTitles).not.toContain("Great Library");
  });

  it("selects neighbors from connectedIds (graph) when provided", () => {
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const connected = entity({ id: "c1", title: "Ally", type: "faction" });
    const unrelated = entity({
      id: "u1",
      title: "Stranger",
      type: "character",
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, c1: connected, u1: unrelated },
      connectedIds: new Set(["c1"]),
    });
    expect(ctx.neighbors.map((n) => n.id)).toContain("c1");
    expect(ctx.neighbors.map((n) => n.id)).not.toContain("u1");
  });

  it("falls back to same-type selection when connectedIds is empty", () => {
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const sameType = entity({ id: "s1", title: "Guard", type: "character" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, s1: sameType },
      connectedIds: new Set(),
    });
    expect(ctx.neighbors.map((n) => n.id)).toContain("s1");
  });

  it("builds a world sample as positive grounding in workspace mode", () => {
    const a = entity({
      id: "a",
      title: "Ironhold",
      type: "location",
      content: "A fortress.",
    });
    const b = entity({ id: "b", title: "The Hand", type: "faction" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { a, b },
    });
    expect(ctx.worldSample.map((e) => e.id)).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    expect(ctx.includedContext).toContain("world");
  });

  it("prioritises the target entity type in the world sample", () => {
    const all: Record<string, Entity> = {};
    for (let i = 0; i < 8; i++) {
      all[`f${i}`] = entity({ id: `f${i}`, title: `F${i}`, type: "faction" });
    }
    all.c1 = entity({ id: "c1", title: "Hero", type: "character" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: all,
      targetEntityType: "character",
    });
    // The single character must make the (capped) sample ahead of factions.
    expect(ctx.worldSample.map((e) => e.id)).toContain("c1");
    expect(ctx.worldSample.length).toBeLessThanOrEqual(8);
    expect(ctx.worldSample[0].id).toBe("c1");
  });

  it("prefers search-relevant ids (in order) for the world sample", () => {
    const all: Record<string, Entity> = {};
    for (let i = 0; i < 8; i++) {
      all[`x${i}`] = entity({ id: `x${i}`, title: `X${i}`, type: "character" });
    }
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: all,
      targetEntityType: "character",
      relevantIds: ["x5", "x2"],
    });
    const ids = ctx.worldSample.map((e) => e.id);
    expect(ids[0]).toBe("x5");
    expect(ids[1]).toBe("x2");
  });

  it("backfills the world sample by type when search returns few hits", () => {
    const a = entity({ id: "a", title: "Relevant", type: "location" });
    const b = entity({ id: "b", title: "Char1", type: "character" });
    const c = entity({ id: "c", title: "Char2", type: "character" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { a, b, c },
      targetEntityType: "character",
      relevantIds: ["a"],
    });
    const ids = ctx.worldSample.map((e) => e.id);
    expect(ids[0]).toBe("a"); // relevance hit first
    expect(ids).toContain("b"); // then same-type backfill
    expect(ids).toContain("c");
  });

  it("includes events as grounding and puts notes last in the world sample", () => {
    const character = entity({ id: "c1", title: "Hero", type: "character" });
    const event = entity({ id: "e1", title: "The Sundering", type: "event" });
    const note = entity({ id: "n1", title: "DM scratchpad", type: "note" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { c1: character, e1: event, n1: note },
      targetEntityType: "character",
    });
    const ids = ctx.worldSample.map((e) => e.id);
    // character (target type) first, event before note, note last.
    expect(ids.indexOf("c1")).toBeLessThan(ids.indexOf("e1"));
    expect(ids.indexOf("e1")).toBeLessThan(ids.indexOf("n1"));
    expect(ids).toContain("e1");
    expect(ids[ids.length - 1]).toBe("n1");
  });

  it("excludes the source and neighbors from the world sample", () => {
    const src = entity({ id: "src", title: "Hero", type: "character" });
    const neighbor = entity({ id: "n1", title: "Ally", type: "character" });
    const other = entity({ id: "o1", title: "Distant", type: "location" });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { src, n1: neighbor, o1: other },
      connectedIds: new Set(["n1"]),
    });
    const sampleIds = ctx.worldSample.map((e) => e.id);
    expect(sampleIds).not.toContain("src");
    expect(sampleIds).not.toContain("n1");
    expect(sampleIds).toContain("o1");
  });

  it("detects structured and legacy languages without selecting either", () => {
    const lang1 = entity({
      id: "l1",
      title: "Elvish",
      type: "note",
      kind: "language",
      languageProfileVersion: 1,
      languageProfile: {
        inputs: {
          genre: "Fantasy",
          tone: "Lyrical",
          role: "Common Speech",
          structure: "Suffix-heavy",
        },
        phonology: {
          consonants: ["l"],
          vowels: ["e"],
          phonotactics: ["CV"],
        },
        naming: {
          examples: [{ name: "Ela", meaning: "light", use: "person" }],
        },
        lexicon: [{ word: "el", pronunciation: "ELL", meaning: "light" }],
        grammar: {
          examples: [
            {
              text: "El na",
              pronunciation: "ELL nah",
              translation: "Light comes",
            },
          ],
        },
        register: { role: "Common Speech" },
        tableUseTips: ["Use open vowels."],
      },
    });
    const lang2 = entity({
      id: "l2",
      title: "Dwarvish",
      type: "custom-cat-id",
    });
    const other = entity({ id: "o1", title: "Commoner", type: "character" });

    const languageCategories = [
      ...categories,
      { id: "custom-cat-id", label: "Language" },
    ];
    const languages = detectVaultLanguages(
      { l1: lang1, l2: lang2, o1: other },
      languageCategories,
    );
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: languageCategories,
      allEntities: { l1: lang1, l2: lang2, o1: other },
    });

    expect(languages).toEqual([
      { id: "l2", title: "Dwarvish", structured: false, legacy: true },
      { id: "l1", title: "Elvish", structured: true, legacy: false },
    ]);
    expect(ctx.selectedLanguage).toBeUndefined();
    expect(ctx.includedContext).not.toContain("languages");
  });

  it("includes only the explicitly selected structured language", () => {
    const selected = entity({
      id: "l1",
      title: "Elvish",
      type: "note",
      kind: "language",
      languageProfileVersion: 1,
      languageProfile: {
        inputs: {
          genre: "Fantasy",
          tone: "Lyrical",
          role: "Common Speech",
          structure: "Suffix-heavy",
        },
        phonology: {
          consonants: ["l"],
          vowels: ["e"],
          phonotactics: ["CV"],
        },
        naming: {
          examples: [{ name: "Ela", meaning: "light", use: "person" }],
        },
        lexicon: [{ word: "el", pronunciation: "ELL", meaning: "light" }],
        grammar: {
          examples: [
            {
              text: "El na",
              pronunciation: "ELL nah",
              translation: "Light comes",
            },
          ],
        },
        register: { role: "Common Speech" },
        tableUseTips: ["Use open vowels."],
      },
    });
    const other = entity({
      id: "l2",
      title: "Dwarvish",
      type: "note",
      kind: "language",
      lore: "Legacy naming notes.",
    });

    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { l1: selected, l2: other },
      primaryLanguageId: "l1",
    });

    expect(ctx.selectedLanguage?.id).toBe("l1");
    expect(ctx.selectedLanguage?.legacy).toBe(false);
    expect(ctx.selectedLanguage?.languageProfile?.lexicon[0].word).toBe("el");
    expect(ctx.includedContext).toContain("languages");
  });

  it("keeps an explicitly selected legacy language readable-only", () => {
    const legacy = entity({
      id: "l1",
      title: "Old Speech",
      type: "note",
      kind: "language",
      lore: "Names end in -ar.",
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      allEntities: { l1: legacy },
      primaryLanguageId: "l1",
    });

    expect(ctx.selectedLanguage?.legacy).toBe(true);
    expect(ctx.selectedLanguage?.languageProfile).toBeUndefined();
    expect(ctx.selectedLanguage?.loreExcerpt).toContain("Names end in -ar");
  });

  it("suggests a connected language without selecting it", () => {
    const source = entity({
      id: "c1",
      title: "Hero",
      type: "character",
    });
    const languages = [
      { id: "l1", title: "Elvish", structured: true, legacy: false },
    ];

    expect(suggestPrimaryLanguageId(languages, source, new Set(["l1"]))).toBe(
      "l1",
    );
    expect(
      suggestPrimaryLanguageId(languages, source, new Set()),
    ).toBeUndefined();
  });
});
