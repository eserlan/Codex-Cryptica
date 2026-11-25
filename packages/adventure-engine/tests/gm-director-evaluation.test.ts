import { describe, expect, it } from "vitest";
import {
  buildAdventureRecap,
  createPlayerTranscript,
  playerScenarioProjection,
} from "../src";
import {
  createGmDirectorEvaluationSession,
  GM_DIRECTOR_EVALUATION_ACTIONS,
  GM_DIRECTOR_EVALUATION_FIXTURE,
  GM_DIRECTOR_EVALUATION_STEPS,
} from "./fixtures/gm-director-evaluation";

describe("synthetic GM Director evaluation fixture", () => {
  it("keeps immutable truth out of player-facing starting projections", () => {
    const session = createGmDirectorEvaluationSession();
    const transcript = JSON.stringify(createPlayerTranscript(session));
    const recap = JSON.stringify(buildAdventureRecap(session));
    const scenario = session.scenarioCollection!.items[0]!;
    const projection = JSON.stringify(playerScenarioProjection(scenario));

    expect(scenario.gmOnly.truth).toBe(
      GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth,
    );
    expect(transcript).not.toContain(
      GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth,
    );
    expect(recap).not.toContain(GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth);
    expect(projection).not.toContain(
      GM_DIRECTOR_EVALUATION_FIXTURE.immutableTruth,
    );
  });

  it("uses one reproducible script with witness limits, a fair negative clue, a quiet route, and reset", () => {
    const session = createGmDirectorEvaluationSession();

    expect(GM_DIRECTOR_EVALUATION_ACTIONS).toHaveLength(8);
    expect(GM_DIRECTOR_EVALUATION_STEPS[2]?.forbiddenNpcKnowledge).toContain(
      "Edda tested the repaired clapper at the watch's scheduled request",
    );
    expect(
      GM_DIRECTOR_EVALUATION_STEPS.some(
        (step) => step.expectsUsefulNegativeFinding,
      ),
    ).toBe(true);
    const physicalInspection = GM_DIRECTOR_EVALUATION_STEPS[3];
    expect(physicalInspection?.relevant?.[0]?.content).toContain(
      "no fraying or cut strands",
    );
    expect(physicalInspection?.relevant?.[0]?.content).toContain(
      "no sign of forced entry or tampering",
    );
    expect(
      GM_DIRECTOR_EVALUATION_STEPS.some(
        (step) => step.quietOutcome === "peaceful",
      ),
    ).toBe(true);
    expect(GM_DIRECTOR_EVALUATION_STEPS.at(-1)?.providerHistoryReset).toBe(
      true,
    );
    expect(session.turns).toEqual([]);
    expect(session.scenarioCollection?.focusedScenarioId).toBe(
      "scenario-northbrook-bell",
    );
  });
});
