import { describe, expect, it } from "vitest";
import { worldEntrySchema } from "../src/world-entry-schema";

describe("world entry schema", () => {
  it("keeps custom calendar dates and either kind of starting location", () => {
    const entry = {
      version: 1,
      location: { kind: "canonical", recordId: "mill", name: "Mill" },
      at: { year: -20, month: 13, day: 400, precision: "day" },
      intent: "explore",
    };
    expect(worldEntrySchema.parse(entry)).toEqual(entry);
    expect(
      worldEntrySchema.parse({
        ...entry,
        location: { kind: "provisional", name: "Road" },
      }).location.kind,
    ).toBe("provisional");
  });

  it("rejects zero calendar units and extra location metadata", () => {
    const entry = {
      version: 1,
      location: { kind: "provisional", name: "Road" },
      intent: "scene",
    };
    expect(
      worldEntrySchema.safeParse({ ...entry, at: { year: 1, month: 0 } })
        .success,
    ).toBe(false);
    expect(
      worldEntrySchema.safeParse({
        ...entry,
        location: { ...entry.location, extra: true },
      }).success,
    ).toBe(false);
  });
});
