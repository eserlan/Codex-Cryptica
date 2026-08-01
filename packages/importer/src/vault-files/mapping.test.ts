import { describe, it, expect } from "vitest";
import { buildVaultFilesMappingRules } from "./mapping";
import { mapDraftToType } from "../cc/mapping";
import type { EntityDraft } from "../cc/package";

function draft(overrides: Partial<EntityDraft> = {}): EntityDraft {
  return {
    sourcePath: "entities/x.md",
    title: "X",
    content: "",
    tags: [],
    ...overrides,
  };
}

describe("buildVaultFilesMappingRules", () => {
  it("resolves a built-in-looking type back to itself", () => {
    const drafts = [draft({ sourceType: "Character" })];
    const rules = buildVaultFilesMappingRules(drafts);
    const result = mapDraftToType(drafts[0], rules);
    expect(result).toEqual({ resolvedType: "Character", typeFallback: false });
  });

  it("resolves an arbitrary custom (non-built-in) type back to itself", () => {
    const drafts = [draft({ sourceType: "Ancient Relic" })];
    const rules = buildVaultFilesMappingRules(drafts);
    const result = mapDraftToType(drafts[0], rules);
    expect(result).toEqual({
      resolvedType: "Ancient Relic",
      typeFallback: false,
    });
  });

  it("produces one rule per distinct sourceType across a mixed batch", () => {
    const drafts = [
      draft({ sourceType: "Character", sourcePath: "a.md" }),
      draft({ sourceType: "Location", sourcePath: "b.md" }),
      draft({ sourceType: "Character", sourcePath: "c.md" }),
    ];
    const rules = buildVaultFilesMappingRules(drafts);
    expect(rules.rules).toHaveLength(2);

    for (const d of drafts) {
      expect(mapDraftToType(d, rules).typeFallback).toBe(false);
    }
  });

  it("falls through to defaultType 'note' when sourceType is absent", () => {
    const drafts = [draft({ sourceType: undefined })];
    const rules = buildVaultFilesMappingRules(drafts);
    const result = mapDraftToType(drafts[0], rules);
    expect(result).toEqual({ resolvedType: "note", typeFallback: true });
  });
});
