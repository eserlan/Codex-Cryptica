/**
 * Staged AI generation for the BBEG / Campaign Villain generator (#2379).
 *
 * The one-pass route asks for the whole villain at once, so it keeps falling
 * back on the same organisation, inner circle, flaw and weak point. This route
 * fixes those choices first, from the resolver and never from the model, then
 * writes the villain in dependency order, each stage seeing only the validated
 * output of the stages before it:
 *
 * 1. concept: goal, why now, motivation, fatal flaw, methods and resources.
 * 2. organisation: the assigned organisation form, territory and an inner
 *    circle of three different functions in three different relationships.
 * 3. plan: 5-7 stages that lead on from one another, a dependency chain,
 *    escalation, discovery layers and personal connections.
 * 4. ending: the weak point, the price of victory and the finale.
 * 5. coherence: assemble through parseVillainResponse, run the deterministic
 *    checks and one model review, then one targeted repair.
 *
 * A stage that stays unusable after its single retry returns null, and the
 * caller runs the one-pass route, which keeps its local fallback. Cancellation
 * throws and nothing partial is returned.
 */

import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import { parseVillainResponse, type ResolvedVillain } from "./public-villain";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { defaultRng } from "./random-utils";
import {
  FIXING_DETAIL,
  ONE_PASS_DETAIL,
  StagedProgress,
} from "./staged-progress";
import {
  askModel,
  isAbort,
  readJsonObject,
  runCheckedStage,
  throwIfAborted,
  type DraftCheck,
  type JsonObject,
} from "./staged-runtime";
import { planVillainAxes, type VillainFinding } from "./villain-diversity";
import {
  assembleVillain,
  checkVillainConcept,
  checkVillainEnding,
  checkVillainOrganisation,
  checkVillainPlan,
  isRepairableField,
  problemKind,
  str,
  villainCoherenceFindings,
} from "./villain-staged-checks";
import type {
  VillainDrafts,
  VillainPlan,
  VillainRunState,
  VillainStageId,
  VillainStagedDeps,
  VillainStagedResult,
  VillainStagedStats,
} from "./villain-staged-contracts";
import {
  REPAIRABLE_FIELDS,
  VILLAIN_SYSTEM,
  conceptMessage,
  endingMessage,
  organisationMessage,
  planMessage,
  repairMessage,
  reviewMessage,
} from "./villain-staged-prompts";

export type {
  VillainStageId,
  VillainStagedDeps,
  VillainStagedResult,
  VillainStagedStats,
} from "./villain-staged-contracts";
export { villainStatsLog } from "./villain-staged-contracts";
export {
  assembleVillain,
  checkVillainConcept,
  checkVillainEnding,
  checkVillainOrganisation,
  checkVillainPlan,
  villainCoherenceFindings,
} from "./villain-staged-checks";

export const VILLAIN_STEPS: ReadonlyArray<{
  id: VillainStageId;
  label: string;
}> = [
  { id: "concept", label: "Goal, motive and fatal flaw" },
  { id: "organisation", label: "Organisation and inner circle" },
  { id: "plan", label: "A plan whose stages lead on" },
  { id: "ending", label: "Weak point, price of victory and finale" },
  { id: "coherence", label: "Checking it all fits together" },
];

const MAX_REVIEW_ISSUES = 5;
const MAX_REPAIR_LENGTH = 3000;

/**
 * Generate a villain in stages. `resolved` comes from the one-pass prompt
 * builder so a fallback to that route uses the same options.
 */
export async function generateVillainStaged(
  resolved: ResolvedVillain,
  deps: VillainStagedDeps,
): Promise<VillainStagedResult | null> {
  const now = deps.now ?? Date.now;
  const started = now();
  const stats: VillainStagedStats = {
    outcome: "fell-back",
    aiCalls: 0,
    elapsedMs: 0,
    repairedStages: [],
    coherenceRepaired: false,
    reviewIssues: [],
    reviewSkipped: false,
    remainingIssues: [],
  };
  const output = await runStaged(resolved, deps, stats);
  if (output) stats.outcome = "staged";
  stats.elapsedMs = now() - started;
  deps.onStats?.(stats);
  return output ? { output, stats } : null;
}

