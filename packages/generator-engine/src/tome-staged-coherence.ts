import { FIXING_DETAIL, ONE_PASS_DETAIL } from "./staged-progress";
import { isAbort, throwIfAborted, type JsonObject } from "./staged-runtime";
import {
  auditTomeConsistency,
  parseTomeResponse,
  type ResolvedTome,
  type TomeConsistencyAuditResult,
} from "./public-tome";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { TomeRunState, TomeStagedDeps } from "./tome-staged-contracts";
import { tomeRepairPrompt } from "./tome-staged-prompts";

export async function finishTomeCoherence(
  deps: TomeStagedDeps,
  run: TomeRunState,
  assembled: JsonObject,
  resolved: ResolvedTome,
  reviewContext = "",
): Promise<PublicGeneratorOutput | null> {
  run.progress.set("hooks", "active");
  let output: PublicGeneratorOutput;
  try {
    output = parseTomeResponse(JSON.stringify(assembled), resolved, true);
    if (!output.content.trim() || !output.lore.trim()) {
      throw new Error("Assembled tome content or lore is empty.");
    }
  } catch {
    run.progress.abandon("hooks", ONE_PASS_DETAIL);
    run.stats.stoppedAt = "assembly";
    return null;
  }

  const before: TomeConsistencyAuditResult = auditTomeConsistency(
    output,
    resolved,
  );
  run.stats.reviewIssues = before.issues;

  throwIfAborted(deps.signal);

  const needsFixing = !before.valid || before.issues.length > 0;

  if (needsFixing) {
    output = await repairTome(
      deps,
      run,
      assembled,
      output,
      before,
      resolved,
      reviewContext,
    );
  } else {
    run.stats.remainingIssues = before.issues;
  }

  run.progress.set("hooks", "done");
  return output;
}

async function repairTome(
  deps: TomeStagedDeps,
  run: TomeRunState,
  assembled: JsonObject,
  output: PublicGeneratorOutput,
  before: TomeConsistencyAuditResult,
  resolved: ResolvedTome,
  reviewContext: string,
): Promise<PublicGeneratorOutput> {
  run.progress.set("hooks", "active", FIXING_DETAIL);
  try {
    run.stats.aiCalls++;
    const repairPrompt = tomeRepairPrompt(
      assembled,
      before.issues,
      before.warnings,
      resolved,
      reviewContext,
    );
    const repairReply = await deps.complete(
      "You are an assistant that repairs RPG forbidden books and occult manuscripts in JSON format.",
      repairPrompt,
    );
    throwIfAborted(deps.signal);
    const repaired = parseTomeResponse(repairReply, resolved, true);
    const after = auditTomeConsistency(repaired, resolved);

    if (after.issues.length <= before.issues.length) {
      output = repaired;
      run.stats.coherenceRepaired = true;
      run.stats.remainingIssues = after.issues;
    } else {
      run.stats.remainingIssues = before.issues;
    }
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    run.stats.remainingIssues = before.issues;
  }
  return output;
}
