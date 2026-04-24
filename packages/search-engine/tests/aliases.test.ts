import { describe, it, expect, beforeEach } from "vitest";
import { SearchEngine } from "../src";
import type { SearchEntry } from "schema";

describe("SearchEngine Alias Support", () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = new SearchEngine();
  });

  it("should index and search for aliases", async () => {
    const entry: SearchEntry = {
      id: "king-arthur",
      title: "Arthur Pendragon",
      aliases: "Wart High King",
      content: "The legendary King of the Britons.",
      path: "arthur.md",
      updatedAt: Date.now(),
    };

    await engine.add(entry);

    // Search by alias
    let results = await engine.search("Wart");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("king-arthur");
    expect(results[0].title).toBe("Arthur Pendragon");

    // Search by partial alias
    results = await engine.search("High");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("king-arthur");
  });

  it("should weight aliases correctly (title > alias > content)", async () => {
    // entry1 has query in title
    const entry1: SearchEntry = {
      id: "e1",
      title: "The Ghost",
      aliases: "Spirit",
      content: "Regular person.",
      path: "e1.md",
      updatedAt: Date.now(),
    };

    // entry2 has query in alias
    const entry2: SearchEntry = {
      id: "e2",
      title: "John Doe",
      aliases: "Ghost",
      content: "Regular person.",
      path: "e2.md",
      updatedAt: Date.now(),
    };

    // entry3 has query in content
    const entry3: SearchEntry = {
      id: "e3",
      title: "Someone Else",
      aliases: "Person",
      content: "He saw a Ghost.",
      path: "e3.md",
      updatedAt: Date.now(),
    };

    await engine.addBatch([entry1, entry2, entry3]);

    const results = await engine.search("Ghost");
    expect(results).toHaveLength(3);

    // Title match should be first
    expect(results[0].id).toBe("e1");
    // Alias match should be second
    expect(results[1].id).toBe("e2");
    // Content match should be third
    expect(results[2].id).toBe("e3");

    // Verify scores are descending
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });
});
