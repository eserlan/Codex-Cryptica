import { describe, expect, it } from "vitest";
import {
  determineScenePosture,
  determineSuggestedActionKinds,
  directorProgression,
} from "../src/gm-director-pacing";
import type { InvestigativePacing } from "../src/investigative-pacing";
import { rankOpenHeardScenarios } from "../src/gm-director-scenario-ranking";
import { directorTurn, heardScenario } from "./gm-director-fixtures";
import { session } from "./reducer-fixtures";

function pacing(
  overrides: Partial<InvestigativePacing> = {},
): InvestigativePacing {
  return {
    active: true,
    turnsWithoutAdvancement: 4,
    repeatedNonAnswerTurns: 3,
    stalled: true,
    recoveryDue: true,
    recommendedAngle: "alternate-route",
    ...overrides,
  };
}

describe("director pacing", () => {
  it("distinguishes opening, ordinary conversation, and active progress without recovery", () => {
    const s = session();
    expect(
      determineScenePosture(s, "opening", "open-world", undefined, 0),
    ).toBe("opening");
    expect(
      determineScenePosture(s, "action", "open-world", "Drink tea", 0),
    ).toBe("calm-conversation");
    expect(
      determineScenePosture(
        s,
        "action",
        "package-scene",
        "Inspect the gate",
        0,
      ),
    ).toBe("progressing");
    expect(determineSuggestedActionKinds("open-world", "opening", [])).toEqual([
      "converse",
      "investigate",
      "travel",
    ]);
    expect(
      determineSuggestedActionKinds("open-world", "calm-conversation", []),
    ).toEqual(["converse", "travel", "wait"]);
    expect(
      determineSuggestedActionKinds("package-scene", "progressing", []),
    ).toEqual(["investigate", "intervene", "travel"]);
  });

  it("prioritizes a dialogue loop over other recovery signals", () => {
    const s = session();
    s.turns = Array.from({ length: 3 }, (_, i) =>
      directorTurn(
        i + 1,
        "Who owns the debt in the ledger?",
        "I don't know who owns that debt.",
      ),
    );
    expect(
      determineScenePosture(
        s,
        "action",
        "active-pursuit",
        "Who owns the ledger debt?",
        1,
        pacing(),
      ),
    ).toBe("dialogue-loop");
    expect(
      determineSuggestedActionKinds("active-pursuit", "dialogue-loop", []),
    ).toEqual(["investigate", "travel", "walk-away"]);
  });

  it("suppresses investigative stall after a dialogue topic switch", () => {
    const s = session();
    s.turns = Array.from({ length: 3 }, (_, i) =>
      directorTurn(
        i + 1,
        "Ask about the ledger debt",
        "I don't know who owns that debt.",
      ),
    );
    expect(
      determineScenePosture(
        s,
        "action",
        "open-world",
        "Ask about the tea",
        0,
        pacing(),
      ),
    ).toBe("calm-conversation");
  });

  it("requires investigation context for a quiet-scene stall and respects disengagement", () => {
    const s = session();
    s.turns = Array.from({ length: 4 }, (_, i) =>
      directorTurn(i + 1, "Inspect the gate", "The wind rustles the trees."),
    );
    expect(
      determineScenePosture(s, "action", "open-world", "Inspect the gate", 0),
    ).toBe("calm-conversation");
    s.visibleState.situation = {
      id: "mystery",
      text: "A missing bell",
      source: "provisional",
    };
    expect(
      determineScenePosture(s, "action", "open-world", "Inspect the gate", 0),
    ).toBe("stalled-investigation");
    expect(
      determineScenePosture(s, "action", "open-world", "Walk away", 0),
    ).toBe("calm-conversation");
  });

  it("tailors actions to travel, an on-site crisis, and investigative recovery", () => {
    const item = heardScenario("bell", {
      stage: "revelation-crisis",
      anchorRefs: ["tower"],
    });
    const s = session();
    const remote = rankOpenHeardScenarios([item], s, "bronze bell", {
      name: "Quay",
      recordId: "quay",
    }).pursued;
    const onSite = rankOpenHeardScenarios([item], s, "bronze bell", {
      name: "Tower",
      recordId: "tower",
    }).pursued;
    expect(
      determineSuggestedActionKinds("active-pursuit", "progressing", remote),
    ).toEqual(["travel", "investigate", "converse"]);
    expect(
      determineSuggestedActionKinds("active-pursuit", "progressing", onSite),
    ).toEqual(["intervene", "converse", "walk-away"]);
    expect(
      determineSuggestedActionKinds(
        "active-pursuit",
        "stalled-investigation",
        onSite,
      ),
    ).toEqual(["investigate", "intervene", "walk-away"]);
    expect(
      determineSuggestedActionKinds(
        "active-pursuit",
        "progressing",
        remote,
        pacing({ recoveryDue: false, repeatedNonAnswerTurns: 2 }),
      ),
    ).toEqual(["investigate", "travel", "walk-away"]);
  });

  it("emits progression only for recovery or repeated non-answers in an active mode", () => {
    expect(
      directorProgression(pacing(), "stalled-investigation", "active-pursuit"),
    ).toEqual({
      turnsWithoutAdvancement: 4,
      repeatedNonAnswerTurns: 3,
      recommendedAngle: "alternate-route",
    });
    expect(
      directorProgression(pacing(), "calm-conversation", "open-world"),
    ).toBeUndefined();
    expect(
      directorProgression(undefined, "progressing", "active-pursuit"),
    ).toBeUndefined();
    expect(
      directorProgression(
        pacing({ recoveryDue: false, repeatedNonAnswerTurns: 1 }),
        "progressing",
        "active-pursuit",
      ),
    ).toBeUndefined();
    expect(
      directorProgression(
        pacing({ recoveryDue: false, recommendedAngle: undefined }),
        "progressing",
        "active-pursuit",
      ),
    ).toEqual({ turnsWithoutAdvancement: 4, repeatedNonAnswerTurns: 3 });
  });
});
