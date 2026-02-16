import { describe, it, expect } from "vitest";
import { SearchEngine } from "../src";
import type { SearchEntry } from "schema";

describe("SearchEngine Functionality", () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = new SearchEngine();
    engine.clear(); // Ensure a clean state for each test
  });

  it("should be instantiable", () => {
    expect(engine).toBeDefined();
  });

  it("should add and search for entries", async () => {
    const entry1: SearchEntry = {
      id: "entity1",
      title: "The Blacksmith",
      content: "A gruff blacksmith named Grog, known for his sturdy axes.",
      type: "npc",
      path: "/npcs/grog.md",
      keywords: ["Grog", "axes", "craftsman"],
    };
    const entry2: SearchEntry = {
      id: "entity2",
      title: "Dragon's Tooth Inn",
      content: "A lively inn famous for its potent ale and rumors of dragons.",
      type: "location",
      path: "/locations/inn.md",
      keywords: ["inn", "ale", "dragons"],
    };

    await engine.add(entry1);
    await engine.add(entry2);

    let results = await engine.search("Grog");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("entity1");
    expect(results[0].title).toBe("The Blacksmith");

    results = await engine.search("dragon");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("entity2");
    expect(results[0].title).toBe("Dragon's Tooth Inn");

    results = await engine.search("ale");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("entity2");
  });

  it("should remove entries", async () => {
    const entry1: SearchEntry = {
      id: "entity1",
      title: "The Blacksmith",
      content: "A gruff blacksmith named Grog, known for his sturdy axes.",
      type: "npc",
      path: "/npcs/grog.md",
      keywords: ["Grog", "axes", "craftsman"],
    };
    await engine.add(entry1);
    expect(await engine.search("Grog")).toHaveLength(1);

    await engine.remove("entity1");
    expect(await engine.search("Grog")).toHaveLength(0);
  });

  it("should clear the index", async () => {
    const entry1: SearchEntry = {
      id: "entity1",
      title: "The Blacksmith",
      content: "A gruff blacksmith named Grog, known for his sturdy axes.",
      type: "npc",
      path: "/npcs/grog.md",
      keywords: ["Grog", "axes", "craftsman"],
    };
    await engine.add(entry1);
    expect(await engine.search("Grog")).toHaveLength(1);

    await engine.clear();
    expect(await engine.search("Grog")).toHaveLength(0);
  });

  it("should handle empty index gracefully", async () => {
    const results = await engine.search("anything");
    expect(results).toHaveLength(0);
  });

  it("should search with special characters", async () => {
    const entry: SearchEntry = {
      id: "entity-special",
      title: "Magic Wand (Type: +1)",
      content: "A wand with a +1 bonus to spellcasting.",
      type: "item",
      path: "/items/wand.md",
      keywords: ["wand", "magic", "+1"],
    };
    await engine.add(entry);

    let results = await engine.search("wand +1");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("entity-special");

    results = await engine.search("Type: +1");
    expect(results).toHaveLength(1);
  });

  it("should return optimized transferable results for large sets", async () => {
    // Add more than 100 entries
    for (let i = 0; i < 101; i++) {
      await engine.add({
        id: `entity-${i}`,
        title: `Item ${i}`,
        content: `Content for item ${i} with a unique keyword ${i}k.`,
        type: "item",
        path: `/items/${i}.md`,
        keywords: [`${i}k`],
      });
    }

    const rawResult = await engine.searchOptimized("item", { limit: 1000 });
    expect(rawResult).toHaveProperty("isEncoded", true);
    expect(rawResult).toHaveProperty("data");

    // This part of the test would typically be done by the client (web app)
    // but we can simulate decoding here to ensure the data is valid.
    const decoder = new TextDecoder();
    const decoded = decoder.decode((rawResult as any).data);
    const results = JSON.parse(decoded);
    expect(results).toHaveLength(101);
  });

  it("should return regular results for small sets", async () => {
    await engine.add({
      id: "small-entity",
      title: "Small Item",
      content: "Just a small item.",
      type: "item",
      path: "/items/small.md",
    });

    const results = await engine.searchOptimized("small");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("small-entity");
    expect(results).not.toHaveProperty("isEncoded");
  });
});
