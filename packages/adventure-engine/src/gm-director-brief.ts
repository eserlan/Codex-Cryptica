import { isDisengagementAction } from "./gm-director-action-matching";
import { collectCommittedExplanations } from "./gm-director-commitments";
import {
  rankOpenHeardScenarios,
  type RankedCandidate,
} from "./gm-director-scenario-ranking";
import { buildPursuedScenario } from "./gm-director-scenario-summary";
import {
  DIRECTOR_HISTORY_LOOKBACK_TURNS,
  MAX_DIRECTOR_BRIEF_CHARS,
  type DirectorActionKind,
  type DirectorScenePosture,
  type DirectorPackageContext,
  type GMDirectorBrief,
  type GMDirectorBriefInput,
} from "./gm-director-brief-contract";
import { enforceBriefBudget } from "./gm-director-brief-budget";
import { appendUniqueClipped, clipText } from "./gm-director-brief-text";
import type { PromptAdventurePackage } from "./context-budget";
import {
  candidateScenariosForLocation,
  currentLocationContext,
} from "./contextual-rumours";
import { dialogueLoopPacing, isInquiry } from "./dialogue-pacing";
import {
  investigativeProgressPacing,
  type InvestigativePacing,
} from "./investigative-pacing";
import { sceneStallPacing } from "./scene-pacing";
import type {
  AdventureSession,
  PackageProgress,
  PackageProgressStatus,
} from "./types";

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

type PackageExcerpt = PromptAdventurePackage["playerSafe"][number];

function hasPackageExcerpts(pkg?: PromptAdventurePackage): boolean {
  return Boolean(pkg && (pkg.playerSafe.length > 0 || pkg.gmOnly.length > 0));
}

function supersededIdSet(
  events: ReadonlyArray<{ supersedes?: string }> | undefined,
): Set<string> {
  return new Set(
    (events ?? []).flatMap((event) =>
      event.supersedes ? [event.supersedes] : [],
    ),
  );
}

const CLOSED_PACKAGE_STATUSES = new Set<PackageProgressStatus>([
  "resolved",
  "altered",
  "skipped",
]);

