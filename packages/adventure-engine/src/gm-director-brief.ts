import { selectPursuedEmergentThread } from "./emergent-threads";
import { buildPackageContext } from "./gm-director-package-context";
import {
  determineScenePosture,
  determineSuggestedActionKinds,
  directorProgression,
} from "./gm-director-pacing";
import { collectCommittedExplanations } from "./gm-director-commitments";
import {
  rankOpenHeardScenarios,
  type RankedCandidate,
} from "./gm-director-scenario-ranking";
import { buildPursuedScenario } from "./gm-director-scenario-summary";
import {
  MAX_DIRECTOR_BRIEF_CHARS,
  type DirectorScenePosture,
  type DirectorPackageContext,
  type GMDirectorBrief,
  type GMDirectorBriefInput,
} from "./gm-director-brief-contract";
import { enforceBriefBudget } from "./gm-director-brief-budget";
import { clipText } from "./gm-director-brief-text";
import {
  candidateScenariosForLocation,
  currentLocationContext,
} from "./contextual-rumours";
import {
  investigativeProgressPacing,
  type InvestigativePacing,
} from "./investigative-pacing";
import type { AdventureSession } from "./types";

export { MAX_DIRECTOR_BRIEF_CHARS } from "./gm-director-brief-contract";
export type {
  DirectorActionKind,
  DirectorProvenance,
  DirectorConfidence,
  DirectorScenePosture,
  DirectorCommitmentEntry,
  DirectorPursuedScenario,
  DirectorPackageContext,
  GMDirectorBrief,
  GMDirectorBriefInput,
} from "./gm-director-brief-contract";

function resolveCurrentPlace(
  session: AdventureSession,
): GMDirectorBrief["currentPlace"] {
  const here = session.places?.find(
    (place) => place.id === session.currentPlaceId,
  );
  if (here) {
    return {
      id: here.id,
      name: clipText(here.name, 120),
      ...(here.sourceRecordId ? { sourceRecordId: here.sourceRecordId } : {}),
    };
  }
  const loc = currentLocationContext(session);
  if (!loc) return undefined;
  return {
    name: clipText(loc.name, 120),
    ...(loc.recordId ? { sourceRecordId: loc.recordId } : {}),
  };
}

function resolveEffectiveAction(
  input: GMDirectorBriefInput,
): string | undefined {
  return (
    input.playerAction?.trim() ||
    (input.phase === "roll-resolution"
      ? input.session.pendingRoll?.playerAction?.trim()
      : undefined)
  );
}

function prepareDirectorScene(
  input: GMDirectorBriefInput,
  effectiveAction: string | undefined,
) {
  const location = currentLocationContext(input.session);
  const openHeard = candidateScenariosForLocation(input.session).filter(
    (item) => item.status === "open" && item.knowledge === "heard",
  );
  const { pursued, otherIds } = rankOpenHeardScenarios(
    openHeard,
    input.session,
    effectiveAction,
    location,
  );
  const packageContext = buildPackageContext(
    input.session,
    input.adventurePackage,
  );
  const pursuedEmergent =
    pursued.length === 0
      ? selectPursuedEmergentThread(input.session, effectiveAction)
      : undefined;
  const mode: GMDirectorBrief["mode"] =
    pursued.length > 0 || pursuedEmergent
      ? "active-pursuit"
      : packageContext
        ? "package-scene"
        : "open-world";
  return { pursued, pursuedEmergent, otherIds, packageContext, mode };
}

/**
 * Pure, deterministic, budget-aware GM-only synthesis paired with the single
 * investigative pacing evaluation for the turn.
 */
