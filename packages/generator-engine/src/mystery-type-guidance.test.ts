import { describe, expect, it } from "vitest";
import {
  allowedThirdRevelationKinds,
  expectedThirdRevelationKind,
  mysteryTypeGuidance,
} from "./mystery-type-guidance";

describe("mystery type guidance", () => {
  it.each([
    ["Theft", "item"],
    ["Murder", "method"],
    ["Disappearance", "fate"],
    ["Conspiracy", "objective"],
    ["Strange phenomenon", "cause"],
    ["Other", "mechanism"],
  ])("keeps %s validation and prompts aligned", (type, kind) => {
    const input = ` ${type.toUpperCase()} `;
    expect(expectedThirdRevelationKind(input)).toBe(kind);
    expect(allowedThirdRevelationKinds(input)).toContain(kind);
    expect(allowedThirdRevelationKinds(input)).toContain("item");
    expect(mysteryTypeGuidance(input).revelationKind).toBe(kind);
    expect(mysteryTypeGuidance(input).clueGuidance).toContain(
      "keyItemLocationId",
    );
  });
  it("uses neutral guidance for unknown types and does not accept theft-only kinds for murder", () => {
    expect(mysteryTypeGuidance("unknown")).toEqual(
      mysteryTypeGuidance("Other"),
    );
    expect(allowedThirdRevelationKinds("Murder")).not.toContain("victim");
    expect(mysteryTypeGuidance("Other").keyItemDesc).toContain(
      "do not default to theft",
    );
  });
});
