import { dialogueLoopPacing, isInquiry } from "./dialogue-pacing";
import { isDisengagementAction } from "./gm-director-action-matching";
import type {
  DirectorActionKind,
  DirectorScenePosture,
  GMDirectorBrief,
  GMDirectorBriefInput,
} from "./gm-director-brief-contract";
import type { RankedCandidate } from "./gm-director-scenario-ranking";
import type { InvestigativePacing } from "./investigative-pacing";
import { sceneStallPacing } from "./scene-pacing";
import type { AdventureSession } from "./types";

function isInvestigationActive(
  session: AdventureSession,
  mode: GMDirectorBrief["mode"],
  effectiveAction: string | undefined,
  pursuedCount: number,
): boolean {
  if (isDisengagementAction(effectiveAction)) {
    return false;
  }
  if (
    pursuedCount > 0 ||
    mode === "package-scene" ||
    Boolean(session.visibleState.situation)
  ) {
    return true;
  }
  return Boolean(
    effectiveAction &&
    isInquiry(effectiveAction) &&
    session.turns.slice(-2).some((turn) => isInquiry(turn.playerAction)),
  );
}

function isSceneStallInvestigation(
  session: AdventureSession,
  mode: GMDirectorBrief["mode"],
  effectiveAction: string | undefined,
  pursuedCount: number,
  dialogue: ReturnType<typeof dialogueLoopPacing>,
  investigative?: InvestigativePacing,
): boolean {
  if (dialogue && !dialogue.recoveryDue && dialogue.repeatedTurns >= 3) {
    return false;
  }
  if (investigative?.recoveryDue) return true;
  if (dialogue || !sceneStallPacing(session)?.stalled) return false;
  return isInvestigationActive(session, mode, effectiveAction, pursuedCount);
}

export function determineScenePosture(
  session: AdventureSession,
  phase: GMDirectorBriefInput["phase"],
  mode: GMDirectorBrief["mode"],
  effectiveAction: string | undefined,
  pursuedCount: number,
  investigative?: InvestigativePacing,
): DirectorScenePosture {
  const dialogue = dialogueLoopPacing(session, effectiveAction);
  if (dialogue?.recoveryDue) {
    return "dialogue-loop";
  }
  if (
    isSceneStallInvestigation(
      session,
      mode,
      effectiveAction,
      pursuedCount,
      dialogue,
      investigative,
    )
  ) {
    return "stalled-investigation";
  }
  if (phase === "opening") return "opening";
  return mode === "open-world" ? "calm-conversation" : "progressing";
}

function activePursuitActionKinds(
  pursued: readonly RankedCandidate[],
): DirectorActionKind[] {
  const primary = pursued[0];
  if (primary && !primary.matchesLocation) {
    return ["travel", "investigate", "converse"];
  }
  if (primary?.item.stage === "revelation-crisis") {
    return ["intervene", "converse", "walk-away"];
  }
  return ["investigate", "converse", "walk-away"];
}

function stalledActionKinds(
  pursued: readonly RankedCandidate[],
): DirectorActionKind[] {
  const primary = pursued[0];
  const onSiteCrisis =
    primary?.matchesLocation && primary.item.stage === "revelation-crisis";
  return onSiteCrisis
    ? ["investigate", "intervene", "walk-away"]
    : ["investigate", "travel", "walk-away"];
}

function shouldUseStalledActions(
  mode: GMDirectorBrief["mode"],
  posture: DirectorScenePosture,
  investigative?: InvestigativePacing,
): boolean {
  if (posture === "dialogue-loop" || posture === "stalled-investigation") {
    return true;
  }
  return (
    mode !== "open-world" && (investigative?.repeatedNonAnswerTurns ?? 0) >= 2
  );
}

export function determineSuggestedActionKinds(
  mode: GMDirectorBrief["mode"],
  posture: DirectorScenePosture,
  pursued: readonly RankedCandidate[],
  investigative?: InvestigativePacing,
): DirectorActionKind[] {
  if (shouldUseStalledActions(mode, posture, investigative)) {
    return stalledActionKinds(pursued);
  }
  if (mode === "active-pursuit") return activePursuitActionKinds(pursued);
  if (mode === "package-scene") {
    return posture === "opening"
      ? ["converse", "investigate", "travel"]
      : ["investigate", "intervene", "travel"];
  }
  return posture === "opening"
    ? ["converse", "investigate", "travel"]
    : ["converse", "travel", "wait"];
}

export function directorProgression(
  investigative: InvestigativePacing | undefined,
  scenePosture: DirectorScenePosture,
  mode: GMDirectorBrief["mode"],
): GMDirectorBrief["progression"] {
  const emit =
    investigative &&
    scenePosture !== "calm-conversation" &&
    (investigative.recoveryDue ||
      (mode !== "open-world" && investigative.repeatedNonAnswerTurns >= 2));
  if (!emit) return undefined;
  return {
    turnsWithoutAdvancement: investigative.turnsWithoutAdvancement,
    repeatedNonAnswerTurns: investigative.repeatedNonAnswerTurns,
    ...(investigative.recommendedAngle
      ? { recommendedAngle: investigative.recommendedAngle }
      : {}),
  };
}
