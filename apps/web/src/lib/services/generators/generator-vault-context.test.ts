import { describe, it, expect } from "vitest";
import { buildVaultContext } from "./generator-vault-context";
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

  it("excerpts long content", () => {
    const longText = "x".repeat(500);
    const src = entity({
      id: "e1",
      title: "T",
      type: "character",
      content: longText,
    });
    const ctx = buildVaultContext({
      themeId: "workspace",
      categoryLabels: categories,
      sourceEntity: src,
      allEntities: { e1: src },
    });
    expect(ctx.sourceEntity?.contentExcerpt.length).toBeLessThanOrEqual(304);
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
});
