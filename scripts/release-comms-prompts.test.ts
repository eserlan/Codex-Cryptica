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
    bluesky: [
      {
        pageUrl: "https://codexcryptica.com/answers/faction-roster",
        text: "post one",
      },
    ],
    discord: "discord draft",
    reddit: "",
    github_discussions: [],
  };

  it("keeps blank-line separators between sections", () => {
    const comment = formatIssueComment(entry as never, result, drafts, {
      queued: 1,
      commitUrl: "https://example.com/commit/abc",
    });
    expect(comment).toContain(
      "Why it is worth posting:\nnew generator\n\nBluesky",
    );
    expect(comment).toContain(
      "Discord:\ndiscord draft\n\nInstagram (published automatically when recommended; shown here for reference):\n(no resolved Bluesky handoff is available)\n\nReddit:",
    );
  });

  it("lists the exact public page for each Bluesky draft", () => {
    const comment = formatIssueComment(entry as never, result, drafts, null);
    expect(comment).toContain(
      "1. post one (https://codexcryptica.com/answers/faction-roster)\n\nDiscord:",
    );
  });

  it("lists durable publication URLs", () => {
    const comment = formatIssueComment(
      {
        ...entry,
        publications: {
          bluesky: [
            {
              pageUrl: "https://codexcryptica.com/answers/faction-roster",
              url: "https://bsky.app/profile/test/post/1",
            },
          ],
          githubDiscussions: [],
        },
      } as never,
      result,
      drafts,
      null,
    );
    expect(comment).toContain("https://bsky.app/profile/test/post/1");
  });

  it("reports drafts as unavailable when the writer pass fails on a postworthy release", () => {
    const comment = formatIssueComment(entry as never, result, null, null);
    expect(comment).toContain("drafts unavailable");
    expect(comment).toContain(
      "The evaluator marked this postworthy, but the writer pass failed to produce drafts.",
    );
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
