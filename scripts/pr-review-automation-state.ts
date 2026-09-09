import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import type { PrCheck, PrFeedback } from "./pr-check-fix.ts";

export interface PrAutomationRecord {
  handledCommentIds: number[];
  handledReviewIds: string[];
  handledCheckKeys: string[];
  /** The head SHA that has completed the local two-pass agent review. */
  lastInternalReviewHeadSha?: string;
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
  hasMergeConflict: boolean;
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
    (review) =>
      review.state === "CHANGES_REQUESTED" && !handledReviews.has(review.id),
  );
  const checks = feedback.failingChecks.filter(
    (check) => !handledChecks.has(getCheckKey(headSha, check)),
  );

  const hasMergeConflict =
    feedback.prMeta.mergeable === "CONFLICTING" ||
    feedback.prMeta.mergeStateStatus === "DIRTY";

  return {
    comments,
    reviews,
    checks,
    hasMergeConflict,
    hasActionableFeedback:
      comments.length > 0 ||
      reviews.length > 0 ||
      checks.length > 0 ||
      hasMergeConflict,
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

/**
 * Only suppress feedback after the fixer has produced observable evidence:
 * a new pushed head, or every originally actionable item is no longer open.
 */
export function hasFixEvidence(before: PrFeedback, after: PrFeedback): boolean {
  const openCommentIds = new Set(
    after.unresolvedComments.map((comment) => comment.id),
  );
  const resolvedComments = before.unresolvedComments.every(
    (comment) => !openCommentIds.has(comment.id),
  );
  const openFailures = new Set(
    after.failingChecks.map(
      (check) => `${check.workflow ?? ""}:${check.name}:${check.state}`,
    ),
  );
  const resolvedFailures = before.failingChecks.every(
    (check) =>
      !openFailures.has(`${check.workflow ?? ""}:${check.name}:${check.state}`),
  );
  const openChangesRequested = new Set(
    after.reviews
      .filter((review) => review.state === "CHANGES_REQUESTED")
      .map((review) => review.id),
  );
  const resolvedReviews = before.reviews
    .filter((review) => review.state === "CHANGES_REQUESTED")
    .every((review) => !openChangesRequested.has(review.id));

  const hadReviewFeedback = before.reviews.some(
    (review) => review.state === "CHANGES_REQUESTED",
  );
  const hadExplicitFeedback =
    before.unresolvedComments.length > 0 ||
    before.failingChecks.length > 0 ||
    hadReviewFeedback;
  if (!hadExplicitFeedback) {
    return before.prMeta.headRefOid !== after.prMeta.headRefOid;
  }

  return resolvedComments && resolvedFailures && resolvedReviews;
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

export function isInternalReviewDue(
  feedback: PrFeedback,
  unseen: UnseenFeedback,
  state: PrAutomationState,
): boolean {
  const record = getRecord(state, feedback.prMeta.number);
  return (
    feedback.prMeta.state === "OPEN" &&
    feedback.prMeta.baseRefName === "staging" &&
    !feedback.prMeta.isDraft &&
    feedback.prMeta.mergeable === "MERGEABLE" &&
    feedback.prMeta.reviewDecision !== "CHANGES_REQUESTED" &&
    feedback.failingChecks.length === 0 &&
    feedback.pendingChecks.length === 0 &&
    !unseen.hasActionableFeedback &&
    record.lastInternalReviewHeadSha !== feedback.prMeta.headRefOid
  );
}

export function markInternalReviewCompleted(
  state: PrAutomationState,
  prNumber: number,
  headSha: string,
): PrAutomationState {
  const record = getRecord(state, prNumber);
  state.pullRequests[String(prNumber)] = {
    ...record,
    lastInternalReviewHeadSha: headSha,
  };
  return state;
}

export function isAutoMergeEligible(
  feedback: PrFeedback,
  unseen: UnseenFeedback,
  state: PrAutomationState,
): boolean {
  const record = getRecord(state, feedback.prMeta.number);
  return (
    feedback.prMeta.state === "OPEN" &&
    feedback.prMeta.baseRefName === "staging" &&
    !feedback.prMeta.isDraft &&
    feedback.prMeta.mergeable === "MERGEABLE" &&
    feedback.prMeta.reviewDecision !== "CHANGES_REQUESTED" &&
    feedback.failingChecks.length === 0 &&
    feedback.pendingChecks.length === 0 &&
    !unseen.hasActionableFeedback &&
    record.lastInternalReviewHeadSha === feedback.prMeta.headRefOid
  );
}
