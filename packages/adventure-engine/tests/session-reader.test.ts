import { describe, expect, it } from "vitest";
import {
  parseAdventureSession,
  parseAdventureSessionForRecovery,
} from "../src/session-reader";
import { MAX_SERIALIZED_STATE_CHARS } from "../src/session-budget";
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
  input.visibleState.knownFacts = Array.from({ length: 50 }, (_, index) => ({
    id: `fact-${index}`,
    text: "x".repeat(600),
    source: "provisional",
  }));
  const legacyLength = () =>
    JSON.stringify({
      visibleState: input.visibleState,
      hiddenState: input.hiddenState,
      provisionalFacts: input.provisionalFacts,
      scenarioState: input.scenarioState,
    }).length;
  let excess = legacyLength() - MAX_SERIALIZED_STATE_CHARS;
  for (const fact of input.visibleState.knownFacts.toReversed()) {
    const reduction = Math.min(excess, 599);
    fact.text = fact.text.slice(reduction);
    excess -= reduction;
    if (excess === 0) break;
  }
  expect(legacyLength()).toBe(MAX_SERIALIZED_STATE_CHARS);
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
});
