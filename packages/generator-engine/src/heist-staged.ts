import { withPublicCreativeCue } from "./public-creative-diversity";
/**
 * Staged AI generation for the Heist generator (#4222).
 *
 * The one-pass route asks the model to invent an entire 900-1,300-word score at
 * once: objective, practical prize complication, casing intel, three ordered
 * security rings, a five-step alarm track, complications, a compromised getaway,
 * and a flashback menu.
 *
 * This staged route writes the heist in dependency order, each stage seeing
 * only the validated output of the stages before it:
 *
 * 1. objective: title, player-facing hook (content), concrete objective (bound to
 *    heistType), the prize and its practical complication, and actionable casing intel.
 * 2. security: three security rings (Perimeter, Access, Inner) and the hidden
 *    factor, built against the locked target and casing constraints from Stage 1.
 * 3. response: five-step alarm track, triggered complications, compromised getaway,
 *    and player flashback menu anchored to Stages 1-2.
 * 4. coherence: assemble through parseHeistResponse, validate with validateHeist,
 *    and run the bounded semantic audit and targeted repair.
 *
 * Earlier stage facts are locked by construction: later stages cannot rename
 * or overwrite the objective, prize, casing intel, or security rings. If any
 * stage remains unusable after its single retry, it returns null and falls back
 * cleanly to the existing one-pass route. Cancellation aborts immediately.
 */

import { avoidNamesExcludingContext } from "./campaign-context";
import { StagedProgress } from "./staged-progress";
import {
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import type { HeistGeneratorOptions, HeistPrompt } from "./public-heist";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type {
  HeistStageId,
  HeistStagedDeps,
  HeistStagedStats,
  HeistStagedResult,
  HeistRunState,
} from "./heist-staged-contracts";
import { checkHeistObjectiveStage } from "./heist-staged-objective";
import { checkHeistSecurityStage } from "./heist-staged-security";
import { checkHeistResponseStage } from "./heist-staged-response";
import { assembleHeist } from "./heist-staged-assembly";
import {
  objectiveMessage,
  securityMessage,
  responseMessage,
} from "./heist-staged-prompts";
import { finishHeistCoherence } from "./heist-staged-coherence";

export type {
  HeistStageId,
  HeistStagedDeps,
  HeistStagedStats,
  HeistStagedResult,
} from "./heist-staged-contracts";
export { heistStatsLog } from "./heist-staged-contracts";
export {
  formatCasing,
  getRingText,
  formatSecurityRings,
  formatAlarmTrack,
  formatComplications,
  formatGetaway,
  formatFlashbacks,
} from "./heist-staged-formatters";
export { assembleHeist, formatQuickReference } from "./heist-staged-assembly";
export { checkHeistObjectiveStage } from "./heist-staged-objective";
export { checkHeistSecurityStage } from "./heist-staged-security";
export { checkHeistResponseStage } from "./heist-staged-response";

const PROGRESS_STEPS: ReadonlyArray<{ id: HeistStageId; label: string }> = [
  { id: "objective", label: "Target, objective and casing" },
  { id: "security", label: "Three security rings" },
  { id: "response", label: "Alarm track and getaway" },
  { id: "coherence", label: "Coherence and review" },
];

// fallow-ignore-next-line code-duplication
export async function generateHeistStaged(
  prompt: HeistPrompt,
  options: HeistGeneratorOptions,
  deps: HeistStagedDeps,
): Promise<HeistStagedResult | null> {
  const now = deps.now ?? Date.now;
  const started = now();
  const stats: HeistStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    elapsedMs: 0,
    repairedStages: [],
    coherenceRepaired: false,
    reviewIssues: [],
    reviewSkipped: false,
    remainingIssues: [],
  };
  // fallow-ignore-next-line code-duplication
  const result = await runStaged(prompt, options, deps, stats);
  if (result) stats.outcome = "staged";
  stats.elapsedMs = now() - started;
  deps.onStats?.(stats);
  return result ? { output: result, stats } : null;
}

async function runStaged(
  prompt: HeistPrompt,
  options: HeistGeneratorOptions,
  deps: HeistStagedDeps,
  stats: HeistStagedStats,
): Promise<PublicGeneratorOutput | null> {
  const resolved = prompt.resolved;
  const prefix = deps.contextPrefix ?? "";
  const run: HeistRunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
    system: prompt.systemInstruction,
  };
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );
  const stage = createStageRunner(deps, run);

  throwIfAborted(deps.signal);

  // Stage 1: Objective
  const objectiveStage = await stage(
    "objective",
    deps.seed
      ? objectiveMessage(resolved, prefix, deps.seed, avoid)
      : withPublicCreativeCue(
          objectiveMessage(resolved, prefix, deps.seed, avoid),
          "event",
        ),
    (d) => checkHeistObjectiveStage(d, resolved, avoid),
  );
  if (!objectiveStage) return null;

  // Stage 2: Security Rings
  const securityStage = await stage(
    "security",
    securityMessage(resolved, objectiveStage, prefix, avoid),
    (d) => checkHeistSecurityStage(d, objectiveStage, resolved, avoid),
  );
  if (!securityStage) return null;

  // Stage 3: Response & Getaway
  const responseStage = await stage(
    "response",
    responseMessage(resolved, objectiveStage, securityStage, prefix, avoid),
    (d) =>
      checkHeistResponseStage(
        d,
        { ...objectiveStage, ...securityStage },
        resolved,
        avoid,
      ),
  );
  if (!responseStage) return null;

  // Stage 4: Coherence
  const assembled = assembleHeist(
    objectiveStage,
    securityStage,
    responseStage,
    resolved,
  );

  return finishHeistCoherence(
    deps,
    run,
    assembled,
    resolved,
    prompt.reviewContext ?? prefix,
  );
}

function createStageRunner(deps: HeistStagedDeps, run: HeistRunState) {
  return async (
    id: Exclude<HeistStageId, "coherence">,
    message: string,
    check: (data: JsonObject) => DraftCheck,
  ) => {
    const result = await runCheckedStage(
      deps.complete,
      run,
      { id, system: run.system, message, check },
      deps.signal,
    );
    if (!result) {
      run.stats.stoppedAt = id;
      return null;
    }
    throwIfAborted(deps.signal);
    return result.data;
  };
}