async function runStaged(
  resolved: ResolvedVillain,
  deps: VillainStagedDeps,
  stats: VillainStagedStats,
): Promise<PublicGeneratorOutput | null> {
  const plan: VillainPlan = {
    axes: planVillainAxes(
      resolved.archetype,
      resolved.genre,
      deps.rng ?? defaultRng,
    ),
    avoid: avoidNamesExcludingContext(
      deps.avoidNames ?? [],
      resolved.campaignContext,
    ),
  };
  const run: VillainRunState = {
    stats,
    progress: new StagedProgress(VILLAIN_STEPS, deps.onProgress),
    system: VILLAIN_SYSTEM,
  };
  const stage = createStageRunner(deps, run);
  throwIfAborted(deps.signal);

  const concept = await stage(
    "concept",
    conceptMessage(resolved, plan, deps),
    (d) => checkVillainConcept(d, plan.avoid, resolved.campaignContext),
  );
  if (!concept) return null;
  const organisation = await stage(
    "organisation",
    organisationMessage(resolved, plan, concept, deps),
    (d) => checkVillainOrganisation(d, plan.axes, plan.avoid),
  );
  if (!organisation) return null;
  const planStage = await stage(
    "plan",
    planMessage(resolved, plan, { concept, organisation }, deps),
    checkVillainPlan,
  );
  if (!planStage) return null;
  const ending = await stage(
    "ending",
    endingMessage(
      resolved,
      plan,
      { concept, organisation, plan: planStage },
      deps,
    ),
    checkVillainEnding,
  );
  if (!ending) return null;

  return finishCoherence(
    deps,
    run,
    { concept, organisation, plan: planStage, ending },
    resolved,
    plan,
  );
}

// fallow-ignore-next-line code-duplication
function createStageRunner(deps: VillainStagedDeps, run: VillainRunState) {
  return async (
    id: Exclude<VillainStageId, "coherence">,
    message: string,
    check: (data: JsonObject) => DraftCheck,
  ) => {
    let lastHard: string[] = [];
    const result = await runCheckedStage(
      async (systemInstruction, userMessage) => {
        // A retry may be unreadable and skip the check, so clear the prior
        // attempt's findings before asking the model again.
        lastHard = [];
        return deps.complete(systemInstruction, userMessage);
      },
      run,
      {
        id,
        system: run.system,
        message,
        check: (data) => {
          const found = check(data);
          lastHard = found.hard;
          return found;
        },
      },
      deps.signal,
    );
    if (!result) {
      run.stats.stoppedAt = id;
      // An unreadable reply never reaches the check, so say so.
      run.stats.stoppedProblems = lastHard.length
        ? [...new Set(lastHard.map(problemKind))]
        : ["the reply was not a usable JSON object"];
      if (deps.showReasons) {
        run.progress.set(
          id,
          "fallback",
          `${ONE_PASS_DETAIL} (${run.stats.stoppedProblems.join("; ")})`,
        );
      }
      return null;
    }
    throwIfAborted(deps.signal);
    return result.data;
  };
}

function render(
  drafts: VillainDrafts,
  plan: VillainPlan,
  resolved: ResolvedVillain,
): PublicGeneratorOutput | null {
  try {
    const output = parseVillainResponse(
      JSON.stringify(assembleVillain(drafts, plan.axes)),
      resolved,
    );
    return output.content.trim() && output.lore.trim() ? output : null;
  } catch {
    return null;
  }
}

/** Issues from a review reply: known fields only, at most five. */
function readReview(reply: string): VillainFinding[] | null {
  const data = readJsonObject(reply);
  if (!data || !Array.isArray(data.issues)) return null;
  return data.issues
    .map((raw) => {
      const issue = (raw ?? {}) as JsonObject;
      return { field: str(issue.field), problem: str(issue.problem) };
    })
    .filter((i) => isRepairableField(i.field) && i.problem)
    .slice(0, MAX_REVIEW_ISSUES);
}