export function buildGMDirectorBriefWithPacing(input: GMDirectorBriefInput): {
  brief: GMDirectorBrief | undefined;
  investigative: InvestigativePacing | undefined;
} {
  const limit =
    input.maxChars === undefined
      ? MAX_DIRECTOR_BRIEF_CHARS
      : Math.min(MAX_DIRECTOR_BRIEF_CHARS, input.maxChars);
  const effectiveAction = resolveEffectiveAction(input);
  const { pursued, pursuedEmergent, otherIds, packageContext, mode } =
    prepareDirectorScene(input, effectiveAction);
  const investigative = investigativeProgressPacing(
    input.session,
    effectiveAction,
    {
      pursuedScenario: pursued[0]?.item,
      hasActivePackageScene: Boolean(packageContext),
    },
  );
  if (!Number.isFinite(limit) || limit <= 0) {
    return { brief: undefined, investigative };
  }
  const scenePosture = determineScenePosture(
    input.session,
    input.phase,
    mode,
    effectiveAction,
    pursued.length,
    investigative,
  );
  const brief = enforceBriefBudget(
    assembleDirectorBrief({
      input,
      mode,
      scenePosture,
      pursued,
      pursuedEmergent,
      otherIds,
      packageContext,
      investigative,
    }),
    limit,
  );
  return { brief, investigative };
}

function assembleDirectorBrief(args: {
  input: GMDirectorBriefInput;
  mode: GMDirectorBrief["mode"];
  scenePosture: DirectorScenePosture;
  pursued: readonly RankedCandidate[];
  pursuedEmergent: ReturnType<typeof selectPursuedEmergentThread>;
  otherIds: string[];
  packageContext: DirectorPackageContext | undefined;
  investigative: InvestigativePacing | undefined;
}): GMDirectorBrief {
  const { input, mode, scenePosture, pursued, pursuedEmergent, otherIds } =
    args;
  const currentPlace = resolveCurrentPlace(input.session);
  const unscopedExplanations = collectCommittedExplanations(input.session);
  const progression = directorProgression(
    args.investigative,
    scenePosture,
    mode,
  );
  const pursuedEmergentThread = pursuedEmergent
    ? {
        threadId: pursuedEmergent.id,
        title: clipText(pursuedEmergent.title, 120),
        status: pursuedEmergent.status,
        provenance: pursuedEmergent.provenance,
        ...(pursuedEmergent.linkedScenarioId
          ? { linkedScenarioId: pursuedEmergent.linkedScenarioId }
          : {}),
        established: {
          knownConsequences: pursuedEmergent.knownConsequences.slice(-4),
          openQuestions: pursuedEmergent.openQuestions.slice(-3),
          linkedFactCount: pursuedEmergent.linkedFactIds.length,
          linkedPersonCount: pursuedEmergent.linkedPersonIds.length,
          linkedPlaceCount: pursuedEmergent.linkedPlaceIds.length,
        },
        ...(pursuedEmergent.gmOnlyDevelopments.length > 0
          ? { gmOnlyDevelopments: pursuedEmergent.gmOnlyDevelopments.slice(-3) }
          : {}),
      }
    : undefined;
  return {
    advisory: true,
    mode,
    scenePosture,
    ...(currentPlace ? { currentPlace } : {}),
    pursuedScenarios: pursued.map((entry) =>
      buildPursuedScenario(entry, input.session),
    ),
    ...(pursuedEmergentThread ? { pursuedEmergentThread } : {}),
    ...(unscopedExplanations.length > 0
      ? { committedExplanations: unscopedExplanations }
      : {}),
    otherOpenHeardScenarioIds: otherIds,
    ...(args.packageContext ? { packageContext: args.packageContext } : {}),
    ...(progression ? { progression } : {}),
    suggestedActionKinds: determineSuggestedActionKinds(
      mode,
      scenePosture,
      pursued,
      args.investigative,
    ),
  };
}

/**
 * Pure, deterministic, budget-aware GM-only synthesis of active focus,
 * established facts vs. potential developments, and scene posture.
 */
export function buildGMDirectorBrief(
  input: GMDirectorBriefInput,
): GMDirectorBrief | undefined {
  return buildGMDirectorBriefWithPacing(input).brief;
}
