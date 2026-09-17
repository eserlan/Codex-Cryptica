import { describe, it, expect } from "vitest";
import {
  slugifyFieldKey,
  validateFieldKeyFormat,
  uniqueFieldKey,
  resolveFieldByKeyOrId,
  validateFieldKeys,
} from "./field-keys";

describe("slugifyFieldKey", () => {
  it("derives snake_case keys from labels", () => {
    expect(slugifyFieldKey("Strength")).toBe("strength");
    expect(slugifyFieldKey("Current HP")).toBe("current_hp");
    expect(slugifyFieldKey("Sanity Score!")).toBe("sanity_score");
  });

  it("prefixes keys that would start with a digit", () => {
    expect(slugifyFieldKey("5e Level")).toBe("field_5e_level");
  });

  it("falls back to a usable key for empty or symbol-only labels", () => {
    expect(slugifyFieldKey("")).toBe("field");
    expect(slugifyFieldKey("!!!")).toBe("field");
  });
});

describe("validateFieldKeyFormat", () => {
  it("accepts letters, numbers, and underscores", () => {
    expect(validateFieldKeyFormat("strength")).toBeNull();
    expect(validateFieldKeyFormat("current_hp")).toBeNull();
    expect(validateFieldKeyFormat("_private")).toBeNull();
  });

  it("rejects blanks, leading digits, dashes, spaces, and overlong keys", () => {
    expect(validateFieldKeyFormat("")).not.toBeNull();
    expect(validateFieldKeyFormat("5e")).not.toBeNull();
    expect(validateFieldKeyFormat("hit-points")).not.toBeNull();
    expect(validateFieldKeyFormat("hit points")).not.toBeNull();
    expect(validateFieldKeyFormat("a".repeat(65))).not.toBeNull();
  });
});

describe("uniqueFieldKey", () => {
  it("returns the base when unused and suffixes on collision", () => {
    expect(uniqueFieldKey("strength", [])).toBe("strength");
    expect(uniqueFieldKey("strength", ["strength"])).toBe("strength_2");
    expect(uniqueFieldKey("strength", ["strength", "strength_2"])).toBe(
      "strength_3",
    );
  });
});

describe("resolveFieldByKeyOrId", () => {
  const fields = [
    { id: "field-abc", key: "strength", label: "Strength", type: "number" },
    { id: "hp", label: "HP", type: "counter" },
  ] as any[];

  it("prefers the key and falls back to the id", () => {
    expect(resolveFieldByKeyOrId(fields, "strength")?.id).toBe("field-abc");
    expect(resolveFieldByKeyOrId(fields, "field-abc")?.id).toBe("field-abc");
    expect(resolveFieldByKeyOrId(fields, "hp")?.id).toBe("hp");
  });

  it("returns undefined for unknown or blank refs", () => {
    expect(resolveFieldByKeyOrId(fields, "old_key")).toBeUndefined();
    expect(resolveFieldByKeyOrId(fields, "  ")).toBeUndefined();
  });
});

describe("validateFieldKeys", () => {
  it("passes keyless legacy templates without errors", () => {
    expect(
      validateFieldKeys([
        { id: "field-1", label: "A" },
        { id: "field-2", label: "B" },
      ] as any[]),
    ).toEqual([]);
  });

  it("blocks exact-duplicate keys within a template", () => {
    const errors = validateFieldKeys([
      { id: "field-1", key: "hp", label: "HP" },
      { id: "field-2", key: "hp", label: "Hit Points" },
    ] as any[]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"hp"');
    expect(errors[0]).toContain("unique");
  });

  it("rejects malformed keys with the field label attached", () => {
    const errors = validateFieldKeys([
      { id: "field-1", key: "hit-points", label: "Hit Points" },
    ] as any[]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"Hit Points"');
  });
});
