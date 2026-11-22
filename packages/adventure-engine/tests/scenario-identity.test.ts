import { describe, expect, it } from "vitest";
import { validateScenarioIdentitySpace } from "../src/scenario-identity";
import { now, scenario, session } from "./reducer-fixtures";

describe("scenario identity validation", () => {
  it("accepts sessions without scenarios and matching registered secret text", () => {
    const input = session();
    expect(() => validateScenarioIdentitySpace(input)).not.toThrow();
    const item = scenario();
    input.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    input.hiddenState.secrets.push({
      id: item.secretBindings.truth,
      text: `  ${item.gmOnly.truth.toLocaleUpperCase()}  `,
      status: "hidden",
    });
    expect(() => validateScenarioIdentitySpace(input)).not.toThrow();
    input.hiddenState.secrets[0]!.text = "A different secret";
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-secret-id-collision",
    );
  });

  it("rejects scenario and event IDs already used by session records", () => {
    const input = session();
    const item = scenario();
    input.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    item.id = input.id;
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-id-collision",
    );
    item.id = "scenario-1";
    item.events = [
      {
        id: "event-1",
        kind: "discovery",
        visibility: "player",
        text: "A clue",
        at: now,
      },
    ];
    input.visibleState.knownFacts = [
      { id: "event-1", text: "A clue", source: "canonical" },
    ];
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-id-collision",
    );
  });

  it("rejects duplicate cross-scenario records and secrets bound to ordinary facts", () => {
    const input = session();
    const item = scenario();
    input.scenarioCollection = {
      version: 1,
      items: [item, structuredClone(item)],
      focusedScenarioId: null,
    };
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-id-collision",
    );
    input.scenarioCollection.items.pop();
    input.visibleState.knownFacts.push({
      id: item.secretBindings.truth,
      text: item.gmOnly.truth,
      source: "canonical",
    });
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-secret-id-collision",
    );
  });

  it("checks GM event secrets, including own bindings named __proto__", () => {
    const input = session();
    const item = scenario();
    item.events = [
      {
        id: "__proto__",
        kind: "consequence",
        visibility: "gm",
        text: "The guard is bribed",
        at: now,
      },
    ];
    item.secretBindings.eventIds = Object.fromEntries([
      ["__proto__", "event-secret"],
    ]);
    input.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    input.hiddenState.secrets = [
      { id: "event-secret", text: "The guard is bribed", status: "hidden" },
    ];
    expect(() => validateScenarioIdentitySpace(input)).not.toThrow();
    item.secretBindings.eventIds = Object.fromEntries([["__proto__", item.id]]);
    expect(() => validateScenarioIdentitySpace(input)).toThrow(
      "scenario-secret-id-collision",
    );
  });
});
