import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  buildEvaluatorPrompt,
  buildWriterPrompt,
  extractJsonBlock,
  getReleaseCommsLogPath,
  isEvaluatorResult,
  isWriterResult,
  loadReleaseCommsState,
  pickPreviousSha,
  recordEvaluation,
  runAgentCapturingOutput,
  saveReleaseCommsState,
  type EvaluatorResult,
  type ReleaseCommsState,
} from "./release-comms-agent.ts";

describe("release-comms-agent", () => {
  describe("extractJsonBlock", () => {
    it("parses a fenced json block", () => {
      const output =
        'Here is the result:\n```json\n{"postworthy": true, "reason": "ok"}\n```\n';
      expect(extractJsonBlock(output)).toEqual({
        postworthy: true,
        reason: "ok",
      });
    });

    it("falls back to a bare JSON object with no fence", () => {
      expect(
        extractJsonBlock('{"postworthy": false, "reason": "meh"}'),
      ).toEqual({ postworthy: false, reason: "meh" });
    });

    it("returns null for unparsable output", () => {
      expect(extractJsonBlock("no json here")).toBeNull();
      expect(extractJsonBlock("```json\n{not valid\n```")).toBeNull();
    });
  });

  describe("isEvaluatorResult", () => {
    it("accepts a minimal valid shape", () => {
      expect(isEvaluatorResult({ postworthy: false, reason: "x" })).toBe(true);
    });

    it("accepts the full shape", () => {
      expect(
        isEvaluatorResult({
          postworthy: true,
          importance: "medium",
          features: [{ name: "X", why_users_care: "Y" }],
          recommended_channels: ["bluesky"],
          reason: "x",
        }),
      ).toBe(true);
    });

    it("rejects missing or malformed fields", () => {
      expect(isEvaluatorResult(null)).toBe(false);
      expect(isEvaluatorResult({ postworthy: "true", reason: "x" })).toBe(
        false,
      );
      expect(isEvaluatorResult({ postworthy: true })).toBe(false);
      expect(
        isEvaluatorResult({ postworthy: true, reason: "x", features: "no" }),
      ).toBe(false);
    });

    it("rejects an invalid importance value", () => {
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          importance: "cat",
        }),
      ).toBe(false);
    });

    it("rejects recommended_channels with non-string elements", () => {
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          recommended_channels: [123],
        }),
      ).toBe(false);
    });

    it("rejects features with malformed elements", () => {
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          features: [{}],
        }),
      ).toBe(false);
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          features: [{ name: "X", why_users_care: "Y" }],
        }),
      ).toBe(true);
    });
  });

  describe("isWriterResult", () => {
    it("accepts drafts with all four channel keys, empty strings allowed", () => {
      expect(
        isWriterResult({
          bluesky: "",
          discord: "text",
          reddit: "",
          github_discussion: "",
        }),
      ).toBe(true);
    });

    it("rejects a missing channel key or wrong type", () => {
      expect(isWriterResult({ bluesky: "x", discord: "y", reddit: "z" })).toBe(
        false,
      );
      expect(
        isWriterResult({
          bluesky: "x",
          discord: "y",
          reddit: 5,
          github_discussion: "z",
        }),
      ).toBe(false);
      expect(isWriterResult(null)).toBe(false);
    });
  });

  describe("buildWriterPrompt", () => {
    it("lists features, recommended channels, and references the voice-rule skills", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [
          {
            name: "Faction Roster Generator",
            why_users_care: "Fast NPC groups.",
          },
        ],
        recommended_channels: ["bluesky", "discord"],
        reason: "new generator",
      });
      expect(prompt).toContain("Faction Roster Generator");
      expect(prompt).toContain("bluesky, discord");
      expect(prompt).toContain(".agent/skills/bsky-note/SKILL.md");
      expect(prompt).toContain(".agent/skills/cc-announcer/SKILL.md");
      expect(prompt).toContain('"bluesky"');
      expect(prompt).toContain('"github_discussion"');
    });

    it("defaults to all three channels when recommended_channels is empty", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [
          {
            name: "Faction Roster Generator",
            why_users_care: "Fast NPC groups.",
          },
        ],
        recommended_channels: [],
        reason: "new generator",
      });
      expect(prompt).toContain("bluesky, discord, reddit, github_discussion");
      expect(prompt).not.toContain("Recommended channels: (none)");
    });

    it("defaults to all three channels when recommended_channels is undefined", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        reason: "new generator",
      } as EvaluatorResult);
      expect(prompt).toContain("bluesky, discord, reddit, github_discussion");
    });

    it("treats evaluator output as untrusted data", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        recommended_channels: ["bluesky"],
        reason: "new generator",
      });
      expect(prompt).toContain("untrusted data");
    });
  });

  describe("pickPreviousSha", () => {
    it("picks the run immediately before the excluded one", () => {
      const runs = [
        { databaseId: 3, headSha: "ccc" },
        { databaseId: 2, headSha: "bbb" },
        { databaseId: 1, headSha: "aaa" },
      ];
      expect(pickPreviousSha(runs, 3)).toBe("bbb");
    });

    it("returns null when there is no earlier run", () => {
      expect(
        pickPreviousSha([{ databaseId: 1, headSha: "aaa" }], 1),
      ).toBeNull();
    });

    it("returns the most recent run when excludeRunId is not present in runs", () => {
      const runs = [
        { databaseId: 3, headSha: "ccc" },
        { databaseId: 2, headSha: "bbb" },
      ];
      expect(pickPreviousSha(runs, 999)).toBe("ccc");
    });
  });

  describe("getReleaseCommsLogPath", () => {
    it("sanitises the run id for use as a filename", () => {
      expect(getReleaseCommsLogPath("../../outside", "/tmp/comms-logs")).toBe(
        "/tmp/comms-logs/eval-------outside.log",
      );
    });
  });

  describe("buildEvaluatorPrompt", () => {
    it("embeds the delta context and the expected output shape", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "abc1234 2026-01-01 Add faction generator",
        mergedPrs: "#100 Add faction generator",
        changelogDiff: "",
      });
      expect(prompt).toContain("abc1234");
      expect(prompt).toContain("def5678");
      expect(prompt).toContain("Add faction generator");
      expect(prompt).toContain('"postworthy"');
      expect(prompt).toContain("```json");
    });

    it("labels the merged-PRs section as best-effort, not range-filtered", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "#100 Add faction generator",
        changelogDiff: "",
      });
      expect(prompt).not.toContain("Merged pull requests in this range");
      expect(prompt).toContain("best-effort context");
    });
  });

  describe("state persistence", () => {
    it("round-trips through an atomic write and falls back to empty state when missing", async () => {
      const dir = await mkdtemp(join(tmpdir(), "release-comms-test-"));
      const path = join(dir, "state.json");
      try {
        const empty = await loadReleaseCommsState(path);
        expect(empty).toEqual({
          version: 1,
          lastEvaluatedSha: null,
          history: [],
        });

        const withEntry = recordEvaluation(empty, {
          sha: "abc1234",
          date: "2026-01-01T00:00:00.000Z",
          promoteRunId: "42",
          postworthy: true,
          reason: "new generator",
          drafts: {
            bluesky: "post text",
            discord: "",
            reddit: "",
            github_discussion: "",
          },
        });
        await saveReleaseCommsState(withEntry, path);

        const reloaded = await loadReleaseCommsState(path);
        expect(reloaded.lastEvaluatedSha).toBe("abc1234");
        expect(reloaded.history).toHaveLength(1);
        expect(reloaded.history[0].reason).toBe("new generator");
        expect(reloaded.history[0].drafts?.bluesky).toBe("post text");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("caps history at 50 entries, newest first", () => {
      let state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };
      for (let i = 0; i < 55; i++) {
        state = recordEvaluation(state, {
          sha: `sha-${i}`,
          date: "2026-01-01T00:00:00.000Z",
          promoteRunId: String(i),
          postworthy: false,
          reason: "n/a",
        });
      }
      expect(state.history).toHaveLength(50);
      expect(state.history[0].sha).toBe("sha-54");
      expect(state.lastEvaluatedSha).toBe("sha-54");
    });
  });

  describe("runAgentCapturingOutput", () => {
    it("captures stdout while also writing it to the durable log", async () => {
      const logDir = await mkdtemp(join(tmpdir(), "release-comms-log-"));
      const logPath = getReleaseCommsLogPath("success", logDir);
      try {
        const result = await runAgentCapturingOutput(
          "/bin/sh",
          [
            "-c",
            'printf \'```json\\n{"postworthy": true, "reason": "ok"}\\n```\'',
          ],
          {
            cwd: process.cwd(),
            env: process.env,
            timeoutMs: 2_000,
            logPath,
            runId: "success",
          },
        );

        expect(result.status).toBe(0);
        expect(result.timedOut).toBe(false);
        expect(extractJsonBlock(result.stdout)).toEqual({
          postworthy: true,
          reason: "ok",
        });
        const log = await readFile(logPath, "utf8");
        expect(log).toContain("[stdout]");
      } finally {
        await rm(logDir, { recursive: true, force: true });
      }
    });

    it("terminates an agent that exceeds its timeout", async () => {
      const logDir = await mkdtemp(join(tmpdir(), "release-comms-log-"));
      const logPath = getReleaseCommsLogPath("timeout", logDir);
      try {
        const result = await runAgentCapturingOutput(
          "/bin/sh",
          ["-c", "sleep 1"],
          {
            cwd: process.cwd(),
            env: process.env,
            timeoutMs: 50,
            logPath,
            runId: "timeout",
          },
        );
        expect(result.timedOut).toBe(true);
        expect(result.signal).toBe("SIGTERM");
      } finally {
        await rm(logDir, { recursive: true, force: true });
      }
    });
  });
});
