import { describe, expect, it } from "vitest";
import {
  getUnseenFeedback,
  isAutoMergeEligible,
  markFeedbackHandled,
  type PrAutomationState,
} from "./pr-review-automation-state.ts";
import type { PrFeedback } from "./pr-check-fix.ts";

const feedback: PrFeedback = {
  prMeta: {
    number: 2868,
    title: "Webhook listener",
    headRefName: "feat/pr-review-webhook",
    headRefOid: "head-1",
    baseRefName: "staging",
    url: "https://example.test/pr/2868",
    state: "OPEN",
    mergeable: "MERGEABLE",
    reviewDecision: "APPROVED",
    isDraft: false,
  },
  unresolvedComments: [
    {
      id: 10,
      path: "scripts/example.ts",
      line: 1,
      body: "Fix this",
      author: "copilot",
    },
  ],
  reviews: [],
  failingChecks: [],
  pendingChecks: [],
  hasActionableFeedback: true,
};

const emptyState = (): PrAutomationState => ({ version: 1, pullRequests: {} });

describe("PR review automation state", () => {
  it("does not re-run feedback handled on an earlier event", () => {
    const state = markFeedbackHandled(feedback, emptyState());

    expect(getUnseenFeedback(feedback, state)).toEqual({
      comments: [],
      reviews: [],
      checks: [],
      hasActionableFeedback: false,
    });
  });

  it("still treats a newly added comment as actionable", () => {
    const state = markFeedbackHandled(feedback, emptyState());
    const withNewComment: PrFeedback = {
      ...feedback,
      unresolvedComments: [
        ...feedback.unresolvedComments,
        {
          id: 11,
          path: "scripts/example.ts",
          line: 2,
          body: "Also fix this",
          author: "copilot",
        },
      ],
    };

    expect(
      getUnseenFeedback(withNewComment, state).comments.map(
        (comment) => comment.id,
      ),
    ).toEqual([11]);
  });

  it("only permits auto-merge for a settled staging PR", () => {
    const unseen = getUnseenFeedback(
      { ...feedback, hasActionableFeedback: false, unresolvedComments: [] },
      emptyState(),
    );
    const settled: PrFeedback = {
      ...feedback,
      hasActionableFeedback: false,
      unresolvedComments: [],
    };

    expect(isAutoMergeEligible(settled, unseen)).toBe(true);
    expect(
      isAutoMergeEligible(
        {
          ...settled,
          pendingChecks: [
            { name: "CI", state: "IN_PROGRESS", bucket: "pending", link: "" },
          ],
        },
        unseen,
      ),
    ).toBe(false);
  });
});
