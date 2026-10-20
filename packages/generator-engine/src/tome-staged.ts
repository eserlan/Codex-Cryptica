/**
 * Staged AI generation for the Tome / Forbidden Book generator (#4223).
 *
 * The one-pass route writes the entire manuscript in one call and untangles
 * cross-section contradictions with a heavy second pass.
 *
 * This staged route writes the tome in dependency order, each stage seeing
 * only the validated output of the stages before it:
 *
 * 1. provenance: Artefact, Physical Description, Provenance & Transmission,
 *    Ground Truth for the GM, and canonicalFacts (centralRule, productionMethod,
 *    errorSource, bookClaim, deception, objectiveTruth, actionableClue).
 * 2. revelations: Contents & Revelations with translated excerpt, Risks & Costs
 *    of Study, and Quick Checks & Mechanics, written against locked Stage 1 facts.
 * 3. hooks: Three numbered Adventure Hooks anchored to locked custodian,
 *    associated location, and missing material (exactDamage), followed by
 *    consistency audit and targeted coherence repair.
 *
 * Earlier stage facts are locked by construction: later stages cannot rename
 * or overwrite the objective truth, claims, error attribution, or physical damage.
 * If any stage remains unusable after its single retry, it returns null and falls
 * back cleanly to the existing one-pass route. Cancellation aborts immediately.
 */

import { avoidNamesExcludingContext } from "./campaign-context";
import { StagedProgress } from "./staged-progress";
import {
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import type { TomeGeneratorOptions, TomePrompt } from "./public-tome";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type {
  TomeRunState,
  TomeStageId,
  TomeStagedDeps,
  TomeStagedResult,
  TomeStagedStats,
} from "./tome-staged-contracts";
import {
  checkTomeProvenanceStage,
  checkTomeRevelationsStage,
  checkTomeHooksStage,
} from "./tome-staged-validation";
import { assembleTome } from "./tome-staged-assembly";
import {
  tomeSystemInstruction,
  provenanceMessage,
  revelationsMessage,
  hooksMessage,
} from "./tome-staged-prompts";
import { finishTomeCoherence } from "./tome-staged-coherence";

export type {
  TomeStageId,
  TomeStagedDeps,
  TomeStagedStats,
  TomeStagedResult,
} from "./tome-staged-contracts";
export { tomeStatsLog } from "./tome-staged-contracts";
export {
  assembleTome,
  formatGroundTruth,
  formatConnectedEntities,
  formatQuickChecks,
  formatAdventureHooks,
} from "./tome-staged-assembly";
export {
  checkTomeProvenanceStage,
  checkTomeRevelationsStage,
  checkTomeHooksStage,
} from "./tome-staged-validation";

const PROGRESS_STEPS: ReadonlyArray<{ id: TomeStageId; label: string }> = [
  { id: "provenance", label: "Artefact, provenance and ground truth" },
  { id: "revelations", label: "Contents, excerpt and mechanics" },
  { id: "hooks", label: "Adventure hooks and coherence" },
];

export async function generateTomeStaged(
  prompt: TomePrompt,
  options: TomeGeneratorOptions,
  deps: TomeStagedDeps,
): Promise<TomeStagedResult | null> {
  const getTimestamp = deps.now ?? Date.now;
  const startedAt = getTimestamp();
  const stats: TomeStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    elapsedMs: 0,
    repairedStages: [],
    coherenceRepaired: false,
    reviewIssues: [],
    reviewSkipped: false,
    remainingIssues: [],
  };

  const output = await runStaged(prompt, options, deps, stats);
  stats.elapsedMs = getTimestamp() - startedAt;
  if (!output) {
    deps.onStats?.(stats);
    return null;
  }
  stats.outcome = "staged";
  deps.onStats?.(stats);
  return { output, stats };
}

async function runStaged(
  prompt: TomePrompt,
  options: TomeGeneratorOptions,
  deps: TomeStagedDeps,
  stats: TomeStagedStats,
): Promise<PublicGeneratorOutput | null> {
  const resolved = prompt.resolved;
  const prefix = deps.contextPrefix ?? "";
  const run: TomeRunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
    system: tomeSystemInstruction(resolved),
  };
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );

  throwIfAborted(deps.signal);

  // Stage 1: Provenance & Ground Truth
  const provenanceStage = await advanceTomeStage(
    deps,
    run,
    "provenance",
    provenanceMessage(resolved, prefix),
    (d) => checkTomeProvenanceStage(d, resolved, avoid),
  );
  if (!provenanceStage) return null;

  // Stage 2: Contents, Excerpt & Mechanics
  const revelationsStage = await advanceTomeStage(
    deps,
    run,
    "revelations",
    revelationsMessage(resolved, provenanceStage, prefix),
    (d) => checkTomeRevelationsStage(d, provenanceStage, resolved, avoid),
  );
  if (!revelationsStage) return null;

  // Stage 3: Adventure Hooks
  const hooksStage = await advanceTomeStage(
    deps,
    run,
    "hooks",
    hooksMessage(resolved, provenanceStage, revelationsStage, prefix),
    (d) =>
      checkTomeHooksStage(
        d,
        provenanceStage,
        revelationsStage,
        resolved,
        avoid,
      ),
  );
  if (!hooksStage) return null;

  // Assembly & Coherence
  const assembled = assembleTome(
    provenanceStage,
    revelationsStage,
    hooksStage,
    resolved,
  );

  return finishTomeCoherence(deps, run, assembled, resolved, prefix);
}

async function advanceTomeStage(
  deps: TomeStagedDeps,
  run: TomeRunState,
  id: TomeStageId,
  message: string,
  check: (data: JsonObject) => DraftCheck,
): Promise<JsonObject | null> {
  const stageDraft = await runCheckedStage(
    deps.complete,
    run,
    { id, system: run.system, message, check },
    deps.signal,
  );
  if (!stageDraft) {
    run.stats.stoppedAt = id;
    return null;
  }
  throwIfAborted(deps.signal);
  return stageDraft.data;
}
