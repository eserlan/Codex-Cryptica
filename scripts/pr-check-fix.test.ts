import { describe, it, expect } from "vitest";
import {
  buildPrFixPrompt,
  getRepoSlug,
  type PrFeedback,
} from "./pr-check-fix.ts";

describe("pr-check-fix", () => {
  const sampleFeedback: PrFeedback = {
    prMeta: {
      number: 1234,
      title: "Test PR Degodification",
      headRefName: "curator/degod-sample-1234",
      baseRefName: "staging",
      url: "https://github.com/eserlan/Codex-Cryptica/pull/1234",
      state: "OPEN",
      mergeable: "MERGEABLE",
    },
    unresolvedComments: [
      {
        id: 101,
        path: "apps/web/src/sample.ts",
        line: 42,
        body: "Guard out-of-bounds index before accessing array.",
        author: "Copilot",
      },
    ],
    reviews: [
      {
        id: "rev-1",
        state: "CHANGES_REQUESTED",
        author: "copilot-reviewer",
        body: "Please fix boundary conditions in sample operations.",
      },
    ],
    failingChecks: [
      {
        name: "Type Check",
        state: "FAILURE",
        bucket: "fail",
        link: "https://github.com/runs/123",
        workflow: "CI",
      },
    ],
    pendingChecks: [],
    hasActionableFeedback: true,
  };

  describe("buildPrFixPrompt", () => {
    it("formats review comments, checks, and strict quality instructions", () => {
      const prompt = buildPrFixPrompt(
        sampleFeedback,
        "curator/degod-sample-1234",
        "staging",
      );

      expect(prompt).toContain("Pull Request #1234");
      expect(prompt).toContain("curator/degod-sample-1234");
      expect(prompt).toContain("Guard out-of-bounds index before accessing array.");
      expect(prompt).toContain("apps/web/src/sample.ts:42");
      expect(prompt).toContain("Type Check");
      expect(prompt).toContain("bun run lint:types");
      expect(prompt).toContain("bun run lint");
      expect(prompt).toContain("--no-verify");
      expect(prompt).toContain("♻️ refactor: address PR #1234 review comments");
    });

    it("handles feedback with no failing checks or reviews gracefully", () => {
      const minimalFeedback: PrFeedback = {
        ...sampleFeedback,
        reviews: [],
        failingChecks: [],
      };

      const prompt = buildPrFixPrompt(
        minimalFeedback,
        "curator/degod-sample-1234",
        "staging",
      );

      expect(prompt).toContain("FAILING CI CHECKS:\n_None_");
      expect(prompt).toContain("GENERAL REVIEWS:\n_None_");
      expect(prompt).toContain("Guard out-of-bounds index");
    });
  });

  describe("getRepoSlug", () => {
    it("returns repository slug string", () => {
      const slug = getRepoSlug(process.cwd());
      expect(slug).toContain("/");
      expect(slug.split("/").length).toBe(2);
    });
  });
});
