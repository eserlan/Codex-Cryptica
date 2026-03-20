import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchEngine } from "../src";
import type { SearchEntry } from "schema";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(
  id: string,
  overrides: Partial<SearchEntry> = {},
): SearchEntry {
  return {
    id,
    title: `Title for ${id}`,
    content: `Content body for ${id}.`,
    type: "npc",
    path: `/${id}.md`,
    updatedAt: 0,
    ...overrides,
  };
}

// ─── docCount getter ──────────────────────────────────────────────────────────

describe("SearchEngine – docCount", () => {
  let engine: SearchEngine;

  beforeEach(async () => {
    engine = new SearchEngine();
    await engine.clear();
  });

  it("starts at 0", () => {
    expect(engine.docCount).toBe(0);
  });

  it("increments after add", async () => {
    await engine.add(makeEntry("e1"));
    expect(engine.docCount).toBe(1);
    await engine.add(makeEntry("e2"));
    expect(engine.docCount).toBe(2);
  });

  it("decrements after remove", async () => {
    await engine.add(makeEntry("e1"));
    await engine.remove("e1");
    expect(engine.docCount).toBe(0);
  });

  it("resets to 0 after clear", async () => {
    await engine.add(makeEntry("e1"));
    await engine.add(makeEntry("e2"));
    await engine.clear();
    expect(engine.docCount).toBe(0);
  });
});

// ─── setLogger callback ───────────────────────────────────────────────────────

describe("SearchEngine – setLogger", () => {
  it("calls the logger with the correct level and message after init", async () => {
    const logger = vi.fn();
    const engine = new SearchEngine();
    engine.setLogger(logger);
    // setLogger itself triggers an info log
    expect(logger).toHaveBeenCalledWith(
      "info",
      "Logger attached to SearchEngine",
      undefined,
    );
  });

  it("calls the logger with 'warn' when search is called on a null index", async () => {
    const logger = vi.fn();
    const engine = new SearchEngine();
    engine.setLogger(logger);
    // Clear prior calls from setLogger/initIndex, then trigger the warn path
    logger.mockClear();
    (engine as any).index = null;
    await engine.search("test");
    expect(logger).toHaveBeenCalledWith(
      "warn",
      "Search called but index is null.",
      undefined,
    );
  });

  it("does not throw if a logger callback itself throws", async () => {
    const engine = new SearchEngine();
    engine.setLogger(() => {
      throw new Error("logger exploded");
    });
    // Should not propagate the error
    await expect(engine.add(makeEntry("safe"))).resolves.not.toThrow();
  });
});

// ─── setChangeCallback ────────────────────────────────────────────────────────

