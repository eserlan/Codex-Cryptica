import { describe, expect, it } from "bun:test";
import { FEATURE_REGISTRY, QUICK_PROMPT_SETS } from "help-engine";
import { TIP_CATALOGUE, TIP_LABEL_MAX, type Tip } from "../src/tips";

const GOALS = ["world", "story", "campaign"] as const;

describe("tip catalogue integrity (FR-016, FR-020, SC-006)", () => {
  it("has unique, kebab-case ids", () => {
    const ids = TIP_CATALOGUE.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("keeps every label within the chip length", () => {
    for (const tip of TIP_CATALOGUE) {
      expect(tip.label.length).toBeGreaterThan(0);
      expect(tip.label.length).toBeLessThanOrEqual(TIP_LABEL_MAX);
    }
  });

  it("gives each goal at least one tip and only known goals", () => {
    for (const goal of GOALS) {
      expect(TIP_CATALOGUE.some((t) => t.goal === goal)).toBe(true);
    }
    for (const tip of TIP_CATALOGUE) expect(GOALS).toContain(tip.goal);
  });

  it("points every tip at a registered feature", () => {
    const featureIds = new Set(FEATURE_REGISTRY.map((f) => f.id));
    for (const tip of TIP_CATALOGUE) {
      expect(featureIds.has(tip.featureId)).toBe(true);
    }
  });

  it("uses a verified quick prompt from the tip's own area", () => {
    for (const tip of TIP_CATALOGUE) {
      // Quick-prompt set ids are the help area names (see quick-prompts/index.ts).
      const set = QUICK_PROMPT_SETS.find((s) => s.id === tip.area);
      expect(set).toBeDefined();
      expect(set!.prompts).toContain(tip.prompt);
    }
  });

  it("rejects a prompt that is not in the tip's area set (negative case)", () => {
    const drifted: Tip = { ...TIP_CATALOGUE[0]!, prompt: "Make me a faction!" };
    const set = QUICK_PROMPT_SETS.find((s) => s.id === drifted.area);
    expect(set!.prompts).not.toContain(drifted.prompt);
  });
});