/** The drafts with the model's replacement text applied, or null if none is usable. */
function applyFixes(
  drafts: VillainDrafts,
  reply: string,
): VillainDrafts | null {
  const fixes = readJsonObject(reply)?.fixes;
  if (!fixes || typeof fixes !== "object") return null;
  const next: VillainDrafts = {
    concept: { ...drafts.concept },
    organisation: { ...drafts.organisation },
    plan: { ...drafts.plan },
    ending: { ...drafts.ending },
  };
  let applied = 0;
  for (const [field, value] of Object.entries(fixes)) {
    if (!isRepairableField(field) || !str(value)) continue;
    // A repair rewrites one passage; a runaway reply is not one.
    if (str(value).length > MAX_REPAIR_LENGTH) continue;
    next[REPAIRABLE_FIELDS[field]][field] = str(value);
    applied++;
  }
  return applied ? next : null;
}

async function review(
  deps: VillainStagedDeps,
  run: VillainRunState,
  resolved: ResolvedVillain,
  drafts: VillainDrafts,
  findings: VillainFinding[],
  grounding: string,
): Promise<VillainFinding[] | null> {
  try {
    return await askModel(
      () => {
        run.stats.aiCalls++;
        return deps.complete(
          run.system,
          reviewMessage(resolved, drafts, findings, grounding),
        );
      },
      readReview,
      { signal: deps.signal, attempts: 2 },
    );
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return null;
  }
}

async function repair(
  deps: VillainStagedDeps,
  run: VillainRunState,
  drafts: VillainDrafts,
  issues: VillainFinding[],
  grounding: string,
): Promise<VillainDrafts | null> {
  try {
    return await askModel(
      () => {
        run.stats.aiCalls++;
        return deps.complete(
          run.system,
          repairMessage(drafts, issues, grounding),
        );
      },
      (reply) => applyFixes(drafts, reply),
      { signal: deps.signal, attempts: 2 },
    );
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return null;
  }
}

/** Ask for a review and a repair of what it and the checks found; null when none was applied. */
async function reviewAndRepair(
  deps: VillainStagedDeps,
  run: VillainRunState,
  drafts: VillainDrafts,
  resolved: ResolvedVillain,
  before: VillainFinding[],
): Promise<{ fixed: VillainDrafts | null }> {
  // The caller's context chain already carries any instructions; the public
  // page has only the campaign context field.
  const grounding =
    deps.contextPrefix || formatCampaignContextBlock(resolved.campaignContext);
  const reviewed = await review(deps, run, resolved, drafts, before, grounding);
  throwIfAborted(deps.signal);
  if (reviewed === null) run.stats.reviewSkipped = true;
  else run.stats.reviewIssues = reviewed.map((i) => i.problem);

  const issues = [...before, ...(reviewed ?? [])];
  if (!issues.length) return { fixed: null };
  run.progress.set("coherence", "active", FIXING_DETAIL);
  const fixed = await repair(deps, run, drafts, issues, grounding);
  throwIfAborted(deps.signal);
  return { fixed };
}

async function finishCoherence(
  deps: VillainStagedDeps,
  run: VillainRunState,
  drafts: VillainDrafts,
  resolved: ResolvedVillain,
  plan: VillainPlan,
): Promise<PublicGeneratorOutput | null> {
  run.progress.set("coherence", "active");
  let output = render(drafts, plan, resolved);
  if (!output) {
    run.progress.abandon("coherence", ONE_PASS_DETAIL);
    run.stats.stoppedAt = "assembly";
    return null;
  }
  const before = villainCoherenceFindings(drafts);
  const { fixed } = await reviewAndRepair(deps, run, drafts, resolved, before);
  let remaining = before;
  const repaired = fixed ? render(fixed, plan, resolved) : null;
  const after = fixed ? villainCoherenceFindings(fixed) : before;
  // A repair that does not parse, or adds problems, is thrown away.
  if (fixed && repaired && after.length <= before.length) {
    output = repaired;
    remaining = after;
    run.stats.coherenceRepaired = true;
  }
  run.stats.remainingIssues = remaining.map((f) => f.problem);
  run.progress.set("coherence", "done");
  return output;
}
