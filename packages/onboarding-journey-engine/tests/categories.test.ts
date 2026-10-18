import { describe, expect, it } from "bun:test";
import { milestoneMatches, stepInstruction } from "../src/categories";
import { applyMilestone, startJourney } from "../src/progress";
import { connected, created, defaults, fixture } from "./fixtures";

const place = fixture.steps[0]!;

describe("category requirements", () => {
  it("matches only a required category that exists", () => {
    expect(
      milestoneMatches(place.completeOn, created("location"), defaults),
    ).toBe(true);
    expect(
      milestoneMatches(place.completeOn, created("character"), defaults),
    ).toBe(false);
  });

  it("accepts any new entry when the vault has none of the categories", () => {
    const ctx = { availableCategories: new Set(["planet"]) };
    expect(milestoneMatches(place.completeOn, created("planet"), ctx)).toBe(
      true,
    );
    expect(stepInstruction(place, ctx)).toBe("Add any entry.");
    const p = applyMilestone(
      startJourney(fixture, 100),
      fixture,
      created("planet"),
      ctx,
    );
    // Both category steps resolve to "any entry", so one entry completes both.
    expect(p.completed).toContain("add-place");
  });

  it("uses the normal instruction when a category exists", () => {
    expect(stepInstruction(place, defaults)).toBe("Add a place.");
    expect(stepInstruction(fixture.steps[2]!, defaults)).toBe("Connect them.");
  });

  it("never matches a different milestone kind", () => {
    expect(milestoneMatches(place.completeOn, connected(), defaults)).toBe(
      false,
    );
    expect(
      milestoneMatches(
        { kind: "entry-created" },
        created("anything"),
        defaults,
      ),
    ).toBe(true);
  });
});
