/** Review and conditionally repair the assembled dungeon, preserving a usable draft. */
import {
  asArray as arr,
  asRecord as rec,
  parseFencedJson,
} from "./llm-response-utils";
import { textList } from "./dungeon-stage-data";
import { checkFactionGrounding } from "./dungeon-faction-grounding";
import { checkTerritoryAccess } from "./dungeon-territory-access";
import { REVIEW_SYSTEM, reviewMessage } from "./dungeon-stage-prompts";
import { FIXING_DETAIL } from "./staged-progress";
import {
  askModel,
  isAbort,
  readJsonObject,
  throwIfAborted,
} from "./staged-runtime";
import {
  buildDungeonCoherencePrompt,
  parseDungeonResponseDetailed,
  type DungeonParseResult,
  type DungeonJson,
  type DungeonGeneratorOptions,
  type ResolvedDungeon,
} from "./public-dungeon";
import type { Rng } from "./random-utils";
import type { DungeonStagedDeps, RunState } from "./dungeon-staged-types";

/** Deterministic problems in an assembled delve. */
function issuesOf(d: DungeonJson, resolved: ResolvedDungeon): string[] {
  const factions = d.factions.map((f) => ({
    ...f,
    presence: d.sectors.flatMap((s) =>
      (s.presence ?? [])
        .filter((p) => p.faction === f.name)
        .map((p) => p.detail),
    ),
  }));
  return [
    ...checkFactionGrounding(factions, d.factionSituation, d),
    ...checkTerritoryAccess(factions, d.sectors, resolved.sectorEdges),
  ];
}

/**
 * A model review of the assembled delve for the problems the deterministic
 * checks cannot see, retried once like every stage. Returns no issues when
 * both attempts fail or are unreadable; a missing review never blocks the
 * result.
 */
async function reviewCoherence(
  deps: DungeonStagedDeps,
  { stats }: RunState,
  d: DungeonJson,
  resolved: ResolvedDungeon,
): Promise<string[]> {
  const message = reviewMessage(d, resolved, deps.contextPrefix);
  const issues = await askModel(
    () => {
      stats.aiCalls++;
      return deps.complete(REVIEW_SYSTEM, message);
    },
    (reply) => {
      const data = readJsonObject(reply);
      return data && Array.isArray(data.issues)
        ? textList(data.issues).slice(0, 5)
        : null;
    },
    { signal: deps.signal, attempts: 2 },
  );
  if (issues) return issues;
  stats.reviewSkipped = true;
  return [];
}

/** Keep each sector's presence when the repair answer leaves it out. */
function keepPresence(reply: string, before: DungeonJson): string {
  let parsed: unknown;
  try {
    parsed = parseFencedJson<unknown>(reply);
  } catch {
    return reply;
  }
  const d = rec(parsed);
  if (!Array.isArray(d.sectors)) return reply;
  d.sectors = d.sectors.map((s, i) => {
    const sector = rec(s);
    const presence = before.sectors[i]?.presence;
    return arr(sector.presence).length === 0 && presence
      ? { ...sector, presence }
      : sector;
  });
  return JSON.stringify(d);
}

/** One repair request; ordinary call failures leave the current draft usable. */
async function requestCoherenceRepair(
  deps: DungeonStagedDeps,
  { stats }: RunState,
  current: DungeonJson,
  resolved: ResolvedDungeon,
  issues: string[],
): Promise<string | null> {
  const repair = buildDungeonCoherencePrompt(current, resolved);
  stats.aiCalls++;
  let reply: string;
  try {
    reply = await deps.complete(
      repair.systemInstruction,
      `${repair.userMessage}

Known problems to fix (touch only what these require):
${issues.map((p) => `- ${p}`).join("\n")}

Keep each sector's "presence" entries, updating a faction name there if you rename the faction.`,
    );
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    return null;
  }
  throwIfAborted(deps.signal);
  return reply;
}

/**
 * Stage 4 repair: one call over the whole document with the known problems
 * named, using the existing proofreading prompt. Kept only if it parses and
 * does not add deterministic problems; with no review findings it must also
 * remove some, since then there is nothing else it could have fixed.
 */
async function repairCoherence(
  deps: DungeonStagedDeps,
  { stats, progress }: RunState,
  current: DungeonParseResult,
  found: { checks: string[]; review: string[] },
  context: {
    options: DungeonGeneratorOptions;
    resolved: ResolvedDungeon;
    rng: Rng;
  },
): Promise<{ result: DungeonParseResult; issues: string[] }> {
  const unchanged = {
    result: current,
    issues: [...found.checks, ...found.review],
  };
  throwIfAborted(deps.signal);
  progress.set("coherence", "active", FIXING_DETAIL);
  const reply = await requestCoherenceRepair(
    deps,
    { stats, progress },
    current.structured!,
    context.resolved,
    unchanged.issues,
  );
  if (reply === null) return unchanged;
  const repaired = parseDungeonResponseDetailed(
    keepPresence(reply, current.structured!),
    context.options,
    context.rng,
    context.resolved,
  );
  if (repaired.rejected || !repaired.structured) return unchanged;
  const left = issuesOf(repaired.structured, context.resolved);
  const better =
    left.length < found.checks.length ||
    (left.length <= found.checks.length && found.review.length > 0);
  if (!better) return unchanged;
  stats.coherenceRepaired = true;
  return { result: repaired, issues: left };
}

/** Finish the coherence step without discarding the assembled draft on review failure. */
export async function finishDungeonCoherence(
  deps: DungeonStagedDeps,
  run: RunState,
  current: DungeonParseResult,
  context: {
    options: DungeonGeneratorOptions;
    resolved: ResolvedDungeon;
    rng: Rng;
  },
): Promise<DungeonParseResult> {
  const checks = issuesOf(current.structured!, context.resolved);
  throwIfAborted(deps.signal);
  const review = await reviewCoherence(
    deps,
    run,
    current.structured!,
    context.resolved,
  );
  run.stats.reviewIssues = review;
  let final = current;
  let issues = [...checks, ...review];
  if (issues.length > 0) {
    ({ result: final, issues } = await repairCoherence(
      deps,
      run,
      final,
      { checks, review },
      context,
    ));
  }
  run.stats.remainingIssues = issues;
  run.progress.set("coherence", "done");
  return final;
}
