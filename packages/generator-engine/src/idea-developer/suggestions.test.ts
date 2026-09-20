import { describe, expect, it } from "vitest";
import {
  GENERATOR_CATALOGUE,
  DEFAULT_GENERATOR_KEYS,
} from "./generator-catalogue";
import { normaliseSuggestions } from "./suggestions";
import { GENERATOR_SUGGESTIONS_MAX, GENERATOR_SUGGESTIONS_MIN } from "./types";

const s = (generatorKey: string, reason = `Because ${generatorKey}.`) => ({
  generatorKey,
  reason,
});

describe("normaliseSuggestions", () => {
  it("drops keys that are not in the catalogue", () => {
    const result = normaliseSuggestions([
      s("faction"),
      s("zzz"),
      s("settlement"),
    ]);
    expect(result.map((r) => r.generatorKey)).toEqual([
      "faction",
      "settlement",
    ]);
  });

  it("keeps the model's reason text", () => {
    const [first] = normaliseSuggestions([
      s("faction", "Two clans clash."),
      s("npc"),
    ]);
    expect(first.reason).toBe("Two clans clash.");
  });

  it("removes duplicates, keeping the first", () => {
    const result = normaliseSuggestions([
      s("faction", "one"),
      s("faction", "two"),
      s("npc"),
    ]);
    expect(result.filter((r) => r.generatorKey === "faction")).toHaveLength(1);
    expect(result[0].reason).toBe("one");
  });

  it("tops up to the minimum from the default set without duplicates", () => {
    const result = normaliseSuggestions([s("rumour")]);
    expect(result.length).toBe(GENERATOR_SUGGESTIONS_MIN);
    expect(new Set(result.map((r) => r.generatorKey)).size).toBe(result.length);
    expect(result[0].generatorKey).toBe("rumour");
  });

  it("falls back to the whole default set when nothing valid is left", () => {
    const result = normaliseSuggestions([s("zzz"), s("nope")]);
    expect(result.map((r) => r.generatorKey)).toEqual(DEFAULT_GENERATOR_KEYS);
    for (const r of result) expect(r.reason.length).toBeGreaterThan(0);
  });

  it("falls back to the default set for an empty list", () => {
    expect(normaliseSuggestions([]).map((r) => r.generatorKey)).toEqual(
      DEFAULT_GENERATOR_KEYS,
    );
  });

  it("caps the list at the maximum", () => {
    const all = GENERATOR_CATALOGUE.map((g) => s(g.key));
    const result = normaliseSuggestions(all);
    expect(result.length).toBeLessThanOrEqual(GENERATOR_SUGGESTIONS_MAX);
  });
});
