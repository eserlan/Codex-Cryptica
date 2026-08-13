import { describe, it, expect } from "vitest";
import { mapDraftToType, DEFAULT_MAPPING_RULES } from "../../src/cc/mapping";
import type { MappingRuleSet } from "../../src/cc/mapping";
import type { EntityDraft } from "../../src/cc/package";

const rules: MappingRuleSet = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
    { when: { pathPrefix: "/factions/" }, thenType: "faction" },
  ],
  defaultType: "note",
};

const draft = (sourceType?: string, sourcePath?: string): EntityDraft => ({
  sourceId: "1",
  sourceType,
  sourcePath,
  title: "Test",
  content: "",
  tags: [],
});

describe("mapDraftToType", () => {
  it("maps known sourceType via rule", () => {
    const r = mapDraftToType(draft("Character"), rules);
    expect(r.resolvedType).toBe("character");
    expect(r.typeFallback).toBe(false);
  });

  it("uses first-match when multiple rules could apply", () => {
    const r = mapDraftToType(draft("Location"), rules);
    expect(r.resolvedType).toBe("location");
  });

  it("maps by pathPrefix when sourceType absent", () => {
    const r = mapDraftToType(
      draft(undefined, "/factions/thieves-guild"),
      rules,
    );
    expect(r.resolvedType).toBe("faction");
    expect(r.typeFallback).toBe(false);
  });

  it("falls back to defaultType when no rule matches", () => {
    const r = mapDraftToType(draft("Deity"), rules);
    expect(r.resolvedType).toBe("note");
    expect(r.typeFallback).toBe(true);
  });

  it("falls back when sourceType is absent and no pathPrefix matches", () => {
    const r = mapDraftToType(draft(undefined, "/misc/something"), rules);
    expect(r.resolvedType).toBe("note");
    expect(r.typeFallback).toBe(true);
  });

  it("uses defaultType when rules array is empty", () => {
    const r = mapDraftToType(draft("Character"), DEFAULT_MAPPING_RULES);
    expect(r.resolvedType).toBe("note");
    expect(r.typeFallback).toBe(true);
  });
});
