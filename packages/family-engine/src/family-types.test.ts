import { describe, it, expect } from "vitest";
import {
  FAMILY_CONNECTION_TYPES,
  isFamilyType,
  inverseFamilyType,
} from "./family-types";

describe("FAMILY_CONNECTION_TYPES", () => {
  it("contains exactly the initial family kinds", () => {
    expect([...FAMILY_CONNECTION_TYPES].sort()).toEqual([
      "child_of",
      "parent_of",
      "sibling_of",
      "spouse_of",
    ]);
  });
});

describe("isFamilyType", () => {
  it.each(["parent_of", "child_of", "spouse_of", "sibling_of"])(
    "returns true for family type %s",
    (type) => {
      expect(isFamilyType(type)).toBe(true);
    },
  );

  it.each(["neutral", "knows", "owns", "custom_bond", ""])(
    "returns false for non-family type %s",
    (type) => {
      expect(isFamilyType(type)).toBe(false);
    },
  );
});

describe("inverseFamilyType", () => {
  it("maps parent_of <-> child_of", () => {
    expect(inverseFamilyType("parent_of")).toBe("child_of");
    expect(inverseFamilyType("child_of")).toBe("parent_of");
  });

  it("treats spouse_of and sibling_of as symmetric", () => {
    expect(inverseFamilyType("spouse_of")).toBe("spouse_of");
    expect(inverseFamilyType("sibling_of")).toBe("sibling_of");
  });

  it("is an involution (inverse of inverse is identity)", () => {
    for (const t of FAMILY_CONNECTION_TYPES) {
      expect(inverseFamilyType(inverseFamilyType(t))).toBe(t);
    }
  });
});