function collectActivePackageRecordIds(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string[] {
  const records = progress?.records ?? [];
  const closedIds = new Set(
    records
      .filter((r) => CLOSED_PACKAGE_STATUSES.has(r.status))
      .map((r) => r.id),
  );
  const byStatus = (status: "active" | "available") =>
    records.filter((r) => r.status === status).map((r) => r.id);
  const excerptIds = allExcerpts
    .filter(
      (e) =>
        e.kind !== "premise" && e.kind !== "system" && !closedIds.has(e.id),
    )
    .map((e) => e.id);

  return [
    ...new Set([
      ...byStatus("active"),
      ...byStatus("available"),
      ...excerptIds,
    ]),
  ].slice(0, 8);
}

function summarizeEstablishedActors(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): DirectorPackageContext["establishedActors"] {
  const pkgActorIds = new Set(
    allExcerpts.filter((e) => e.kind === "actor").map((e) => e.id),
  );
  return [...(progress?.actors ?? [])]
    .sort(
      (a, b) =>
        Number(pkgActorIds.has(b.actorId)) - Number(pkgActorIds.has(a.actorId)),
    )
    .slice(0, 4)
    .map((actor) => ({
      actorId: actor.actorId,
      status: actor.status,
      disposition: actor.disposition,
      ...(actor.facts.length > 0
        ? { facts: actor.facts.slice(-2).map((fact) => clipText(fact, 120)) }
        : {}),
    }));
}

function summarizeLatestPackageEvents(
  progress: PackageProgress | undefined,
): DirectorPackageContext["latestEvents"] {
  const superseded = supersededIdSet(progress?.events);
  return (progress?.events ?? [])
    .filter((event) => !superseded.has(event.id))
    .slice(-4)
    .map((event) => ({
      id: event.id,
      recordId: event.recordId,
      certainty: event.certainty,
      to: event.to,
      note: clipText(event.note, 120),
    }));
}

function collectClaimedFrom<
  T extends { id: string; certainty: string; supersedes?: string },
>(
  events: readonly T[] | undefined,
  format: (event: T) => string,
  push: (text: string) => void,
): void {
  if (!events?.length) return;
  const superseded = supersededIdSet(events);
  for (const event of events) {
    if (!superseded.has(event.id) && event.certainty === "claimed") {
      push(format(event));
    }
  }
}

function collectClaimedUncertainties(
  progress: PackageProgress | undefined,
  push: (text: string) => void,
): void {
  collectClaimedFrom(
    progress?.events,
    (event) => `Claimed (${event.recordId}): ${event.note}`,
    push,
  );
  collectClaimedFrom(
    progress?.actorEvents,
    (actorEvent) =>
      `Claimed actor note (${actorEvent.actorId}): ${actorEvent.note}`,
    push,
  );
}

function collectOpenEpistemicUncertainties(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const resolved = new Set(
    (progress?.records ?? [])
      .filter((r) => r.status === "resolved" || r.status === "altered")
      .map((r) => r.id),
  );
  for (const excerpt of allExcerpts) {
    const open =
      excerpt.epistemicStatus === "ambiguous" ||
      excerpt.epistemicStatus === "unresolved";
    if (open && !resolved.has(excerpt.id)) {
      push(
        `${excerpt.epistemicStatus} ${excerpt.kind} (${excerpt.id}): keep open.`,
      );
    }
  }
}

function collectSummarizedPackageSecretIds(
  session: AdventureSession,
): Set<string> {
  return new Set([
    ...(session.packageProgress?.revealedSecretIds ?? []),
    ...session.hiddenState.secrets
      .filter((secret) => secret.status === "revealed")
      .map((secret) => secret.id),
    ...(session.packageProgress?.records ?? [])
      .filter(
        (record) =>
          record.kind === "secret" &&
          (record.status === "resolved" || record.status === "altered"),
      )
      .map((record) => record.id),
  ]);
}

function collectLegacyPackageSecretReveals(
  session: AdventureSession,
  packageSecretIds: ReadonlySet<string>,
  summarizedIds: ReadonlySet<string>,
): Set<string> {
  const turnIds = new Set<string>();
  // packageProgress is the durable summary for current sessions. The bounded
  // turn lookup retains compatibility for package secrets missing from it.
  if ([...packageSecretIds].some((id) => !summarizedIds.has(id))) {
    for (const turn of session.turns.slice(-DIRECTOR_HISTORY_LOOKBACK_TURNS)) {
      for (const id of turn.revealedSecretIds) {
        if (packageSecretIds.has(id) && !summarizedIds.has(id)) turnIds.add(id);
      }
    }
  }
  return turnIds;
}

function collectRevealedPackageSecretIds(
  session: AdventureSession,
  packageSecretIds: ReadonlySet<string>,
): Set<string> {
  const summarizedIds = collectSummarizedPackageSecretIds(session);
  const turnIds = collectLegacyPackageSecretReveals(
    session,
    packageSecretIds,
    summarizedIds,
  );
  return new Set([...summarizedIds, ...turnIds]);
}

function collectUnrevealedSecretUncertainties(
  session: AdventureSession,
  gmOnly: readonly PackageExcerpt[],
  push: (text: string) => void,
): void {
  const packageSecretIds = new Set(
    gmOnly
      .filter((excerpt) => excerpt.kind === "secret")
      .map((excerpt) => excerpt.id),
  );
  const revealed = collectRevealedPackageSecretIds(session, packageSecretIds);
  for (const excerpt of gmOnly) {
    if (excerpt.kind === "secret" && !revealed.has(excerpt.id)) {
      push(`Unrevealed secret (${excerpt.id}).`);
    }
  }
}

function collectPackageUncertainties(
  session: AdventureSession,
  allExcerpts: readonly PackageExcerpt[],
  pkg?: PromptAdventurePackage,
): string[] {
  const items: string[] = [];
  const push = (text: string) => {
    appendUniqueClipped(items, text, 140);
  };
  collectClaimedUncertainties(session.packageProgress, push);
  collectOpenEpistemicUncertainties(session.packageProgress, allExcerpts, push);
  collectUnrevealedSecretUncertainties(session, pkg?.gmOnly ?? [], push);
  return items.slice(0, 4);
}

function resolvePackageSceneId(
  progress: PackageProgress | undefined,
  allExcerpts: readonly PackageExcerpt[],
): string | undefined {
  return progress?.sceneId ?? allExcerpts.find((e) => e.kind === "scene")?.id;
}

function buildPackageContext(
  session: AdventureSession,
  pkg?: PromptAdventurePackage,
): DirectorPackageContext | undefined {
  if (!session.sourcePackage && !hasPackageExcerpts(pkg)) return undefined;

  const progress = session.packageProgress;
  const allExcerpts = pkg ? [...pkg.playerSafe, ...pkg.gmOnly] : [];
  const sceneId = resolvePackageSceneId(progress, allExcerpts);

  return {
    ...(sceneId ? { sceneId } : {}),
    activeRecordIds: collectActivePackageRecordIds(progress, allExcerpts),
    establishedActors: summarizeEstablishedActors(progress, allExcerpts),
    latestEvents: summarizeLatestPackageEvents(progress),
    openUncertainties: collectPackageUncertainties(session, allExcerpts, pkg),
  };
}

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

function determineScenePosture(
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

function determineSuggestedActionKinds(
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
  const mode: GMDirectorBrief["mode"] =
    pursued.length > 0
      ? "active-pursuit"
      : packageContext
        ? "package-scene"
        : "open-world";
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
      otherIds,
      packageContext,
      investigative,
    }),
    limit,
  );
  return { brief, investigative };
}

function directorProgression(
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

function assembleDirectorBrief(args: {
  input: GMDirectorBriefInput;
  mode: GMDirectorBrief["mode"];
  scenePosture: DirectorScenePosture;
  pursued: ReturnType<typeof rankOpenHeardScenarios>["pursued"];
  otherIds: string[];
  packageContext: DirectorPackageContext | undefined;
  investigative: InvestigativePacing | undefined;
}): GMDirectorBrief {
  const { input, mode, scenePosture, pursued, otherIds } = args;
  const currentPlace = resolveCurrentPlace(input.session);
  const unscopedExplanations = collectCommittedExplanations(input.session);
  const progression = directorProgression(
    args.investigative,
    scenePosture,
    mode,
  );
  return {
    advisory: true,
    mode,
    scenePosture,
    ...(currentPlace ? { currentPlace } : {}),
    pursuedScenarios: pursued.map((entry) =>
      buildPursuedScenario(entry, input.session),
    ),
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
