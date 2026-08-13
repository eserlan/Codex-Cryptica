import { describe, it, expect } from "vitest";
import { resolveFamilyAlias } from "./family-aliases";

describe("resolveFamilyAlias", () => {
  it("resolves parent aliases", () => {
    expect(resolveFamilyAlias("Mother of")).toEqual({
      type: "parent_of",
      label: "Mother",
    });
    expect(resolveFamilyAlias("father of the queen")).toEqual({
      type: "parent_of",
      label: "Father",
    });
    expect(resolveFamilyAlias("Parent of")).toEqual({
      type: "parent_of",
      label: "Parent",
    });
  });

  it("resolves child aliases", () => {
    expect(resolveFamilyAlias("son of")).toEqual({
      type: "child_of",
      label: "Son",
    });
    expect(resolveFamilyAlias("Daughter of the king")).toEqual({
      type: "child_of",
      label: "Daughter",
    });
  });

  it("resolves spouse aliases", () => {
    expect(resolveFamilyAlias("husband of")).toEqual({
      type: "spouse_of",
      label: "Husband",
    });
    expect(resolveFamilyAlias("wife of")).toEqual({
      type: "spouse_of",
      label: "Wife",
    });
    expect(resolveFamilyAlias("married to")).toEqual({
      type: "spouse_of",
      label: "Spouse",
    });
  });

  it("resolves sibling aliases", () => {
    expect(resolveFamilyAlias("brother of")).toEqual({
      type: "sibling_of",
      label: "Brother",
    });
    expect(resolveFamilyAlias("sister of")).toEqual({
      type: "sibling_of",
      label: "Sister",
    });
  });

  it("is case-insensitive and tolerates leading/trailing whitespace", () => {
    expect(resolveFamilyAlias("  MOTHER OF  ")).toEqual({
      type: "parent_of",
      label: "Mother",
    });
  });

  it("does not match a bare relationship word without a directional suffix", () => {
    // Ambiguous without "of"/"to": elsewhere in the app a bare word describes
    // the TARGET's role, the opposite direction from these phrases.
    expect(resolveFamilyAlias("parent")).toBeNull();
    expect(resolveFamilyAlias("mother")).toBeNull();
    expect(resolveFamilyAlias("spouse")).toBeNull();
  });

  it("does not match unrelated words sharing a prefix", () => {
    expect(resolveFamilyAlias("mothership")).toBeNull();
    expect(resolveFamilyAlias("fatherland")).toBeNull();
    expect(resolveFamilyAlias("sonar array")).toBeNull();
  });

  it("returns null for non-matching or empty phrases", () => {
    expect(resolveFamilyAlias("ally")).toBeNull();
    expect(resolveFamilyAlias("rival of")).toBeNull();
    expect(resolveFamilyAlias("")).toBeNull();
    expect(resolveFamilyAlias("   ")).toBeNull();
  });
});
