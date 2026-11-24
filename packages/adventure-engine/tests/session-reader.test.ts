import { describe, expect, it } from "vitest";
import {
  parseAdventureSession,
  parseAdventureSessionForRecovery,
} from "../src/session-reader";
import { MAX_DURABLE_STATE_CHARS } from "../src/session-budget";
import { now, scenario, session } from "./reducer-fixtures";

function legacyRecoveryDocument() {
  const input = {
    ...session(),
    schemaVersion: 2,
    scenarioState: {
      ...scenario(),
      events: Array.from({ length: 50 }, (_, index) => ({
        id: `gm-${index}`,
        kind: "discovery",
        visibility: "gm",
        text: "A brief clue",
        at: now,
      })),
    },
  };
  input.scenarioState.events = Array.from({ length: 100 }, (_, index) => ({
    id: `gm-${index}`,
    kind: "discovery",
    visibility: "gm",
    text: "e".repeat(600),
    at: now,
  }));
  input.visibleState.knownFacts = Array.from({ length: 60 }, (_, index) => ({
    id: `fact-${index}`,
    text: "x".repeat(600),
    source: "provisional",
  }));
  input.visibleState.objectives = Array.from({ length: 20 }, (_, index) => ({
    id: `obj-${index}`,
    text: "y".repeat(600),
    source: "provisional",
  }));
  input.visibleState.activeCharacters = Array.from(
    { length: 30 },
    (_, index) => ({
      id: `char-${index}`,
      text: "z".repeat(600),
      source: "provisional",
    }),
  );
  input.visibleState.relationships = Array.from({ length: 40 }, (_, index) => ({
    id: `rel-${index}`,
    text: "r".repeat(600),
    source: "provisional",
    subjectId: `char-${index % 30}`,
    disposition: "d".repeat(600),
  }));
  input.hiddenState.secrets = Array.from({ length: 38 }, (_, index) => ({
    id: `sec-${index}`,
    text: "s".repeat(600),
    revealCondition: "c".repeat(600),
    status: "hidden",
  }));
  input.hiddenState.gmThreads = Array.from({ length: 40 }, (_, index) => ({
    id: `thr-${index}`,
    text: "t".repeat(600),
    revealCondition: "g".repeat(600),
    status: "hidden",
  }));
  const legacyLength = () =>
    JSON.stringify({
      visibleState: input.visibleState,
      hiddenState: input.hiddenState,
      provisionalFacts: input.provisionalFacts,
      scenarioState: input.scenarioState,
    }).length;
  let excess = legacyLength() - MAX_DURABLE_STATE_CHARS;
  for (const fact of input.visibleState.knownFacts.toReversed()) {
    const reduction = Math.min(excess, 599);
    fact.text = fact.text.slice(reduction);
    excess -= reduction;
    if (excess === 0) break;
  }
  expect(legacyLength()).toBe(MAX_DURABLE_STATE_CHARS);
  return input;
}

describe("session reader", () => {
  it("returns writable validated sessions without mutating input", () => {
    const input = session();
    expect(parseAdventureSession(input)).toEqual(input);
    expect(parseAdventureSession(input)).not.toBe(input);
    expect(parseAdventureSessionForRecovery(input)).toEqual({
      mode: "writable",
      session: input,
    });
  });

  it("rejects schema and identity failures through both readers", () => {
    const input = session();
    const item = { ...scenario(), id: input.id };
    input.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    for (const parse of [
      parseAdventureSession,
      parseAdventureSessionForRecovery,
    ]) {
      expect(() => parse({})).toThrow("invalid-adventure-session-version");
      expect(() => parse(input)).toThrow("scenario-id-collision");
    }
  });

  it("recovers only legacy documents whose original state still fits", () => {
    const input = legacyRecoveryDocument();
    const before = structuredClone(input);
    expect(() => parseAdventureSession(input)).toThrow("state-budget-exceeded");
    const result = parseAdventureSessionForRecovery(input);
    expect(result.mode).toBe("legacy-read-only-recovery");
    if (result.mode !== "legacy-read-only-recovery")
      throw new Error("Expected recovery");
    expect(result.exportDocument).toEqual(input);
    expect(result.exportDocument).not.toBe(input);
    expect(input).toEqual(before);
    expect(() => parseAdventureSessionForRecovery(result.session)).toThrow(
      "state-budget-exceeded",
    );
    input.visibleState.knownFacts.at(-1)!.text += "x";
    expect(() => parseAdventureSessionForRecovery(input)).toThrow(
      "state-budget-exceeded",
    );
  });

  it("loads durable sessions beyond 48k when within MAX_DURABLE_STATE_CHARS", () => {
    const input = session();
    input.visibleState.knownFacts = Array.from({ length: 60 }, (_, index) => ({
      id: `long-fact-${index}`,
      text: "x".repeat(580),
      source: "provisional" as const,
    }));
    input.visibleState.objectives = Array.from({ length: 20 }, (_, index) => ({
      id: `long-obj-${index}`,
      text: "y".repeat(580),
      source: "provisional" as const,
    }));
    expect(parseAdventureSession(input)).toEqual(input);
  });
});
