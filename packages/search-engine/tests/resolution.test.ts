import { describe, it, expect, beforeEach } from "vitest";
import { SearchEngine } from "../src";

/**
 * Regression tests for the FlexSearch resolution settings.
 * resolution 6 on title/aliases/keywords must still surface results for
 * exact matches, prefix matches, and common partial substrings.
 * If these fail after a resolution change, search quality has regressed.
 */

describe("SearchEngine – resolution 6 recall", () => {
  let engine: SearchEngine;

  beforeEach(async () => {
    engine = new SearchEngine();
    await engine.clear();
  });

  it("finds exact title match", async () => {
    await engine.add({ id: "a", title: "Aria Dawnwhisper", path: "a.md" });
    const results = await engine.search("Aria Dawnwhisper");
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("finds title by single word", async () => {
    await engine.add({ id: "a", title: "Aria Dawnwhisper", path: "a.md" });
    const results = await engine.search("Dawnwhisper");
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("finds title by prefix substring (tokenize:full)", async () => {
    await engine.add({ id: "a", title: "Aria Dawnwhisper", path: "a.md" });
    const results = await engine.search("Dawn");
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("finds alias match", async () => {
    await engine.add({
      id: "a",
      title: "Aria",
      aliases: "The Silver Mage",
      path: "a.md",
    });
    const results = await engine.search("Silver");
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("finds keyword match", async () => {
    await engine.add({
      id: "a",
      title: "Aria",
      keywords: "sorcerer arcane",
      path: "a.md",
    });
    const results = await engine.search("arcane");
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("ranks title match above content match", async () => {
    await engine.add({ id: "title-hit", title: "Dragon", path: "a.md" });
    await engine.add({
      id: "content-hit",
      title: "The Ancient One",
      content: "Legends tell of a dragon beneath the mountain.",
      path: "b.md",
    });
    const results = await engine.search("dragon");
    const ids = results.map((r) => r.id);
    expect(ids).toContain("title-hit");
    expect(ids.indexOf("title-hit")).toBeLessThan(ids.indexOf("content-hit"));
  });

  it("handles a large batch of documents without recall regression", async () => {
    for (let i = 0; i < 200; i++) {
      await engine.add({
        id: `e${i}`,
        title: `Entity Number ${i}`,
        path: `e${i}.md`,
      });
    }
    // Search for a specific entity — must still surface it after bulk indexing
    const results = await engine.search("Entity Number 99");
    expect(results.map((r) => r.id)).toContain("e99");
  });
});
