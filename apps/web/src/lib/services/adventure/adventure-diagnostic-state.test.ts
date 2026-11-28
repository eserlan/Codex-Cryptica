import { describe, expect, it } from "vitest";
import {
  diagnosticState,
  diffDiagnosticState,
} from "./adventure-diagnostic-state";
import { exampleSession, quietSession } from "./test-fixtures/adventure-review";

describe("Adventure diagnostic state", () => {
  it("projects canonical state with explicit defaults for optional collections", () => {
    const session = quietSession(0);
    session.scenarioCollection = undefined;
    const state = diagnosticState(session);

    expect(state).toMatchObject({
      premise: session.premise,
      visibleState: session.visibleState,
      hiddenState: session.hiddenState,
      scenarioCollection: null,
      worldTime: null,
      places: [],
      currentPlaceId: null,
      storySoFar: null,
      oocExchanges: [],
      pendingRoll: null,
    });
    expect(state).not.toHaveProperty("turns");
    expect(state).not.toHaveProperty("packageProgress");
  });

  it("emits no diff for identical state without mutating either input", () => {
    const before = diagnosticState(exampleSession());
    const after = structuredClone(before);

    expect(diffDiagnosticState(before, after)).toEqual({});
    expect(after).toEqual(before);
  });

  it("diffs top-level collections by ID and retains additions, updates and removals", () => {
    const before = diagnosticState(exampleSession());
    before.places = [
      { id: "removed", name: "Old place" },
      { id: "updated", name: "First name" },
    ];
    const after = structuredClone(before);
    after.places = [
      { id: "updated", name: "New name" },
      { id: "added", name: "New place" },
    ];
    after.provisionalFacts = [];

    expect(diffDiagnosticState(before, after)).toEqual({
      places: {
        added: [after.places[1]],
        updated: [after.places[0]],
        removedIds: ["removed"],
      },
      provisionalFacts: { added: [], updated: [], removedIds: ["fact-1"] },
    });
  });

  it("diffs nested ID arrays and scalar fields without replacing unchanged state", () => {
    const before = diagnosticState(exampleSession());
    const after = structuredClone(before);
    after.visibleState.location = {
      id: "mill-location",
      text: "The mill",
      source: "canonical",
    };
    after.visibleState.knownFacts = [
      {
        id: "clue",
        text: "A clue",
        source: "provisional",
      },
    ];
    after.hiddenState.secrets[0].status = "revealed";
    after.scenarioCollection!.focusedScenarioId = "scenario-1";
    after.scenarioCollection!.items[0].knowledge = "heard";
    after.worldTime!.elapsedMinutes += 1;
    after.worldTime!.events = [];
    after.premise = "A new premise";
    after.currentPlaceId = "mill";

    expect(diffDiagnosticState(before, after)).toEqual({
      visibleState: {
        location: after.visibleState.location,
        knownFacts: {
          added: after.visibleState.knownFacts,
          updated: [],
          removedIds: [],
        },
      },
      hiddenState: {
        secrets: {
          added: [],
          updated: after.hiddenState.secrets,
          removedIds: [],
        },
      },
      scenarioCollection: {
        focusedScenarioId: "scenario-1",
        items: {
          added: [],
          updated: after.scenarioCollection!.items,
          removedIds: [],
        },
      },
      worldTime: {
        elapsedMinutes: 1441,
        events: { added: [], updated: [], removedIds: ["clock-event"] },
      },
      premise: "A new premise",
      currentPlaceId: "mill",
    });
  });

  it("retains full optional objects on creation and explicit nulls on removal", () => {
    const empty = diagnosticState(quietSession(0));
    empty.scenarioCollection = null;
    const populated = diagnosticState(exampleSession());

    expect(diffDiagnosticState(empty, populated)).toMatchObject({
      scenarioCollection: populated.scenarioCollection,
      worldTime: populated.worldTime,
    });
    expect(diffDiagnosticState(populated, empty)).toMatchObject({
      scenarioCollection: null,
      worldTime: null,
    });
  });
});
