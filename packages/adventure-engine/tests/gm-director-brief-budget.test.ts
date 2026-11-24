import { describe, expect, it } from "vitest";
import { enforceBriefBudget } from "../src/gm-director-brief-budget";
import type {
  GMDirectorBrief,
  DirectorPursuedScenario,
} from "../src/gm-director-brief-contract";

function pursued(scenarioId = "primary"): DirectorPursuedScenario {
  return {
    scenarioId,
    provenance: "player-action",
    confidence: "high",
    stage: "hearsay",
    gmTruthRef: {
      secretId: "truth",
      truth: "Established truth",
      truthRevealed: false,
    },
    established: {
      knownPlayerFacts: [],
      latestConsequentialEvents: [],
      actors: [],
    },
    potential: { openUncertainties: [], nextDevelopmentKinds: [] },
  };
}

function brief(): GMDirectorBrief {
  return {
    advisory: true,
    mode: "active-pursuit",
    scenePosture: "progressing",
    pursuedScenarios: [pursued()],
    otherOpenHeardScenarioIds: [],
    suggestedActionKinds: ["investigate", "converse", "walk-away"],
  };
}

const size = (value: GMDirectorBrief) => JSON.stringify(value).length;

describe("director brief budget", () => {
  it("keeps a fitting brief unchanged and refuses an impossible budget without clipping truth", () => {
    const value = brief();
    const before = structuredClone(value);
    expect(enforceBriefBudget(value, size(value))).toBe(value);
    expect(value).toEqual(before);
    expect(enforceBriefBudget(value, size(value) - 1)).toBeUndefined();
    expect(value.pursuedScenarios[0]!.gmTruthRef).toEqual(
      before.pursuedScenarios[0]!.gmTruthRef,
    );
    expect(enforceBriefBudget(brief(), 0)).toBeUndefined();
  });

  it("sheds progression first and preserves the secondary scenario ID when demoting it", () => {
    const value = brief();
    value.pursuedScenarios.push(pursued("secondary"));
    value.otherOpenHeardScenarioIds = Array.from(
      { length: 6 },
      (_, i) => `other-${i}`,
    );
    const withoutProgression = structuredClone(value);
    value.progression = {
      turnsWithoutAdvancement: 4,
      repeatedNonAnswerTurns: 3,
    };
    expect(enforceBriefBudget(value, size(withoutProgression))).toEqual(
      withoutProgression,
    );

    expect(enforceBriefBudget(value, size(value) - 1)).toBe(value);
    expect(value.pursuedScenarios.map((entry) => entry.scenarioId)).toEqual([
      "primary",
    ]);
    expect(value.otherOpenHeardScenarioIds).toEqual([
      "secondary",
      "other-0",
      "other-1",
      "other-2",
      "other-3",
      "other-4",
    ]);
  });

  it("sheds potential developments before established explanations", () => {
    const value = brief();
    const entry = value.pursuedScenarios[0]!;
    entry.potential.nextDevelopmentKinds = ["verify-hearsay"];
    entry.potential.speculativeCommitments = [
      {
        id: "belief",
        kind: "motive",
        subject: "Witness",
        summary: "An untested claim",
      },
    ];
    entry.established.committedExplanations = [
      {
        id: "cause",
        kind: "mechanism",
        subject: "Bell",
        summary: "A committed explanation",
      },
    ];
    const expected = structuredClone(value);
    expected.pursuedScenarios[0]!.potential.nextDevelopmentKinds = [];
    expect(enforceBriefBudget(value, size(expected))).toEqual(expected);
    expected.pursuedScenarios[0]!.potential.speculativeCommitments = [];
    expected.pursuedScenarios[0]!.established.committedExplanations = [];
    expect(enforceBriefBudget(value, size(expected))).toEqual(expected);
    expect(entry.established.committedExplanations).toEqual([]);
    expect(entry.gmTruthRef.truth).toBe("Established truth");
  });

  it("drops optional package and place details but keeps the mandatory brief structure", () => {
    const value = brief();
    value.currentPlace = { id: "quay", name: "The Quay" };
    value.otherOpenHeardScenarioIds = ["other"];
    value.committedExplanations = [
      {
        id: "cause",
        kind: "identity",
        subject: "Ferryman",
        summary: "A known identity",
      },
    ];
    value.packageContext = {
      sceneId: "scene",
      activeRecordIds: ["clue"],
      establishedActors: [
        { actorId: "actor", status: "present", disposition: "friendly" },
      ],
      latestEvents: [
        {
          id: "event",
          recordId: "clue",
          certainty: "confirmed",
          to: "active",
          note: "A clue",
        },
      ],
      openUncertainties: ["An unresolved claim"],
    };
    const expected = brief();
    expected.packageContext = {
      sceneId: "scene",
      activeRecordIds: [],
      establishedActors: [],
      latestEvents: [],
      openUncertainties: [],
    };
    expect(enforceBriefBudget(value, size(expected))).toEqual(expected);
    expect(value).not.toHaveProperty("committedExplanations");
  });
});
