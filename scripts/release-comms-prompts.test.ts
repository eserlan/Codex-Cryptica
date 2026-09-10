import { describe, it, expect } from "vitest";
import { formatIssueComment } from "./release-comms-prompts.ts";
import type { EvaluatorResult, WriterResult } from "./release-comms-types.ts";

describe("formatIssueComment", () => {
  const entry = {
    sha: "abcdef1234567890",
    date: "2026-09-10T00:00:00.000Z",
    postworthy: true,
  };
  const result: EvaluatorResult = {
    postworthy: true,
    importance: "medium",
    features: [{ name: "Faction Roster Generator", why_users_care: "x" }],
    recommended_channels: ["discord"],
    reason: "new generator",
  };
  const drafts: WriterResult = {
    bluesky: ["post one"],
    discord: "discord draft",
    reddit: "",
    github_discussion: "",
  };

  it("keeps blank-line separators between sections", () => {
    const comment = formatIssueComment(entry as never, result, drafts, {
      queued: 1,
      commitUrl: "https://example.com/commit/abc",
    });
    expect(comment).toContain(
      "Why it is worth posting:\nnew generator\n\nBluesky",
    );
    expect(comment).toContain("Discord:\ndiscord draft\n\nReddit:");
  });

  it("omits the queue line without collapsing surrounding blank lines when there is no queueResult", () => {
    const comment = formatIssueComment(entry as never, result, drafts, null);
    expect(comment).toContain("1. post one\n\nDiscord:");
  });

  it("includes an error line when queueing failed", () => {
    const comment = formatIssueComment(entry as never, result, drafts, {
      queued: 0,
      error: "push rejected",
    });
    expect(comment).toContain("Could not auto-queue the Bluesky draft(s)");
  });

  it("omits the queue line entirely when there are no bluesky drafts", () => {
    const noBluesky: WriterResult = { ...drafts, bluesky: [] };
    const comment = formatIssueComment(entry as never, result, noBluesky, {
      queued: 0,
      error: "should not appear",
    });
    expect(comment).toContain(
      "(no feature in this release was marked bluesky_worthy)\n\nDiscord:",
    );
  });
});
