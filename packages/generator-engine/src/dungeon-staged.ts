/**
 * Staged AI generation for the Dungeon & Delve generator (#4133).
 *
 * The one-pass route asks for the history, every sector, the hazards and
 * treasures and both factions in a single answer, then tries to repair
 * contradictions after the dependent prose is written. This route writes the
 * delve in the order it depends on itself, and each step only sees the
 * validated output of the steps before it:
 *
 * 1. foundation: title, throughline, history, secret and one brief per sector id
 * 2. geography and contents: sectors, hazards, treasures, hooks
 * 3. factions: written against the sectors, contents and layout that now
 *    exist, including what each has done to the sectors it holds
 * 4. coherence: assemble, run the deterministic checks and one model review,
 *    and repair only if either finds something
 *
 * The fixed plan (sector count, ids, stock types, faction drives) comes from
 * the resolved dungeon and is never taken from the model. A stage that stays
 * unusable returns `null`, and the caller runs the one-pass route, which has
 * its own local fallback. An abort throws; nothing partial is returned.
 */

import { avoidNamesExcludingContext } from "./campaign-context";
import { checkFoundation, checkSectors } from "./dungeon-stage-checks";
import { checkFactions } from "./dungeon-faction-checks";
import {
  assembleDungeon,
  foundationFactsOf,
  geographyFactsOf,
  type DungeonStageDrafts,
} from "./dungeon-stage-assembly";
import { finishDungeonCoherence } from "./dungeon-stage-coherence";
import {
  systemFor,
  foundationMessage,
  sectorsMessage,
  factionsMessage,
} from "./dungeon-stage-prompts";
import { ONE_PASS_DETAIL, StagedProgress } from "./staged-progress";
import {
  runCheckedStage,
  throwIfAborted,
  type JsonObject as Json,
} from "./staged-runtime";
import {
  parseDungeonResponseDetailed,
  type DungeonGeneratorOptions,
  type ResolvedDungeon,
} from "./public-dungeon";
import { defaultRng } from "./random-utils";
import type {
  DungeonStageId,
  DungeonStagedDeps,
  DungeonStagedStats,
  DungeonStagedResult,
  StageCheck,
  ProgressId,
  RunState,
} from "./dungeon-staged-types";

export type {
  DungeonStageId,
  DungeonStagedDeps,
  DungeonStagedStats,
  DungeonStagedResult,
  StageCheck,
} from "./dungeon-staged-types";
export { checkFoundation, checkSectors } from "./dungeon-stage-checks";
export { checkFactions } from "./dungeon-faction-checks";
export { checkFactionGrounding } from "./dungeon-faction-grounding";
export { checkTerritoryAccess } from "./dungeon-territory-access";
export { DUNGEON_REVIEW_MARKER } from "./dungeon-stage-prompts";

const PROGRESS_STEPS: ReadonlyArray<{ id: ProgressId; label: string }> = [
  { id: "foundation", label: "History, secret and layout" },
  { id: "sectors", label: "Sectors, hazards and treasures" },
  { id: "factions", label: "Factions and what they want" },
  { id: "coherence", label: "Checking it all fits together" },
];
/**
 * Ask for one stage, with one targeted retry that names the problems. A draft
 * with no hard problems is kept, so a failing retry falls back to it instead
 * of discarding the stage.
 */
function runStage(
  deps: DungeonStagedDeps,
  run: RunState,
  id: DungeonStageId,
  system: string,
  message: string,
  check: (data: Json) => StageCheck,
) {
  return runCheckedStage(
    deps.complete,
    run,
    { id, system, message, check },
    deps.signal,
  );
}
/**
 * Run the staged route. Resolves `null` when a stage is unusable or the
 * assembled dungeon is rejected, so the caller can run the one-pass route.
 */
export async function generateDungeonStaged(
  resolved: ResolvedDungeon,
  options: DungeonGeneratorOptions,
  deps: DungeonStagedDeps,
): Promise<DungeonStagedResult | null> {
  const stats: DungeonStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    repairedStages: [],
    reviewIssues: [],
    reviewSkipped: false,
    coherenceRepaired: false,
    remainingIssues: [],
  };
  const result = await runStaged(resolved, options, deps, stats);
  if (result) stats.outcome = "staged";
  deps.onStats?.(stats);
  return result;
}

function stopAt(run: RunState, at: DungeonStagedStats["stoppedAt"]): null {
  run.stats.stoppedAt = at;
  return null;
}

/** Generate in dependency order; later stages see only validated earlier facts. */
async function generateStageDrafts(
  resolved: ResolvedDungeon,
  options: DungeonGeneratorOptions,
  deps: DungeonStagedDeps,
  run: RunState,
): Promise<DungeonStageDrafts | null> {
  const avoid = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  );
  throwIfAborted(deps.signal);
  const foundation = await runStage(
    deps,
    run,
    "foundation",
    systemFor(resolved, "foundation"),
    foundationMessage(options, resolved, deps.contextPrefix),
    (d) => checkFoundation(d, resolved),
  );
  if (!foundation) return stopAt(run, "foundation");
  const facts = foundationFactsOf(foundation.data);
  const geography = await runStage(
    deps,
    run,
    "sectors",
    systemFor(resolved, "geography and contents"),
    sectorsMessage(options, resolved, facts, deps.contextPrefix),
    (d) => checkSectors(d, resolved, avoid),
  );
  if (!geography) return stopAt(run, "sectors");
  const world = geographyFactsOf(resolved, facts, geography.data);
  const { sectors, hazards, treasures, inventory } = world;
  const factions = await runStage(
    deps,
    run,
    "factions",
    systemFor(resolved, "factions"),
    factionsMessage(
      options,
      resolved,
      { ...facts, sectors, hazards, treasures },
      deps.contextPrefix,
    ),
    (d) => checkFactions(d, resolved, sectors, inventory, avoid),
  );
  if (!factions) return stopAt(run, "factions");
  return {
    foundation: foundation.data,
    facts,
    geography: world,
    factions: factions.data,
  };
}

async function runStaged(
  resolved: ResolvedDungeon,
  options: DungeonGeneratorOptions,
  deps: DungeonStagedDeps,
  stats: DungeonStagedStats,
): Promise<DungeonStagedResult | null> {
  const rng = deps.rng ?? defaultRng;
  const run: RunState = {
    stats,
    progress: new StagedProgress(PROGRESS_STEPS, deps.onProgress),
  };
  const drafts = await generateStageDrafts(resolved, options, deps, run);
  if (!drafts) return null;

  // Use the one-pass parser so rendering, name rules and fallbacks stay identical.
  run.progress.set("coherence", "active");
  const assembled = parseDungeonResponseDetailed(
    JSON.stringify(assembleDungeon(resolved, drafts)),
    options,
    rng,
    resolved,
  );
  if (assembled.rejected || !assembled.structured) {
    run.progress.abandon("coherence", ONE_PASS_DETAIL);
    return stopAt(run, "assembly");
  }
  const final = await finishDungeonCoherence(deps, run, assembled, {
    options,
    resolved,
    rng,
  });
  return { output: final.output, structured: final.structured!, stats };
}
