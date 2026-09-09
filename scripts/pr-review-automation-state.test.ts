import { describe, expect, it } from "vitest";
import {
  getUnseenFeedback,
  hasFixEvidence,
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
      hasMergeConflict: false,
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

  it("requires observable resolution for review feedback", () => {
    expect(hasFixEvidence(feedback, feedback)).toBe(false);
    expect(
      hasFixEvidence(feedback, {
        ...feedback,
        prMeta: { ...feedback.prMeta, headRefOid: "head-2" },
      }),
    ).toBe(false);
  });

  it("accepts a new head as evidence for a conflict-only run", () => {
    const conflictOnly: PrFeedback = {
      ...feedback,
      unresolvedComments: [],
      reviews: [],
      failingChecks: [],
      hasActionableFeedback: true,
      prMeta: { ...feedback.prMeta, mergeable: "CONFLICTING" },
    };

    expect(
      hasFixEvidence(conflictOnly, {
        ...conflictOnly,
        prMeta: { ...conflictOnly.prMeta, headRefOid: "head-2" },
      }),
    ).toBe(true);
  });

  it("does not make a commented review actionable by itself", () => {
    const withCommentedReview: PrFeedback = {
      ...feedback,
      unresolvedComments: [],
      reviews: [
        {
          id: "review-commented",
          state: "COMMENTED",
          author: "copilot",
          body: "Overview only",
        },
      ],
      hasActionableFeedback: false,
    };

    expect(
      getUnseenFeedback(withCommentedReview, emptyState())
        .hasActionableFeedback,
    ).toBe(false);
  });

  it("treats a merge conflict as actionable even without a reviewer comment", () => {
    const conflicted: PrFeedback = {
      ...feedback,
      unresolvedComments: [],
      hasActionableFeedback: true,
      prMeta: { ...feedback.prMeta, mergeable: "CONFLICTING" },
    };

    expect(getUnseenFeedback(conflicted, emptyState()).hasMergeConflict).toBe(
      true,
    );
    expect(
      getUnseenFeedback(conflicted, emptyState()).hasActionableFeedback,
    ).toBe(true);
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
