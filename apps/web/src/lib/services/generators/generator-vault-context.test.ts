import { describe, it, expect } from "vitest";
import {
  buildVaultContext,
  latestTemporalYear,
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

  it("extracts languages from the vault by kind frontmatter and by Category ID or Label", () => {
    const lang1 = entity({
      id: "l1",
      title: "Elvish",
      type: "note",
      kind: "language",
    });
    const lang2 = entity({
      id: "l2",
      title: "Dwarvish",
      type: "custom-cat-id",
    });
    const other = entity({ id: "o1", title: "Commoner", type: "character" });

    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: [
        ...categories,
        { id: "custom-cat-id", label: "Language" },
      ],
      allEntities: { l1: lang1, l2: lang2, o1: other },
    });

    const langIds = ctx.languages?.map((e) => e.id) ?? [];
    expect(langIds).toContain("l1");
    expect(langIds).toContain("l2");
    expect(langIds).not.toContain("o1");
    expect(ctx.includedContext).toContain("languages");
  });
});
