import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  buildPrFixPrompt,
  buildInternalPrReviewPrompt,
  getRepoSlug,
  getPrFixLogPath,
  runAgentWithLogging,
  type PrFeedback,
} from "./pr-check-fix.ts";

describe("pr-check-fix", () => {
  const sampleFeedback: PrFeedback = {
    prMeta: {
      number: 1234,
      title: "Test PR Degodification",
      headRefName: "curator/degod-sample-1234",
      headRefOid: "abc123",
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
      expect(prompt).toContain(
        "Guard out-of-bounds index before accessing array.",
      );
      expect(prompt).toContain("apps/web/src/sample.ts:42");
      expect(prompt).toContain("Type Check");
      expect(prompt).toContain("bun run lint:types");
      expect(prompt).toContain("bun run lint");
      expect(prompt).toContain("--no-verify");
      expect(prompt).toContain("♻️ refactor: address PR #1234 review comments");
      expect(prompt).toContain("HEAD:curator/degod-sample-1234");
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

  it("builds a two-pass internal review prompt that permits a clean no-op", () => {
    const prompt = buildInternalPrReviewPrompt(
      {
        ...sampleFeedback,
        unresolvedComments: [],
        reviews: [],
        failingChecks: [],
        hasActionableFeedback: false,
      },
      "curator/degod-sample-1234",
      "staging",
    );

    expect(prompt).toContain("GENERAL DEFECT REVIEW");
    expect(prompt).toContain("CODEX-CRYPTICA REVIEW");
    expect(prompt).toContain(".codex/skills/codex-review/SKILL.md");
    expect(prompt).toContain("make no changes and exit successfully");
    expect(prompt).toContain("bun run lint:types");
    expect(prompt).toContain("HEAD:curator/degod-sample-1234");
  });

  it("includes staging conflict paths and bounded failed-check details", () => {
    const prompt = buildPrFixPrompt(
      {
        ...sampleFeedback,
        failingChecks: [
          {
            ...sampleFeedback.failingChecks[0],
            failureDetails: "Type error at src/example.ts:12",
          },
        ],
      },
      "curator/degod-sample-1234",
      "staging",
      ["apps/web/src/example.ts"],
    );

    expect(prompt).toContain("STAGING MERGE CONFLICTS");
    expect(prompt).toContain("apps/web/src/example.ts");
    expect(prompt).toContain("Type error at src/example.ts:12");
    expect(prompt).toContain("Reply to each addressed inline review comment");
  });

  describe("getRepoSlug", () => {
    it("returns repository slug string", () => {
      const slug = getRepoSlug(process.cwd());
      expect(slug).toContain("/");
      expect(slug.split("/").length).toBe(2);
    });
  });

  describe("getPrFixLogPath", () => {
    it("creates a safe, per-PR log path", () => {
      expect(
        getPrFixLogPath(2868, "2026-09-09T13:19:48Z", "/tmp/pr-fix-logs"),
      ).toBe("/tmp/pr-fix-logs/pr-2868-2026-09-09T13-19-48Z.log");
    });

    it("keeps logs scoped to the configured directory", () => {
      expect(getPrFixLogPath(2868, "../../outside", "/tmp/pr-fix-logs")).toBe(
        "/tmp/pr-fix-logs/pr-2868-------outside.log",
      );
    });
  });

  describe("runAgentWithLogging", () => {
    it("forwards successful agent output and persists it", async () => {
      const logDir = await mkdtemp(join(tmpdir(), "pr-fix-test-"));
      const logPath = getPrFixLogPath(2868, "success", logDir);

      try {
        const result = await runAgentWithLogging(
          "/bin/sh",
          ["-c", "printf agent-output; printf agent-error >&2"],
          {
            cwd: process.cwd(),
            env: process.env,
            timeoutMs: 2_000,
            logPath,
            runId: "success",
          },
        );

        const log = await readFile(logPath, "utf8");
        expect(result).toEqual({ status: 0, signal: null, timedOut: false });
        expect(log).toContain("[stdout] agent-output");
        expect(log).toContain("[stderr] agent-error");
      } finally {
        await rm(logDir, { recursive: true, force: true });
      }
    });

    it("terminates an agent that exceeds its timeout", async () => {
      const logDir = await mkdtemp(join(tmpdir(), "pr-fix-test-"));
      const logPath = getPrFixLogPath(2868, "timeout", logDir);

      try {
        const result = await runAgentWithLogging("/bin/sh", ["-c", "sleep 1"], {
          cwd: process.cwd(),
          env: process.env,
          timeoutMs: 50,
          logPath,
          runId: "timeout",
        });

        expect(result.timedOut).toBe(true);
        expect(result.signal).toBe("SIGTERM");
        expect(await readFile(logPath, "utf8")).toContain("timeout reached");
      } finally {
        await rm(logDir, { recursive: true, force: true });
      }
    });
  });
});
