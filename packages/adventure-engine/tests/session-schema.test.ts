import { describe, expect, it } from "vitest";
import {
  adventureSessionSchema,
  MAX_OOC_EXCHANGES,
  MAX_STORY_SO_FAR_CHARS,
} from "../src/session-schema";
import { now, session } from "./reducer-fixtures";

describe("session schema composition", () => {
  it("defaults additive records and preserves independently parsed artwork", () => {
    const input = {
      ...session(),
      dicePresets: undefined,
      resourceCounters: undefined,
      dismissedProvisionalFactIds: undefined,
      people: [{ id: "guide", name: "Guide" }],
      artwork: { future: true },
    };
    const parsed = adventureSessionSchema.parse(input);
    expect(parsed.dicePresets).toEqual([]);
    expect(parsed.resourceCounters).toEqual([]);
    expect(parsed.dismissedProvisionalFactIds).toEqual([]);
    expect(parsed.people?.[0]).toMatchObject({
      aliases: [],
      linkedFactIds: [],
    });
    expect(parsed.artwork).toEqual({ future: true });
  });

  it("rejects unknown session fields and overlong summaries", () => {
    expect(
      adventureSessionSchema.safeParse({ ...session(), extra: true }).success,
    ).toBe(false);
    const summary = {
      text: "x".repeat(MAX_STORY_SO_FAR_CHARS),
      throughSequence: 0,
      updatedAt: now,
    };
    expect(
      adventureSessionSchema.parse({ ...session(), storySoFar: summary })
        .storySoFar,
    ).toEqual(summary);
    expect(
      adventureSessionSchema.safeParse({
        ...session(),
        storySoFar: { ...summary, text: `${summary.text}x` },
      }).success,
    ).toBe(false);
  });

  it("bounds out-of-character exchanges", () => {
    const exchange = {
      id: "question-1",
      kind: "ooc",
      question: "Where?",
      status: "pending",
      afterTurnCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    expect(
      adventureSessionSchema.parse({ ...session(), oocExchanges: [exchange] })
        .oocExchanges,
    ).toEqual([exchange]);
    expect(
      adventureSessionSchema.safeParse({
        ...session(),
        oocExchanges: Array(MAX_OOC_EXCHANGES + 1).fill(exchange),
      }).success,
    ).toBe(false);
  });
});
