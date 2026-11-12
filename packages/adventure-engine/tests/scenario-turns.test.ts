import { describe, expect, it } from "vitest";
import {
  applyScenarioElaborations,
  markRevealedScenarios,
} from "../src/scenario-turns";
import type {
  CommittedAdventureTurn,
  ScenarioElaborationProposal,
  ScenarioItem,
} from "../src/types";
import {
  emptyHiddenPatch,
  emptyVisiblePatch,
  now,
  scenario,
  session,
} from "./reducer-fixtures";

const turn: CommittedAdventureTurn = {
  id: "turn-1",
  sequence: 0,
  inputId: "input-1",
  playerAction: "Listen",
  narration: "A tale",
  visiblePatch: emptyVisiblePatch(),
  hiddenPatch: emptyHiddenPatch(),
  revealedSecretIds: [],
  provisionalFactIds: [],
  sourceRecordIds: [],
  committedAt: now,
};
function candidate() {
  const current = session();
  current.scenarioCollection = {
    version: 1,
    items: [scenario()],
    focusedScenarioId: null,
  };
  return current;
}
const clue: ScenarioElaborationProposal = {
  scenarioId: "scenario-1",
  stage: "actionable-clue",
  discovery: " Tracks in the dust ",
};

describe("scenario turn progression", () => {
  it("records a lead once and then advances through consecutive elaboration stages", () => {
    const current = candidate();
    const item = current.scenarioCollection!.items[0]!;
    let id = 0;
    const createId = () => `event-${++id}`;
    expect(
      markRevealedScenarios(current, [item.id, item.id], turn, createId),
    ).toBeNull();
    expect(item.knowledge).toBe("heard");
    expect(item.events).toEqual([
      {
        id: "event-1",
        kind: "discovery",
        visibility: "player",
        text: item.playerVisible.lead,
        at: now,
        turnId: turn.id,
      },
    ]);
    expect(
      applyScenarioElaborations(current, [clue], [], turn, createId),
    ).toBeNull();
    expect(item.stage).toBe("actionable-clue");
    expect(item.events[1]?.text).toBe("Tracks in the dust");
    expect(
      applyScenarioElaborations(
        current,
        [{ ...clue, stage: "revelation-crisis", discovery: " " }],
        [],
        turn,
        createId,
      ),
    ).toBeNull();
    expect(item.events).toHaveLength(2);
    expect(
      markRevealedScenarios(current, undefined, turn, createId),
    ).toBeNull();
    expect(
      applyScenarioElaborations(current, undefined, undefined, turn, createId),
    ).toBeNull();
  });

  it("skips missing and out-of-location reveals, and rejects unrecordable ones", () => {
    const missing: string[] = [];
    expect(
      markRevealedScenarios(
        candidate(),
        ["missing"],
        turn,
        () => "new",
        missing,
      ),
    ).toBeNull();
    expect(missing).toEqual(["reveal: unknown scenario missing"]);
    const current = candidate();
    current.scenarioCollection!.items[0]!.anchorRefs = ["mill"];
    current.worldEntry = {
      version: 1,
      location: { kind: "provisional", name: "Distant town" },
      intent: "explore",
    };
    const elsewhere: string[] = [];
    expect(
      markRevealedScenarios(
        current,
        ["scenario-1"],
        turn,
        () => "new",
        elsewhere,
      ),
    ).toBeNull();
    expect(elsewhere).toHaveLength(1);
    expect(current.scenarioCollection?.items[0]?.knowledge).toBe("unheard");
    delete current.worldEntry;
    expect(markRevealedScenarios(current, ["scenario-1"], turn, () => "")).toBe(
      "Unable to record scenario discovery",
    );
    expect(current.scenarioCollection?.items[0]?.knowledge).toBe("unheard");
  });

  type Case = {
    name: string;
    item?: Partial<ScenarioItem>;
    changes?: ScenarioElaborationProposal[];
    id?: string;
  };
  const run = ({ item, changes, id }: Case) => {
    const current = candidate();
    Object.assign(
      current.scenarioCollection!.items[0]!,
      { knowledge: "heard" },
      item,
    );
    const dropped: string[] = [];
    const result = applyScenarioElaborations(
      current,
      changes ?? [clue],
      [],
      turn,
      () => id ?? "new-event",
      dropped,
    );
    return { result, dropped, scenario: current.scenarioCollection!.items[0]! };
  };

  const skipped: Array<Case & { reason: string; stage: string }> = [
    {
      name: "unknown",
      changes: [{ ...clue, scenarioId: "missing" }],
      reason: "Unknown scenario",
      stage: "hearsay",
    },
    {
      name: "closed",
      item: { status: "resolved" },
      reason: "is not open",
      stage: "hearsay",
    },
    {
      name: "unheard",
      item: { knowledge: "unheard" },
      reason: "must be heard",
      stage: "hearsay",
    },
    {
      name: "duplicate",
      changes: [clue, clue],
      reason: "repeated in one turn",
      stage: "actionable-clue",
    },
    {
      name: "skip",
      changes: [{ ...clue, stage: "revelation-crisis" }],
      reason: "Cannot skip elaboration stages",
      stage: "hearsay",
    },
    {
      name: "regression",
      item: { stage: "actionable-clue" },
      reason: "Cannot transition scenario",
      stage: "actionable-clue",
    },
  ];
  it.each(skipped)(
    "skips and records an invalid elaboration ($name)",
    (testCase) => {
      const { result, dropped, scenario } = run(testCase);
      expect(result).toBeNull();
      expect(dropped).toEqual([expect.stringContaining(testCase.reason)]);
      expect(scenario.stage).toBe(testCase.stage);
    },
  );

  const failures: Case[] = [
    { name: "allocation", id: "" },
    {
      name: "full",
      item: {
        events: Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i}`,
          kind: "discovery",
          visibility: "player",
          text: "Clue",
          at: now,
        })),
      },
    },
  ];
  it.each(failures)(
    "still fails the turn when the discovery cannot be recorded ($name)",
    (testCase) => {
      const { result, dropped } = run(testCase);
      expect(result?.ok).toBe(false);
      expect(result?.errors[0]?.code).toBe("id-allocation-failed");
      expect(dropped).toEqual([]);
    },
  );

  it("skips an elaboration of a scenario revealed this turn, leaving it untouched", () => {
    const current = candidate();
    current.scenarioCollection!.items[0]!.knowledge = "unheard";
    const newlyRevealed = new Set<string>();
    expect(
      markRevealedScenarios(
        current,
        ["scenario-1"],
        turn,
        () => "new-event",
        [],
        newlyRevealed,
      ),
    ).toBeNull();
    const before = structuredClone(current);
    const dropped: string[] = [];
    const result = applyScenarioElaborations(
      current,
      [clue],
      [...newlyRevealed],
      turn,
      () => "new-event",
      dropped,
    );
    expect(result).toBeNull();
    expect(current).toEqual(before);
    expect(dropped).toEqual([
      "elaborate: scenario-1 was revealed this turn and starts at hearsay",
    ]);
  });
});
