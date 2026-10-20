import { FIXING_DETAIL, ONE_PASS_DETAIL } from "./staged-progress";
import { isAbort, throwIfAborted, type JsonObject } from "./staged-runtime";
import {
  buildHeistAuditPrompt,
  buildHeistRepairPrompt,
  parseHeistAuditResponse,
  parseHeistResponse,
  type HeistSemanticAudit,
  type ResolvedHeist,
} from "./public-heist";
import { validateHeist, type HeistFinding } from "./heist-validation";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { HeistRunState, HeistStagedDeps } from "./heist-staged-contracts";

export async function finishHeistCoherence(
  deps: HeistStagedDeps,
  run: HeistRunState,
  assembled: JsonObject,
  resolved: ResolvedHeist,
  reviewContext = "",
): Promise<PublicGeneratorOutput | null> {
  run.progress.set("coherence", "active");
  let output: PublicGeneratorOutput;
  try {
    output = parseHeistResponse(JSON.stringify(assembled), resolved);
    if (!output.content.trim() || !output.lore.trim()) {
      throw new Error("Assembled heist content or lore is empty.");
    }
  } catch {
    run.progress.abandon("coherence", ONE_PASS_DETAIL);
    run.stats.stoppedAt = "assembly";
    return null;
  }

  const before = validateOutput(output, resolved);

  throwIfAborted(deps.signal);

  const { audit, auditError } = await auditHeist(
    deps,
    run,
    output,
    before,
    resolved,
    reviewContext,
  );
  throwIfAborted(deps.signal);

  const needsFixing =
    (audit && (audit.verdict === "repair" || audit.issues.length > 0)) ||
    before.some((f) => f.severity === "structural");

  if (audit && audit.issues) {
    run.stats.reviewIssues = audit.issues.map((i) => i.problem);
  } else if (auditError) {
    run.stats.reviewSkipped = true;
  }

  if (needsFixing) {
    output = await repairHeist(deps, run, output, before, audit, resolved);
  } else {
    run.stats.remainingIssues = before.map((f) => f.message);
  }

  run.progress.set("coherence", "done");
  return output;
}

function validateOutput(
  output: PublicGeneratorOutput,
  resolved: ResolvedHeist,
): HeistFinding[] {
  return validateHeist({
    heistType: resolved.heistType,
    genre: resolved.genre,
    content: output.content,
    lore: output.lore,
  });
}

async function auditHeist(
  deps: HeistStagedDeps,
  run: HeistRunState,
  output: PublicGeneratorOutput,
  before: HeistFinding[],
  resolved: ResolvedHeist,
  reviewContext: string,
) {
  let audit: HeistSemanticAudit | null = null;
  let auditError = false;
  try {
    run.stats.aiCalls++;
    const auditPrompt = buildHeistAuditPrompt(
      output,
      before,
      resolved,
      reviewContext,
    );
    const auditReply = await deps.complete(
      "You are an assistant that audits RPG heist scenarios in JSON format.",
      auditPrompt,
    );
    throwIfAborted(deps.signal);
    audit = parseHeistAuditResponse(auditReply);
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    auditError = true;
  }

  return { audit, auditError };
}

function deterministicAudit(
  output: PublicGeneratorOutput,
  before: HeistFinding[],
  resolved: ResolvedHeist,
): HeistSemanticAudit {
  return {
    verdict: "repair",
    fullScore: output.summary || resolved.title,
    transitions: [
      {
        event: "Objective completion",
        stateBefore: "Infiltration",
        stateAfter: "Escape",
        factsChanged: ["objective: completed"],
      },
    ],
    issues: before.map((f, i) => ({
      id: `det-${i + 1}`,
      sections: ["General"],
      problem: f.message,
      requiredFact: "Resolve this issue while preserving scenario invariants.",
    })),
  };
}

function structuralCount(list: HeistFinding[]): number {
  return list.filter((f) => f.severity === "structural").length;
}

async function repairHeist(
  deps: HeistStagedDeps,
  run: HeistRunState,
  output: PublicGeneratorOutput,
  before: HeistFinding[],
  audit: HeistSemanticAudit | null,
  resolved: ResolvedHeist,
): Promise<PublicGeneratorOutput> {
  run.progress.set("coherence", "active", FIXING_DETAIL);
  try {
    run.stats.aiCalls++;
    const effectiveAudit =
      audit ?? deterministicAudit(output, before, resolved);
    const repairPrompt = buildHeistRepairPrompt(
      effectiveAudit,
      before,
      resolved,
    );
    const repairReply = await deps.complete(
      "You are an assistant that repairs RPG heist scenarios in JSON format.",
      repairPrompt,
    );
    throwIfAborted(deps.signal);
    const repaired = parseHeistResponse(repairReply, resolved);
    const after = validateOutput(repaired, resolved);

    if (structuralCount(after) <= structuralCount(before)) {
      output = repaired;
      run.stats.coherenceRepaired = true;
      run.stats.remainingIssues = after.map((f) => f.message);
    } else {
      run.stats.remainingIssues = before.map((f) => f.message);
    }
  } catch (err) {
    if (isAbort(err, deps.signal)) throw err;
    run.stats.remainingIssues = before.map((f) => f.message);
  }
  return output;
}
