import { describe, expect, it } from "bun:test";
import { recentResults } from "../src/recent";
import type { JournalEntry } from "../src/types";

const entry = (
  id: string,
  timestamp: number,
  type = "dice-roll",
): JournalEntry => ({
  id,
  timestamp,
  type,
  content: id,
});

describe("recentResults", () => {
  it("returns the newest entries first", () => {
    const entries = [entry("a", 1), entry("b", 3), entry("c", 2)];
    expect(recentResults(entries).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("returns at most 10 by default and honours a limit", () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(`e${i}`, i));
    expect(recentResults(entries)).toHaveLength(10);
    expect(recentResults(entries, 3).map((e) => e.id)).toEqual([
      "e11",
      "e10",
      "e9",
    ]);
  });

  it("leaves out the bookkeeping entries party-change and generated-saved", () => {
    const entries = [
      entry("roll", 1),
      entry("party", 2, "party-change"),
      entry("saved", 3, "generated-saved"),
      entry("npc", 4, "generated-result"),
    ];
    expect(recentResults(entries).map((e) => e.id)).toEqual(["npc", "roll"]);
  });

  it("returns nothing for an empty journal", () => {
    expect(recentResults([])).toEqual([]);
  });

  it("includes entries captured before any solo session started", () => {
    const earlier = entry("old", 1);
    expect(recentResults([earlier]).map((e) => e.id)).toEqual(["old"]);
  });
});
