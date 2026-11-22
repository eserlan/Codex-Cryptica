import { describe, expect, it } from "vitest";
import {
  actorEventProposalSchema,
  MAX_ACTOR_FACT_CHARS,
  packageEventProposalSchema,
  packageProgressSchema,
  sourcePackageRefSchema,
} from "../src/package-progress-schemas";

describe("package progress schemas", () => {
  it("preserves opaque package IDs and validates proposal notes", () => {
    const event = {
      recordId: ` ${"x".repeat(200)} `,
      kind: "scene",
      to: "active",
      certainty: "confirmed",
      note: " Arrived ",
    };
    expect(packageEventProposalSchema.parse(event)).toEqual({
      ...event,
      note: "Arrived",
    });
    expect(
      packageEventProposalSchema.safeParse({ ...event, recordId: "" }).success,
    ).toBe(false);
    expect(
      packageEventProposalSchema.safeParse({ ...event, note: " " }).success,
    ).toBe(false);
  });

  it("accepts legacy scene progress and requires complete versioned metadata", () => {
    expect(packageProgressSchema.parse({ sceneId: " yard " })).toEqual({
      sceneId: " yard ",
    });
    const progress = {
      sceneId: "yard",
      version: 1,
      records: [],
      events: [],
      actors: [
        {
          actorId: "guide",
          status: "unknown",
          disposition: "neutral",
          facts: [],
        },
      ],
      actorEvents: [
        {
          id: "event-1",
          turnId: "turn-1",
          actorId: "guide",
          status: "present",
          certainty: "confirmed",
          note: "Arrived",
        },
      ],
    };
    expect(packageProgressSchema.parse(progress)).toEqual(progress);
    for (const key of ["version", "records", "events"] as const) {
      const incomplete = { ...progress, [key]: undefined };
      expect(packageProgressSchema.safeParse(incomplete).success).toBe(false);
    }
    expect(
      packageProgressSchema.safeParse({ sceneId: "yard", actors: [] }).success,
    ).toBe(false);
  });

  it("bounds actor facts and rejects malformed source hashes", () => {
    const event = {
      actorId: "guide",
      fact: "x".repeat(MAX_ACTOR_FACT_CHARS),
      certainty: "claimed",
      note: "Remembered",
    };
    expect(actorEventProposalSchema.parse(event)).toEqual(event);
    expect(
      actorEventProposalSchema.safeParse({ ...event, fact: `${event.fact}x` })
        .success,
    ).toBe(false);
    const pin = {
      packageId: "road",
      version: "1",
      formatVersion: "adventure-json/v1",
      hash: "a".repeat(64),
    };
    expect(sourcePackageRefSchema.parse(pin)).toEqual(pin);
    expect(
      sourcePackageRefSchema.safeParse({ ...pin, hash: "bad" }).success,
    ).toBe(false);
  });
});
