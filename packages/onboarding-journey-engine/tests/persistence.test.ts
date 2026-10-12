import { describe, expect, it } from "bun:test";
import { parseProgress, serializeProgress } from "../src/persistence";
import { applyMilestone, startJourney } from "../src/progress";
import { created, defaults, fixture } from "./fixtures";

const sample = () =>
  applyMilestone(
    startJourney(fixture, 100),
    fixture,
    created("location"),
    defaults,
  );

describe("persistence", () => {
  it("round-trips through JSON", () => {
    const p = sample();
    expect(parseProgress(serializeProgress(p), fixture)).toEqual(p);
    expect(parseProgress(JSON.parse(serializeProgress(p)), fixture)).toEqual(p);
  });

  it("writes only the allowed keys (no names, text or ids)", () => {
    const withExtra = { ...sample(), title: "Secret Keep", entityId: "e1" };
    const keys = Object.keys(JSON.parse(serializeProgress(withExtra))).sort();
    expect(keys).toEqual(
      [
        "completed",
        "journeyId",
        "journeyVersion",
        "outcome",
        "schema",
        "skipped",
        "startedAt",
        "viewing",
      ].sort(),
    );
  });

  it("discards malformed input without throwing", () => {
    for (const raw of [
      "{nope",
      null,
      undefined,
      42,
      "[]",
      { schema: 2, journeyId: "worldbuilder" },
      { ...sample(), journeyId: "writer" },
      { ...sample(), startedAt: "yesterday" },
      { ...sample(), completed: "add-place" },
      { ...sample(), outcome: "paused" },
    ]) {
      expect(parseProgress(raw, fixture)).toBeNull();
    }
  });

  it("migrates an older version: drops unknown steps and a dangling viewing", () => {
    const old = {
      ...sample(),
      journeyVersion: 1,
      completed: ["add-place", "gone-step", "add-place"],
      skipped: ["old-skip", "add-place"],
      viewing: "gone-step",
    };
    expect(parseProgress(old, fixture)).toEqual({
      ...sample(),
      journeyVersion: 2,
      completed: ["add-place"],
      skipped: [],
      viewing: null,
    });
  });

  it("marks a running record finished when nothing is left after migration", () => {
    const all = {
      ...sample(),
      completed: fixture.steps.map((s) => s.id),
    };
    expect(parseProgress(all, fixture)?.outcome).toBe("finished");
  });
});
