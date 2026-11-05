/** Fixed-truth mystery workflow; accepted artifacts remain locked for later stages. */
import { assembleOutput } from "./mystery-staged-output";
import { checkFoundation, checkCast } from "./mystery-foundation-checks";
import { checkClues } from "./mystery-clue-checks";
import { checkPressure, checkAudit } from "./mystery-pressure-checks";
import { uniqueIds } from "./mystery-stage-validation";
import { mysteryStagePrompts } from "./mystery-stage-prompts";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { ResolvedMysteryOptions } from "./public-mystery";
import {
  readJsonObject,
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import type { ConceptSeed } from "./concept-seed";
import { list, record, text } from "./mystery-obj";
import { normalizeMysteryStage } from "./mystery-staged-normalize";
import type { Rng } from "./random-utils";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";

export {
  allowedThirdRevelationKinds,
  expectedThirdRevelationKind,
  mysteryTypeGuidance,
} from "./mystery-type-guidance";

export interface MysteryStagedStats {
  outcome: "staged" | "fallback";
  stoppedAt?: string;
  aiCalls: number;
  repairedStages: string[];
}

export interface MysteryStagedDependencies {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  onProgress?: (steps: StagedProgressStep[]) => void;
  onStats?: (stats: MysteryStagedStats) => void;
  contextPrefix?: string;
  /**
   * The case seed chosen before this run (see `concept-seed.ts`). Absent or
   * `null` means the rolled dimensions alone shape the case.
   */
  seed?: ConceptSeed | null;
  /** Source for the rolled concept; injected in tests. */
  rng?: Rng;
}

/**
 * The final pass only reports. Every structural check has already passed by
 * here, so remaining wording-level doubts must not discard a playable case.
 */
const checkFinalAudit = checkAudit;
type Obj = JsonObject;

function checkRepair(
  data: Obj,
  foundation: Obj,
  resolved: ResolvedMysteryOptions,
): DraftCheck {
  const nextCast = record(data.cast);
  const nextClues = record(data.clues);
  const nextPressure = record(data.pressure);
  const castCheck = checkCast(nextCast, foundation, resolved);
  const clueCheck = checkClues(nextClues, foundation, nextCast);
  const pressureCheck = checkPressure(
    nextPressure,
    nextCast,
    foundation,
    nextClues,
  );
  return {
    hard: [
      ...castCheck.hard.map((issue) => `cast: ${issue}`),
      ...clueCheck.hard.map((issue) => `clues: ${issue}`),
      ...pressureCheck.hard.map((issue) => `pressure: ${issue}`),
    ],
    soft: [],
  };
}

const steps = [
  { id: "mystery-foundation", label: "Case foundation and fixed truth" },
  { id: "mystery-cast", label: "Suspects and locations" },
  { id: "mystery-clues", label: "Clues and independent leads" },
  { id: "mystery-pressure", label: "Pressure and possible outcomes" },
  { id: "mystery-audit", label: "Consistency and spoiler audit" },
  { id: "mystery-repair", label: "Repair flagged case details" },
  { id: "mystery-final-audit", label: "Final consistency check" },
] as const;

type MysteryStepId = (typeof steps)[number]["id"];

function createStageRunner(
  deps: MysteryStagedDependencies,
  progress: StagedProgress<MysteryStepId>,
  stats: MysteryStagedStats,
  system: string,
) {
  return async (
    id: MysteryStepId,
    message: string,
    check: (data: Obj) => DraftCheck,
    normalize?: (data: Obj) => Obj,
  ) => {
    const complete = normalize
      ? async (systemInstruction: string, userMessage: string) => {
          const reply = await deps.complete(systemInstruction, userMessage);
          const parsed = readJsonObject(reply);
          return parsed ? JSON.stringify(normalize(parsed)) : reply;
        }
      : deps.complete;
    return runCheckedStage(
      complete,
      { progress, stats: stats as never },
      { id, system, message, check },
      deps.signal,
    );
  };
}

interface LockedCase {
  foundation: Obj;
  cast: Obj;
  clues: Obj;
  pressure: Obj;
}

type StageRunner = ReturnType<typeof createStageRunner>;

async function buildCase(
  resolved: ResolvedMysteryOptions,
  context: string,
  run: StageRunner,
): Promise<LockedCase | { stoppedAt: string }> {
  const foundation = await run(
    "mystery-foundation",
    mysteryStagePrompts.foundation(resolved, context),
    (data) => checkFoundation(data, resolved),
    normalizeMysteryStage.foundation,
  );
  if (!foundation) return { stoppedAt: "foundation" };
  const cast = await run(
    "mystery-cast",
    mysteryStagePrompts.cast(resolved, foundation.data),
    (data) => checkCast(data, foundation.data, resolved),
    (data) =>
      normalizeMysteryStage.cast(
        data,
        text(record(foundation.data.truth).perpetratorName),
      ),
  );
  if (!cast) return { stoppedAt: "cast" };
  const clues = await run(
    "mystery-clues",
    mysteryStagePrompts.clues(resolved.mysteryType, foundation.data, cast.data),
    (data) => checkClues(data, foundation.data, cast.data),
    (data) =>
      normalizeMysteryStage.clues(
        data,
        uniqueIds(list(foundation.data.revelations)),
      ),
  );
  if (!clues) return { stoppedAt: "clues" };
  const pressure = await run(
    "mystery-pressure",
    mysteryStagePrompts.pressure(foundation.data, cast.data, clues.data),
    (data) => checkPressure(data, cast.data, foundation.data, clues.data),
    normalizeMysteryStage.pressure,
  );
  if (!pressure) return { stoppedAt: "pressure" };
  return {
    foundation: foundation.data,
    cast: cast.data,
    clues: clues.data,
    pressure: pressure.data,
  };
}

async function repairCase(
  locked: LockedCase,
  audit: Obj,
  resolved: ResolvedMysteryOptions,
  run: StageRunner,
  progress: StagedProgress<MysteryStepId>,
): Promise<LockedCase> {
  const { foundation, cast, clues, pressure } = locked;
  let finalCast = cast;
  let finalClues = clues;
  let finalPressure = pressure;
  if (text(audit.status) === "needs-repair") {
    const repair = await run(
      "mystery-repair",
      mysteryStagePrompts.repair(locked, audit.issues),
      (data) => checkRepair(data, foundation, resolved),
      (data) =>
        normalizeMysteryStage.repair(data, {
          culpritName: text(record(foundation.truth).perpetratorName),
          revelationIds: uniqueIds(list(foundation.revelations)),
          previous: { cast, clues, pressure },
        }),
    );
    // An unusable repair keeps the case as it was: it already passed every check.
    if (repair) {
      finalCast = record(repair.data.cast);
      finalClues = record(repair.data.clues);
      finalPressure = record(repair.data.pressure);
    }
  } else {
    progress.set("mystery-repair", "skipped", "no repair needed");
  }
  return {
    foundation,
    cast: finalCast,
    clues: finalClues,
    pressure: finalPressure,
  };
}

/** Returns null on an unusable stage so the caller can use its labelled local fallback. */
export async function generateMysteryStaged(
  resolved: ResolvedMysteryOptions,
  deps: MysteryStagedDependencies,
): Promise<{
  output: PublicGeneratorOutput;
  stats: MysteryStagedStats;
} | null> {
  const progress = new StagedProgress(steps, deps.onProgress);
  const context = mysteryStagePrompts.context(resolved, deps);
  const stats: MysteryStagedStats = {
    outcome: "staged",
    aiCalls: 0,
    repairedStages: [],
  };
  const system = mysteryStagePrompts.system(resolved);
  const run = createStageRunner(deps, progress, stats, system);
  const locked = await buildCase(resolved, context, run);
  if ("stoppedAt" in locked) return stopped(stats, locked.stoppedAt);
  const { foundation } = locked;
  const audit = await run(
    "mystery-audit",
    mysteryStagePrompts.audit(locked),
    checkAudit,
    normalizeMysteryStage.audit,
  );
  if (!audit) return stopped(stats, "audit");
  const final = await repairCase(locked, audit.data, resolved, run, progress);
  const finalAudit = await run(
    "mystery-final-audit",
    mysteryStagePrompts.finalAudit(final, audit.data.issues),
    checkFinalAudit,
    normalizeMysteryStage.audit,
  );
  if (!finalAudit) return stopped(stats, "final-audit");
  throwIfAborted(deps.signal);
  const output = assembleOutput(
    foundation,
    final.cast,
    final.clues,
    final.pressure,
  );
  deps.onStats?.(stats);
  return { output, stats };

  function stopped(state: MysteryStagedStats, stage: string): null {
    state.outcome = "fallback";
    state.stoppedAt = stage;
    deps.onStats?.(state);
    return null;
  }
}
