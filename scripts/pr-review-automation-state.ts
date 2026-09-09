import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import type { PrCheck, PrFeedback } from "./pr-check-fix.ts";

export interface PrAutomationRecord {
  handledCommentIds: number[];
  handledReviewIds: string[];
  handledCheckKeys: string[];
  lastAutoMergeHeadSha?: string;
}

export interface PrAutomationState {
  version: 1;
  pullRequests: Record<string, PrAutomationRecord>;
}

export interface UnseenFeedback {
  comments: PrFeedback["unresolvedComments"];
  reviews: PrFeedback["reviews"];
  checks: PrCheck[];
  hasActionableFeedback: boolean;
}

const EMPTY_STATE: PrAutomationState = { version: 1, pullRequests: {} };

export function getPrAutomationStatePath(): string {
  return (
    process.env.PR_AUTOMATION_STATE_FILE ??
    resolve(homedir(), ".local/state/codex-pr-review/feedback-state.json")
  );
}

export async function loadPrAutomationState(
  path = getPrAutomationStatePath(),
): Promise<PrAutomationState> {
  try {
    const parsed = JSON.parse(
      await readFile(path, "utf8"),
    ) as PrAutomationState;
    if (parsed.version === 1 && parsed.pullRequests) return parsed;
  } catch {
    // The first run has no state file, and corrupt state should not stop PR fixes.
  }
  return structuredClone(EMPTY_STATE);
}

export async function savePrAutomationState(
  state: PrAutomationState,
  path = getPrAutomationStatePath(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function getRecord(
  state: PrAutomationState,
  prNumber: number,
): PrAutomationRecord {
  return (
    state.pullRequests[String(prNumber)] ?? {
      handledCommentIds: [],
      handledReviewIds: [],
      handledCheckKeys: [],
    }
  );
}

export function getCheckKey(headSha: string, check: PrCheck): string {
  return `${headSha}:${check.workflow ?? ""}:${check.name}:${check.state}`;
}

export function getUnseenFeedback(
  feedback: PrFeedback,
  state: PrAutomationState,
): UnseenFeedback {
  const record = getRecord(state, feedback.prMeta.number);
  const handledComments = new Set(record.handledCommentIds);
  const handledReviews = new Set(record.handledReviewIds);
  const handledChecks = new Set(record.handledCheckKeys);
  const headSha = feedback.prMeta.headRefOid;

  const comments = feedback.unresolvedComments.filter(
    (comment) => !handledComments.has(comment.id),
  );
  const reviews = feedback.reviews.filter(
    (review) => !handledReviews.has(review.id),
  );
  const checks = feedback.failingChecks.filter(
    (check) => !handledChecks.has(getCheckKey(headSha, check)),
  );

  return {
    comments,
    reviews,
    checks,
    hasActionableFeedback:
      comments.length > 0 || reviews.length > 0 || checks.length > 0,
  };
}

export function markFeedbackHandled(
  feedback: PrFeedback,
  state: PrAutomationState,
): PrAutomationState {
  const record = getRecord(state, feedback.prMeta.number);
  state.pullRequests[String(feedback.prMeta.number)] = {
    ...record,
    handledCommentIds: Array.from(
      new Set([
        ...record.handledCommentIds,
        ...feedback.unresolvedComments.map((comment) => comment.id),
      ]),
    ),
    handledReviewIds: Array.from(
      new Set([
        ...record.handledReviewIds,
        ...feedback.reviews.map((review) => review.id),
      ]),
    ),
    handledCheckKeys: Array.from(
      new Set([
        ...record.handledCheckKeys,
        ...feedback.failingChecks.map((check) =>
          getCheckKey(feedback.prMeta.headRefOid, check),
        ),
      ]),
    ),
  };
  return state;
}

export function markAutoMergeRequested(
  state: PrAutomationState,
  prNumber: number,
  headSha: string,
): PrAutomationState {
  const record = getRecord(state, prNumber);
  state.pullRequests[String(prNumber)] = {
    ...record,
    lastAutoMergeHeadSha: headSha,
  };
  return state;
}

export function isAutoMergeEligible(
  feedback: PrFeedback,
  unseen: UnseenFeedback,
): boolean {
  return (
    feedback.prMeta.state === "OPEN" &&
    feedback.prMeta.baseRefName === "staging" &&
    !feedback.prMeta.isDraft &&
    feedback.prMeta.mergeable === "MERGEABLE" &&
    feedback.prMeta.reviewDecision !== "CHANGES_REQUESTED" &&
    feedback.failingChecks.length === 0 &&
    feedback.pendingChecks.length === 0 &&
    !unseen.hasActionableFeedback
  );
}