describe("SearchEngine – setChangeCallback", () => {
  let engine: SearchEngine;
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    engine = new SearchEngine();
    onChange = vi.fn() as unknown as () => void;
    engine.setChangeCallback(onChange);
    await engine.clear(); // resets; onChange may already have fired from clear
    onChange.mockClear();
  });

  it("fires after add", async () => {
    await engine.add(makeEntry("cb1"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("fires after remove", async () => {
    await engine.add(makeEntry("cb2"));
    onChange.mockClear();
    await engine.remove("cb2");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("fires after clear", async () => {
    await engine.clear();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("fires after importIndex", async () => {
    const exported = await engine.exportIndex();
    onChange.mockClear();
    await engine.importIndex(exported);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw if a change callback itself throws", async () => {
    const throwingEngine = new SearchEngine();
    throwingEngine.setChangeCallback(() => {
      throw new Error("callback exploded");
    });
    await expect(throwingEngine.add(makeEntry("safe2"))).resolves.not.toThrow();
  });
});

// ─── Scoring / ranking ────────────────────────────────────────────────────────

describe("SearchEngine – scoring & ranking", () => {
  let engine: SearchEngine;

  beforeEach(async () => {
    engine = new SearchEngine();
    await engine.clear();
  });

  it("title matches score higher than content matches", async () => {
    await engine.add(
      makeEntry("title-match", {
        title: "Wizard Gandalf",
        content: "An elderly man.",
      }),
    );
    // "wizard" in content only
    await engine.add(
      makeEntry("content-match", {
        title: "Old Man",
        content: "A powerful wizard walks by.",
      }),
    );

    const results = await engine.search("wizard");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const titleResult = results.find((r) => r.id === "title-match");
    const contentResult = results.find((r) => r.id === "content-match");
    expect(titleResult).toBeDefined();
    expect(contentResult).toBeDefined();
    expect(titleResult!.score).toBeGreaterThan(contentResult!.score);
  });

  it("keyword matches score higher than content matches", async () => {
    await engine.add(
      makeEntry("kw-match", {
        title: "Mysterious Flask",
        content: "A strange liquid.",
        keywords: "potion",
      }),
    );
    // "potion" in content only
    await engine.add(
      makeEntry("content-match2", {
        title: "Apothecary",
        content: "Sells many potions here.",
      }),
    );

    const results = await engine.search("potion");
    const kwResult = results.find((r) => r.id === "kw-match");
    const contentResult = results.find((r) => r.id === "content-match2");
    expect(kwResult).toBeDefined();
    expect(contentResult).toBeDefined();
    expect(kwResult!.score).toBeGreaterThan(contentResult!.score);
  });

  it("respects the limit option", async () => {
    for (let i = 0; i < 5; i++) {
      await engine.add(makeEntry(`hero-${i}`, { title: `Hero ${i}` }));
    }
    const limited = await engine.search("hero", { limit: 2 });
    expect(limited.length).toBeLessThanOrEqual(2);
  });

  it("de-duplicates docs that match in multiple fields (highest score wins)", async () => {
    // "dragon" appears in both title and content
    await engine.add(
      makeEntry("dupe-doc", {
        title: "Dragon Lord",
        content: "The dragon breathes fire.",
        keywords: "dragon",
      }),
    );
    const results = await engine.search("dragon");
    // Should be exactly 1 result, not one per field
    expect(results.filter((r) => r.id === "dupe-doc")).toHaveLength(1);
  });
});

// ─── Excerpt generation ───────────────────────────────────────────────────────

describe("SearchEngine – excerpt", () => {
  let engine: SearchEngine;

  beforeEach(async () => {
    engine = new SearchEngine();
    await engine.clear();
  });

  it("content-match result includes a non-empty excerpt containing the query word", async () => {
    await engine.add(
      makeEntry("excerpt-doc", {
        title: "Some Unrelated Title",
        content:
          "Deep in the forgotten forest lives an ancient sorcerer who guards the amulet.",
      }),
    );
    const results = await engine.search("sorcerer");
    const hit = results.find((r) => r.id === "excerpt-doc");
    expect(hit).toBeDefined();
    expect(hit!.excerpt).toBeTruthy();
    expect(hit!.excerpt!.toLowerCase()).toContain("sorcerer");
  });

  it("adds ellipsis prefix when match is not at the start of content", async () => {
    const longPrefix = "a".repeat(80);
    await engine.add(
      makeEntry("ellipsis-doc", {
        title: "Something Else",
        content: `${longPrefix} sorcerer stands here.`,
        keywords: [],
      }),
    );
    const results = await engine.search("sorcerer");
    const hit = results.find((r) => r.id === "ellipsis-doc");
    expect(hit?.excerpt).toMatch(/^\.\.\./);
  });
});

// ─── Error-path guards ────────────────────────────────────────────────────────

describe("SearchEngine – error-path guards", () => {
  it("search returns [] when index is null", async () => {
    const engine = new SearchEngine();
    (engine as any).index = null;
    const results = await engine.search("anything");
    expect(results).toEqual([]);
  });

  it("remove resolves without throwing when index is null", async () => {
    const engine = new SearchEngine();
    (engine as any).index = null;
    await expect(engine.remove("ghost")).resolves.not.toThrow();
  });

  it("exportIndex returns {} when index is null", async () => {
    const engine = new SearchEngine();
    (engine as any).index = null;
    const data = await engine.exportIndex();
    expect(data).toEqual({});
  });
});

// ─── importIndex edge-cases ───────────────────────────────────────────────────

describe("SearchEngine – importIndex", () => {
  it("handles payload without _docIds without throwing", async () => {
    const engine = new SearchEngine();
    await engine.clear();
    await expect(engine.importIndex({})).resolves.not.toThrow();
    // docCount stays 0 because no _docIds were present
    expect(engine.docCount).toBe(0);
  });

  it("restores docCount from _docIds in payload", async () => {
    const source = new SearchEngine();
    await source.clear();
    await source.add(makeEntry("import-1"));
    await source.add(makeEntry("import-2"));
    const exported = await source.exportIndex();

    const target = new SearchEngine();
    await target.clear();
    await target.importIndex(exported);
    expect(target.docCount).toBe(2);
  });
});

// ─── Concurrent task queue safety ─────────────────────────────────────────────

describe("SearchEngine – concurrent task queue", () => {
  it("handles many concurrent adds and arrives at the correct docCount", async () => {
    const engine = new SearchEngine();
    await engine.clear();
    const N = 50;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        engine.add(makeEntry(`concurrent-${i}`)),
      ),
    );
    expect(engine.docCount).toBe(N);
  });
});
