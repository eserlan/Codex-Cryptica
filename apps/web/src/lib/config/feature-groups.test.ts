import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, HELP_ONLY_HINT_IDS } from "./feature-groups";
import { FEATURE_HINTS } from "./help-content";

const groupedIds = FEATURE_GROUPS.flatMap((g) => g.hintIds);

describe("feature groups", () => {
  it("accounts for every hint exactly once", () => {
    // The point of the partition: adding a hint without deciding whether it is
    // a capability or a mechanic should fail here, not silently disappear from
    // the Features page the way it would when the page mapped the whole record.
    const claimed = [...groupedIds, ...HELP_ONLY_HINT_IDS].sort();
    const all = Object.keys(FEATURE_HINTS).sort();

    expect(claimed).toEqual(all);
  });

  it("never lists the same hint in two groups", () => {
    expect(new Set(groupedIds).size).toBe(groupedIds.length);
  });

  it("points only at hints that exist", () => {
    for (const id of [...groupedIds, ...HELP_ONLY_HINT_IDS]) {
      expect(FEATURE_HINTS[id], `unknown hint id: ${id}`).toBeDefined();
    }
  });

  it("keeps the reader's order: build and connect before AI", () => {
    const order = FEATURE_GROUPS.map((g) => g.id);
    expect(order.indexOf("unstuck")).toBeGreaterThan(order.indexOf("build"));
    expect(order.indexOf("unstuck")).toBeGreaterThan(order.indexOf("connect"));
    expect(order.indexOf("unstuck")).toBeGreaterThan(order.indexOf("run"));
  });

  it("gives every group a job title and an outcome", () => {
    for (const group of FEATURE_GROUPS) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.outcome.length).toBeGreaterThan(0);
      // Sentence case, per docs/design/public-shell-grammar.md.
      expect(group.title).not.toBe(group.title.toUpperCase());
      expect(group.hintIds.length).toBeGreaterThan(0);
    }
  });

  it("has between four and six groups, per the chunk's scope", () => {
    expect(FEATURE_GROUPS.length).toBeGreaterThanOrEqual(4);
    expect(FEATURE_GROUPS.length).toBeLessThanOrEqual(6);
  });

  it("leads each group rather than showing everything at equal weight", () => {
    for (const group of FEATURE_GROUPS) {
      expect(group.leadCount).toBeGreaterThan(0);
      expect(group.leadCount).toBeLessThanOrEqual(group.hintIds.length);
      // A group that leads with everything is the wall this replaces.
      if (group.hintIds.length > 6) {
        expect(group.leadCount).toBeLessThan(group.hintIds.length);
      }
    }
  });

  it("keeps SEO prerendering off the marketing page", () => {
    // Called out in the assessment as the clearest case of an implementation
    // detail presented as a product feature.
    expect(groupedIds).not.toContain("seo-prerendering");
    expect(HELP_ONLY_HINT_IDS).toContain("seo-prerendering");
  });
});
