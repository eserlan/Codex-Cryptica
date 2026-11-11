import { describe, expect, it } from "vitest";
import {
  applyScenarioElaborations,
  markRevealedScenarios,
} from "../src/scenario-turns";
import type {
  CommittedAdventureTurn,
  ScenarioElaborationProposal,
  ScenarioItem,
  AdventureValidationError,
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
    expect(item.events).toHaveLength(3);
    expect(item.events[2]).toMatchObject({
      kind: "stage-change",
      visibility: "gm",
      turnId: turn.id,
    });
    expect(
      markRevealedScenarios(current, undefined, turn, createId),
    ).toBeNull();
    expect(
      applyScenarioElaborations(current, undefined, undefined, turn, createId),
    ).toBeNull();
  });

  it("rejects missing, out-of-location, and unrecordable discoveries", () => {
    expect(
      markRevealedScenarios(candidate(), ["missing"], turn, () => "new"),
    ).toBe("Unknown scenario: missing");
    const current = candidate();
    current.scenarioCollection!.items[0]!.anchorRefs = ["mill"];
    current.worldEntry = {
      version: 1,
      location: { kind: "provisional", name: "Distant town" },
      intent: "explore",
    };
    expect(
      markRevealedScenarios(current, ["scenario-1"], turn, () => "new"),
    ).not.toBeNull();
    delete current.worldEntry;
    expect(markRevealedScenarios(current, ["scenario-1"], turn, () => "")).toBe(
      "Unable to record scenario discovery",
    );
    expect(current.scenarioCollection?.items[0]?.knowledge).toBe("unheard");
  });

  const failures: Array<{
    name: string;
    item?: Partial<ScenarioItem>;
    changes?: ScenarioElaborationProposal[];
    revealed?: string[];
    id?: string;
    code: AdventureValidationError["code"];
  }> = [
    {
      name: "unknown",
      changes: [{ ...clue, scenarioId: "missing" }],
      code: "unknown-fact",
    },
    {
      name: "closed",
      item: { status: "resolved" },
      code: "invalid-transition",
    },
    {
      name: "discovered",
      revealed: ["scenario-1"],
      code: "invalid-transition",
    },
    {
      name: "unheard",
      item: { knowledge: "unheard" },
      code: "invalid-transition",
    },
    { name: "duplicate", changes: [clue, clue], code: "invalid-transition" },
    {
      name: "skip",
      changes: [{ ...clue, stage: "revelation-crisis" }],
      code: "invalid-transition",
    },
    {
      name: "regression",
      item: { stage: "actionable-clue" },
      code: "invalid-transition",
    },
    { name: "allocation", id: "", code: "id-allocation-failed" },
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
      code: "id-allocation-failed",
    },
  ];
  it.each(failures)(
    "rejects invalid elaboration ($name)",
    ({ item, changes, revealed, id, code }) => {
      const current = candidate();
      Object.assign(
        current.scenarioCollection!.items[0]!,
        { knowledge: "heard" },
        item,
      );
      const result = applyScenarioElaborations(
        current,
        changes ?? [clue],
        revealed ?? [],
        turn,
        () => id ?? "new-event",
      );
      expect(result?.ok).toBe(false);
      expect(result?.errors[0]?.code).toBe(code);
    },
  );
});
