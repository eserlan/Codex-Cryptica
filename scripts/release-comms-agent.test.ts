import { execFileSync as execFileSyncNode } from "node:child_process";
import { mkdir as mkdirNode, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  buildEvaluatorPrompt,
  buildWriterPrompt,
  buildWriterRetryPrompt,
  deriveDiscordFromBluesky,
  deriveDiscordQualification,
  deriveInstagramQualification,
  deriveXQualification,
  publicPageFor,
  extractJsonBlock,
  fetchPromotionCommits,
  findOversizedBlueskyDrafts,
  getReleaseCommsLogPath,
  isEvaluatorResult,
  isWriterResult,
  loadReleaseCommsState,
  mergeBlueskyRetry,
  pickPreviousSha,
  processInstagramHandoffs,
  processXHandoffs,
  recordEvaluation,
  runAgentCapturingOutput,
  runWriterPassWithBudgetRetries,
  saveReleaseCommsState,
  selectPendingDiscordDestinations,
  selectPendingInstagramHandoffs,
  selectPendingXHandoffs,
  shouldUpdateInstagramTracker,
  type EvaluatorResult,
  type InstagramHandoff,
  type ReleaseCommsHistoryEntry,
  type ReleaseCommsState,
  type WriterResult,
} from "./release-comms-agent.ts";
import { formatIssueComment } from "./release-comms-prompts.ts";

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

    it("accepts a boolean bluesky_worthy per feature and rejects a non-boolean one", () => {
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          features: [{ name: "X", why_users_care: "Y", bluesky_worthy: true }],
        }),
      ).toBe(true);
      expect(
        isEvaluatorResult({
          postworthy: true,
          reason: "x",
          features: [{ name: "X", why_users_care: "Y", bluesky_worthy: "yes" }],
        }),
      ).toBe(false);
    });
  });

  describe("isWriterResult", () => {
    it("accepts page-addressed Bluesky and Discussion drafts", () => {
      expect(
        isWriterResult({
          bluesky: [],
          discord: "text",
          reddit: "",
          github_discussions: [],
        }),
      ).toBe(true);
      expect(
        isWriterResult({
          bluesky: [
            {
              pageUrl: "https://codexcryptica.com/answers/x",
              text: "post one",
            },
          ],
          discord: "",
          reddit: "",
          github_discussions: [
            {
              pageUrl: "https://codexcryptica.com/answers/x",
              title: "Title",
              body: "Body",
            },
          ],
        }),
      ).toBe(true);
    });

    it("rejects a non-array bluesky, a missing channel key, or a wrong type", () => {
      expect(
        isWriterResult({
          bluesky: "x",
          discord: "y",
          reddit: "z",
          github_discussions: [],
        }),
      ).toBe(false);
      expect(isWriterResult({ bluesky: [], discord: "y", reddit: "z" })).toBe(
        false,
      );
      expect(
        isWriterResult({
          bluesky: [1],
          discord: "y",
          reddit: "z",
          github_discussions: [],
        }),
      ).toBe(false);
      expect(isWriterResult(null)).toBe(false);
    });
  });

  describe("buildWriterPrompt", () => {
    it("lists features (marking bluesky_worthy), whole-release channels, and references the voice-rule skills", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [
          {
            name: "Faction Roster Generator",
            why_users_care: "Fast NPC groups.",
            bluesky_worthy: true,
          },
          {
            name: "Internal cache tweak",
            why_users_care: "Faster page loads.",
            bluesky_worthy: false,
          },
        ],
        recommended_channels: ["reddit"],
        reason: "new generator",
      });
      expect(prompt).toContain(
        "Faction Roster Generator: Fast NPC groups. (bluesky_worthy)",
      );
      expect(prompt).toContain("Internal cache tweak: Faster page loads.");
      expect(prompt).not.toContain(
        "Internal cache tweak: Faster page loads. (bluesky_worthy)",
      );
      expect(prompt).toContain(
        "Whole-release channels to draft a combined post for: reddit",
      );
      expect(prompt).toContain(".agent/skills/bsky-note/SKILL.md");
      expect(prompt).toContain(".agent/skills/cc-announcer/SKILL.md");
      expect(prompt).toContain('"github_discussions"');
    });

    it("tells the writer to draft one standalone Bluesky post per bluesky_worthy feature, never combined", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [
          { name: "A", why_users_care: "a", bluesky_worthy: true },
          { name: "B", why_users_care: "b", bluesky_worthy: true },
        ],
        recommended_channels: [],
        reason: "new generator",
      });
      expect(prompt).toContain("never combine multiple features");
      expect(prompt).toContain("are 2 bluesky_worthy features");
    });

    it("tells the writer to return an empty bluesky array when no feature is bluesky_worthy", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [{ name: "A", why_users_care: "a", bluesky_worthy: false }],
        recommended_channels: [],
        reason: "new generator",
      });
      expect(prompt).toContain("are 0 bluesky_worthy features");
      expect(prompt).toContain('return an empty array for "bluesky"');
    });

    it("tells the writer to calibrate reddit/github_discussion depth against real recent Discussions", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [
          {
            name: "Faction Roster Generator",
            why_users_care: "Fast NPC groups.",
          },
        ],
        recommended_channels: ["reddit", "github_discussion"],
        reason: "new generator",
      });
      expect(prompt).toContain("real, human-approved bar");
      expect(prompt).toContain('categoryId:"DIC_kwDOQ_4bts4C-hhd"');
      expect(prompt).toContain("open-ended question");
      expect(prompt).toContain("[Image:");
    });

    it("defaults to remaining whole-release channels when recommended_channels is empty", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        recommended_channels: [],
        reason: "new generator",
      });
      expect(prompt).toContain(
        "Whole-release channels to draft a combined post for: reddit, github_discussion",
      );
    });

    it("defaults to remaining whole-release channels when recommended_channels is undefined", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        reason: "new generator",
      } as EvaluatorResult);
      expect(prompt).toContain(
        "Whole-release channels to draft a combined post for: reddit, github_discussion",
      );
    });

    it("filters out unknown recommended channels", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        recommended_channels: ["reddit", "mastodon"],
        reason: "new generator",
      });
      expect(prompt).toContain(
        "Whole-release channels to draft a combined post for: reddit",
      );
      expect(prompt).not.toContain("mastodon");
    });

    it("defaults to remaining whole-release channels when bluesky (feature-level now) or an unknown value is the only recommendation", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        recommended_channels: ["bluesky"],
        reason: "new generator",
      });
      expect(prompt).toContain(
        "Whole-release channels to draft a combined post for: reddit, github_discussion",
      );
    });

    it("treats evaluator output as untrusted data", () => {
      const prompt = buildWriterPrompt({
        postworthy: true,
        importance: "medium",
        features: [],
        recommended_channels: ["discord"],
        reason: "new generator",
      });
      expect(prompt).toContain("untrusted data");
    });
  });

  describe("publicPageFor", () => {
    const item = {
      kind: "answer" as const,
      title: "A page",
      url: "https://codexcryptica.com/answers/a-page",
      imageUrl: "https://assets.codexcryptica.com/og/a-page.jpg",
      imageAlt: "A page card",
      sourcePath: "answer.ts",
    };

    it("uses only the public page matched to the writer's exact URL", () => {
      expect(publicPageFor([item], item.url)).toEqual(item);
    });

    it("rejects an unknown page but permits the image resolver to generate a missing card", () => {
      expect(() =>
        publicPageFor([item], "https://codexcryptica.com/answers/other"),
      ).toThrow("outside this release");
      expect(
        publicPageFor([{ ...item, imageUrl: undefined }], item.url),
      ).toEqual({
        ...item,
        imageUrl: undefined,
      });
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

  describe("fetchPromotionCommits", () => {
    it("fetches both promotion range endpoints before deriving the delta", () => {
      const calls: Array<{ file: string; args: readonly string[] }> = [];
      const run = ((file: string, args: readonly string[]) => {
        calls.push({ file, args });
        return Buffer.from("");
      }) as typeof import("node:child_process").execFileSync;

      fetchPromotionCommits("before-sha", "after-sha", run);

      expect(calls).toEqual([
        {
          file: "git",
          args: ["fetch", "--no-tags", "origin", "before-sha", "after-sha"],
        },
      ]);
    });

    it("surfaces a fetch failure instead of calculating a misleading partial range", () => {
      const run = (() => {
        throw new Error("remote unavailable");
      }) as typeof import("node:child_process").execFileSync;

      expect(() =>
        fetchPromotionCommits("before-sha", "after-sha", run),
      ).toThrow("remote unavailable");
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
        recentDiscussionTitles: "",
        recentBlueskyTitles: "",
      });
      expect(prompt).toContain("abc1234");
      expect(prompt).toContain("def5678");
      expect(prompt).toContain("Add faction generator");
      expect(prompt).toContain('"postworthy"');
      expect(prompt).toContain('"bluesky_worthy"');
      expect(prompt).toContain("```json");
    });

    it("labels the merged-PRs section as best-effort, not range-filtered", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "#100 Add faction generator",
        changelogDiff: "",
        recentDiscussionTitles: "",
        recentBlueskyTitles: "",
      });
      expect(prompt).not.toContain("Merged pull requests in this range");
      expect(prompt).toContain("best-effort context");
    });

    it("gives Bluesky a lower, per-feature postworthy bar than Reddit/GitHub Discussion", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "",
        changelogDiff: "",
        recentDiscussionTitles: "",
        recentBlueskyTitles: "",
      });
      expect(prompt).toContain("post early and often");
      expect(prompt).toContain("Bluesky (low bar, per-feature)");
      expect(prompt).toContain("Reddit and GitHub Discussion (higher bar");
      expect(prompt).toContain("prefer postworthy=true");
    });

    it("instructs that any feature qualifying for Bluesky also qualifies for Discord", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "",
        changelogDiff: "",
        recentDiscussionTitles: "",
        recentBlueskyTitles: "",
      });
      expect(prompt).toContain(
        "if something qualifies for Bluesky, it also qualifies for Discord",
      );
      expect(prompt).toContain(
        'always include "discord" in "recommended_channels"',
      );
      expect(prompt).toContain(
        'always include "instagram" in "recommended_channels"',
      );
    });

    it("shows recommended_channels as a discord/reddit/github_discussion subset, never including bluesky", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "",
        changelogDiff: "",
        recentDiscussionTitles: "",
        recentBlueskyTitles: "",
      });
      expect(prompt).not.toContain(
        '"recommended_channels": ["bluesky", "discord", "reddit", "github_discussion"]',
      );
      expect(prompt).not.toContain(
        '"recommended_channels": ["discord", "reddit", "github_discussion"]',
      );
      expect(prompt).toContain('"recommended_channels": []');
      expect(prompt).toContain('omit "bluesky" from it');
    });

    it("embeds recent Discussion titles and recent Bluesky titles for calibration", () => {
      const prompt = buildEvaluatorPrompt({
        previousSha: "abc1234",
        newSha: "def5678",
        commitLog: "",
        mergedPrs: "",
        changelogDiff: "",
        recentDiscussionTitles: "- 2026-09-08: Constellation generator",
        recentBlueskyTitles: "### 2026-09-06 — Heist Generator (ad hoc)",
      });
      expect(prompt).toContain("Constellation generator");
      expect(prompt).toContain("Heist Generator");
    });
  });

  describe("findPublicContent", () => {
    it("discovers a public page that was renamed between the two SHAs", async () => {
      const dir = await mkdtemp(join(tmpdir(), "release-comms-repo-"));
      try {
        const git = (args: string[]) =>
          execFileSyncNode("git", args, { cwd: dir, encoding: "utf-8" });
        git(["init", "-q"]);
        git(["config", "user.email", "test@example.com"]);
        git(["config", "user.name", "Test"]);
        const pagesDir = join(dir, "apps/web/src/lib/content/answers/pages");
        await mkdirNode(pagesDir, { recursive: true });
        const oldPath = join(pagesDir, "old-slug.ts");
        const newPath = join(pagesDir, "new-slug.ts");
        const contents = [
          `export const page = {`,
          `  slug: "new-slug",`,
          `  question: "How?",`,
          `  image: "https://assets.codexcryptica.com/og/new-slug.jpg",`,
          `  imageAlt: "New slug card",`,
          `};`,
          "",
        ].join("\n");
        await (await import("node:fs/promises")).writeFile(oldPath, contents);
        git(["add", "-A"]);
        git(["commit", "-q", "-m", "add page"]);
        const before = git(["rev-parse", "HEAD"]).trim();

        const { rename } = await import("node:fs/promises");
        await rename(oldPath, newPath);
        git(["add", "-A"]);
        git(["commit", "-q", "-m", "rename page"]);
        const after = git(["rev-parse", "HEAD"]).trim();

        const previous = process.env.PR_FIX_ROOT;
        process.env.PR_FIX_ROOT = dir;
        try {
          const { findPublicContent: freshFindPublicContent } = await import(
            `./release-comms-agent.ts?bust=${Date.now()}-${Math.random()}`
          );
          const items = freshFindPublicContent(before, after);
          expect(items).toContainEqual(
            expect.objectContaining({
              kind: "answer",
              url: "https://codexcryptica.com/answers/new-slug",
            }),
          );
        } finally {
          if (previous === undefined) delete process.env.PR_FIX_ROOT;
          else process.env.PR_FIX_ROOT = previous;
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
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
            bluesky: [
              {
                pageUrl: "https://codexcryptica.com/answers/x",
                text: "post text",
              },
            ],
            discord: "",
            reddit: "",
            github_discussions: [],
          },
          instagramHandoffs: [
            {
              pageUrl: "https://codexcryptica.com/answers/x",
              caption: "post text\n\nhttps://codexcryptica.com/answers/x",
              imageUrl: "https://assets.codexcryptica.com/og/x.jpg",
            },
          ],
        });
        await saveReleaseCommsState(withEntry, path);

        const reloaded = await loadReleaseCommsState(path);
        expect(reloaded.lastEvaluatedSha).toBe("abc1234");
        expect(reloaded.history).toHaveLength(1);
        expect(reloaded.history[0].reason).toBe("new generator");
        expect(reloaded.history[0].drafts?.bluesky).toEqual([
          { pageUrl: "https://codexcryptica.com/answers/x", text: "post text" },
        ]);
        expect(reloaded.history[0].instagramHandoffs).toEqual([
          {
            pageUrl: "https://codexcryptica.com/answers/x",
            caption: "post text\n\nhttps://codexcryptica.com/answers/x",
            imageUrl: "https://assets.codexcryptica.com/og/x.jpg",
          },
        ]);
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

  describe("discord integration", () => {
    it("derives discord copy from bluesky drafts stripping hashtags and preserving links", () => {
      const blueskyDrafts = [
        "New in Codex Cryptica: Faction Rosters 👥\n\nGenerate faction members with their own motives.\n\nhttps://codexcryptica.com/generators/faction\n\n#ttrpg #worldbuilding",
      ];
      const discord = deriveDiscordFromBluesky(blueskyDrafts);
      expect(discord).toBe(
        "New in Codex Cryptica: Faction Rosters 👥\n\nGenerate faction members with their own motives.\n\nhttps://codexcryptica.com/generators/faction",
      );
      expect(discord).not.toContain("#ttrpg");
      expect(discord).not.toContain("#worldbuilding");
      expect(discord).toContain("https://codexcryptica.com/generators/faction");
    });

    it("produces no discord text when bluesky drafts are empty or undefined", () => {
      expect(deriveDiscordFromBluesky([])).toBe("");
      expect(deriveDiscordFromBluesky(undefined)).toBe("");
    });

    it("includes derived discord copy in the formatted issue comment", () => {
      const comment = formatIssueComment(
        {
          sha: "1234567890abcdef",
          date: "2026-09-10T12:00:00.000Z",
          promoteRunId: "999",
          postworthy: true,
          reason: "New generators",
        },
        {
          postworthy: true,
          reason: "New generators",
          features: [
            {
              name: "Faction Rosters",
              why_users_care: "Quick NPC groups",
              bluesky_worthy: true,
            },
          ],
          recommended_channels: ["discord"],
        },
        {
          bluesky: [
            {
              pageUrl: "https://codexcryptica.com",
              text: "Generate faction members!\n\nhttps://codexcryptica.com\n\n#TTRPG",
            },
          ],
          discord: "Generate faction members!\n\nhttps://codexcryptica.com",
          reddit: "Reddit text",
          github_discussions: [],
        },
      );
      expect(comment).toContain(
        "Discord:\nGenerate faction members!\n\nhttps://codexcryptica.com\n\nInstagram (published automatically when recommended; shown here for reference):",
      );
    });

    it("qualifies for discord and derives copy when bluesky drafts are present, even if omitted from recommended_channels", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "Single small win",
        features: [
          {
            name: "Rule of Cool",
            why_users_care: "System notes",
            bluesky_worthy: false,
          },
        ],
        recommended_channels: [],
      };
      const drafts: WriterResult = {
        bluesky: [
          {
            pageUrl: "https://codexcryptica.com/answers/rule-of-cool",
            text: "Rule of cool!\n\nhttps://codexcryptica.com/answers/rule-of-cool\n\n#TTRPG",
          },
        ],
        reddit: "",
        github_discussions: [],
      };

      const { recommendedChannels, discordCopy } = deriveDiscordQualification(
        result,
        drafts,
      );

      expect(recommendedChannels).toContain("discord");
      expect(discordCopy).toBe(
        "Rule of cool!\n\nhttps://codexcryptica.com/answers/rule-of-cool",
      );
    });

    it("qualifies for discord on a bluesky_worthy feature alone, but cannot derive copy without drafts", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "Worthy feature, writer returned no bluesky copy",
        features: [
          {
            name: "Rule of Cool",
            why_users_care: "System notes",
            bluesky_worthy: true,
          },
        ],
        recommended_channels: [],
      };
      const drafts: WriterResult = {
        bluesky: [],
        reddit: "",
        github_discussions: [],
      };

      const { recommendedChannels, discordCopy } = deriveDiscordQualification(
        result,
        drafts,
      );

      expect(recommendedChannels).toContain("discord");
      expect(discordCopy).toBeUndefined();
    });
  });

  describe("instagram integration", () => {
    it("qualifies Instagram whenever Bluesky has a publishable draft", () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "A small but useful feature",
        recommended_channels: ["discord"],
      };
      const drafts: WriterResult = {
        bluesky: [
          {
            pageUrl: "https://codexcryptica.com/answers/example",
            text: "Exact Bluesky caption",
          },
        ],
        reddit: "",
        github_discussions: [],
      };

      expect(
        deriveInstagramQualification(result, drafts).recommendedChannels,
      ).toContain("instagram");
    });

    it("retries only an Instagram handoff without a persisted permalink", () => {
      const handoffs = [
        {
          pageUrl: "https://codexcryptica.com/answers/posted",
          caption: "Already posted",
          imageUrl: "https://assets.codexcryptica.com/og/posted.jpg",
        },
        {
          pageUrl: "https://codexcryptica.com/answers/retry",
          caption: "Retry this one",
          imageUrl: "https://assets.codexcryptica.com/og/retry.jpg",
        },
      ];

      expect(
        selectPendingInstagramHandoffs(handoffs, [
          {
            pageUrl: "https://codexcryptica.com/answers/posted",
            url: "https://www.instagram.com/p/posted/",
          },
        ]),
      ).toEqual([handoffs[1]]);
    });

    it("proves a successful permalink is saved before attempting the next handoff", async () => {
      const handoffs: InstagramHandoff[] = [
        {
          pageUrl: "https://codexcryptica.com/answers/first",
          caption: "First post",
          imageUrl: "https://assets.codexcryptica.com/og/first.jpg",
        },
        {
          pageUrl: "https://codexcryptica.com/answers/second",
          caption: "Second post",
          imageUrl: "https://assets.codexcryptica.com/og/second.jpg",
        },
      ];

      const state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };

      const entry: ReleaseCommsHistoryEntry = {
        sha: "abc1234",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "123",
        postworthy: true,
        reason: "Two features",
        instagramHandoffs: handoffs,
        publications: { bluesky: [], githubDiscussions: [], instagram: [] },
        completed: false,
      };

      const savedStates: ReleaseCommsState[] = [];
      const publishCalls: string[] = [];

      const publishFn = async (options: { asset: { pageUrl: string } }) => {
        publishCalls.push(options.asset.pageUrl);
        if (
          options.asset.pageUrl === "https://codexcryptica.com/answers/second"
        ) {
          // When publishing the second handoff, verify the first handoff's permalink
          // was already checkpointed into state via saveStateFn!
          expect(savedStates.length).toBeGreaterThanOrEqual(1);
          const lastSaved = savedStates[savedStates.length - 1];
          const entryInState = lastSaved.history.find(
            (e) => e.sha === "abc1234",
          );
          expect(entryInState?.publications?.instagram).toEqual([
            {
              pageUrl: "https://codexcryptica.com/answers/first",
              url: "https://www.instagram.com/p/first/",
              id: "media-first",
            },
          ]);
        }
        const slug = options.asset.pageUrl.split("/").pop();
        return {
          id: `media-${slug}`,
          url: `https://www.instagram.com/p/${slug}/`,
        };
      };

      const saveStateFn = async (saved: ReleaseCommsState) => {
        savedStates.push(structuredClone(saved));
      };

      const result = await processInstagramHandoffs({
        entry,
        recommendedChannels: ["instagram"],
        state,
        publishFn,
        saveStateFn,
      });

      expect(result.instagramPublishFailed).toBe(false);
      expect(result.entry.publications?.instagram).toHaveLength(2);
      expect(publishCalls).toEqual([
        "https://codexcryptica.com/answers/first",
        "https://codexcryptica.com/answers/second",
      ]);
    });

    it("proves a partial failure leaves completed false and retries only the missing handoff", async () => {
      const handoffs: InstagramHandoff[] = [
        {
          pageUrl: "https://codexcryptica.com/answers/success",
          caption: "Will succeed",
          imageUrl: "https://assets.codexcryptica.com/og/success.jpg",
        },
        {
          pageUrl: "https://codexcryptica.com/answers/fail",
          caption: "Will fail",
          imageUrl: "https://assets.codexcryptica.com/og/fail.jpg",
        },
      ];

      const state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };

      let entry: ReleaseCommsHistoryEntry = {
        sha: "def5678",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "456",
        postworthy: true,
        reason: "Partial failure test",
        instagramHandoffs: handoffs,
        publications: { bluesky: [], githubDiscussions: [], instagram: [] },
        completed: false,
      };

      const savedStates: ReleaseCommsState[] = [];
      const saveStateFn = async (saved: ReleaseCommsState) => {
        savedStates.push(structuredClone(saved));
      };

      // Pass 1: First handoff succeeds, second handoff fails (e.g. Meta rate limit)
      const firstPassCalls: string[] = [];
      const publishFnPass1 = async (options: {
        asset: { pageUrl: string };
      }) => {
        firstPassCalls.push(options.asset.pageUrl);
        if (
          options.asset.pageUrl === "https://codexcryptica.com/answers/fail"
        ) {
          throw new Error("Meta API rate limit exceeded");
        }
        return {
          id: "media-success",
          url: "https://www.instagram.com/p/success/",
        };
      };

      const pass1 = await processInstagramHandoffs({
        entry,
        recommendedChannels: ["instagram"],
        state,
        publishFn: publishFnPass1,
        saveStateFn,
      });

      expect(pass1.instagramPublishFailed).toBe(true);
      expect(firstPassCalls).toEqual([
        "https://codexcryptica.com/answers/success",
        "https://codexcryptica.com/answers/fail",
      ]);
      // Verify first handoff was checkpointed
      expect(pass1.entry.publications?.instagram).toEqual([
        {
          pageUrl: "https://codexcryptica.com/answers/success",
          url: "https://www.instagram.com/p/success/",
          id: "media-success",
        },
      ]);

      // Agent marks entry completion: since instagramPublishFailed is true, completed is false
      entry = {
        ...pass1.entry,
        completed: !pass1.instagramPublishFailed,
      };
      expect(entry.completed).toBe(false);

      // State recorded with completed=false does not advance lastEvaluatedSha
      const stateAfterPass1 = recordEvaluation(state, entry);
      expect(stateAfterPass1.lastEvaluatedSha).toBeNull();
      expect(
        shouldUpdateInstagramTracker(entry, pass1.instagramPublishFailed),
      ).toBe(false);

      // Pass 2: Retry run with the state/entry from Pass 1
      const secondPassCalls: string[] = [];
      const publishFnPass2 = async (options: {
        asset: { pageUrl: string };
      }) => {
        secondPassCalls.push(options.asset.pageUrl);
        return {
          id: "media-fail-fixed",
          url: "https://www.instagram.com/p/fail-fixed/",
        };
      };

      const pass2 = await processInstagramHandoffs({
        entry,
        recommendedChannels: ["instagram"],
        state: stateAfterPass1,
        publishFn: publishFnPass2,
        saveStateFn,
      });

      expect(pass2.instagramPublishFailed).toBe(false);
      // Only the missing handoff was retried!
      expect(secondPassCalls).toEqual([
        "https://codexcryptica.com/answers/fail",
      ]);
      expect(pass2.entry.publications?.instagram).toHaveLength(2);

      // On successful retry, release completes and tracker is updated
      entry = {
        ...pass2.entry,
        completed: !pass2.instagramPublishFailed,
      };
      expect(entry.completed).toBe(true);
      const finalState = recordEvaluation(stateAfterPass1, entry);
      expect(finalState.lastEvaluatedSha).toBe("def5678");
      expect(
        shouldUpdateInstagramTracker(entry, pass2.instagramPublishFailed),
      ).toBe(true);
    });

    it("preserves publishedMediaId across retries when permalink lookup fails after media_publish", async () => {
      const handoff: InstagramHandoff = {
        pageUrl: "https://codexcryptica.com/answers/idempotent",
        caption: "Idempotent caption",
        imageUrl: "https://assets.codexcryptica.com/og/idempotent.jpg",
      };

      const state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };

      const entry: ReleaseCommsHistoryEntry = {
        sha: "ghi9012",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "789",
        postworthy: true,
        reason: "Lookup failure test",
        instagramHandoffs: [handoff],
        publications: { bluesky: [], githubDiscussions: [], instagram: [] },
        completed: false,
      };

      let checkpointedHandoffMediaId: string | undefined;

      // Pass 1: media_publish succeeds (calls onMediaPublished), but permalink lookup throws
      const pass1 = await processInstagramHandoffs({
        entry,
        recommendedChannels: ["instagram"],
        state,
        publishFn: async (options) => {
          if (options.onMediaPublished) {
            await options.onMediaPublished("meta-published-media-id");
          }
          throw new Error("Meta permalink lookup timed out");
        },
        saveStateFn: async (saved) => {
          checkpointedHandoffMediaId =
            saved.history[0].instagramHandoffs?.[0]?.publishedMediaId;
        },
      });

      expect(pass1.instagramPublishFailed).toBe(true);
      expect(checkpointedHandoffMediaId).toBe("meta-published-media-id");
      expect(pass1.entry.instagramHandoffs?.[0].publishedMediaId).toBe(
        "meta-published-media-id",
      );

      // Pass 2: Retry receives publishedMediaId so it can recover the permalink without duplicate creation
      let receivedPublishedMediaId: string | undefined;
      const pass2 = await processInstagramHandoffs({
        entry: pass1.entry,
        recommendedChannels: ["instagram"],
        state,
        publishFn: async (options) => {
          receivedPublishedMediaId = options.publishedMediaId;
          return {
            id: options.publishedMediaId!,
            url: "https://www.instagram.com/p/recovered-permalink/",
          };
        },
      });

      expect(pass2.instagramPublishFailed).toBe(false);
      expect(receivedPublishedMediaId).toBe("meta-published-media-id");
      expect(pass2.entry.publications?.instagram?.[0].url).toBe(
        "https://www.instagram.com/p/recovered-permalink/",
      );
    });

    it("skips Instagram publishing when opted out via INSTAGRAM_AUTO_PUBLISH=0 without error", async () => {
      const handoff: InstagramHandoff = {
        pageUrl: "https://codexcryptica.com/answers/optout",
        caption: "Opted out caption",
        imageUrl: "https://assets.codexcryptica.com/og/optout.jpg",
      };

      const entry: ReleaseCommsHistoryEntry = {
        sha: "jkl3456",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "999",
        postworthy: true,
        reason: "Opt out test",
        instagramHandoffs: [handoff],
        publications: { bluesky: [], githubDiscussions: [], instagram: [] },
        completed: false,
      };

      let publishCalled = false;
      const result = await processInstagramHandoffs({
        entry,
        recommendedChannels: ["instagram"],
        state: { version: 1, lastEvaluatedSha: null, history: [] },
        env: { INSTAGRAM_AUTO_PUBLISH: "0" },
        publishFn: async () => {
          publishCalled = true;
          return { id: "never", url: "never" };
        },
      });

      expect(publishCalled).toBe(false);
      expect(result.instagramPublishFailed).toBe(false);
      expect(result.entry.publications?.instagram).toHaveLength(0);
    });

    it("gates tracker updates when Instagram publication failed or handoffs are incomplete", () => {
      const entry: ReleaseCommsHistoryEntry = {
        sha: "mno7890",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "111",
        postworthy: true,
        reason: "Tracker gate test",
        instagramHandoffs: [
          {
            pageUrl: "https://codexcryptica.com/answers/h1",
            caption: "h1",
            imageUrl: "https://assets.codexcryptica.com/og/h1.jpg",
          },
          {
            pageUrl: "https://codexcryptica.com/answers/h2",
            caption: "h2",
            imageUrl: "https://assets.codexcryptica.com/og/h2.jpg",
          },
        ],
        publications: {
          bluesky: [],
          githubDiscussions: [],
          instagram: [
            {
              pageUrl: "https://codexcryptica.com/answers/h1",
              url: "https://www.instagram.com/p/h1/",
            },
          ],
        },
        completed: false,
      };

      // 1 of 2 published, publish failed:
      expect(shouldUpdateInstagramTracker(entry, true)).toBe(false);
      // 1 of 2 published, publish did not fail (incomplete):
      expect(shouldUpdateInstagramTracker(entry, false)).toBe(false);

      // Both published, but publish failed:
      const completeEntry: ReleaseCommsHistoryEntry = {
        ...entry,
        publications: {
          ...entry.publications!,
          instagram: [
            {
              pageUrl: "https://codexcryptica.com/answers/h1",
              url: "https://www.instagram.com/p/h1/",
            },
            {
              pageUrl: "https://codexcryptica.com/answers/h2",
              url: "https://www.instagram.com/p/h2/",
            },
          ],
        },
      };
      expect(shouldUpdateInstagramTracker(completeEntry, true)).toBe(false);

      // Both published and no publish failure:
      expect(shouldUpdateInstagramTracker(completeEntry, false)).toBe(true);
    });
  });

  describe("X integration", () => {
    const pageUrl = "https://codexcryptica.com/answers/example";
    const text = `Exact Bluesky copy\n\n${pageUrl}`;

    it("qualifies and publishes every missing exact Bluesky handoff once", async () => {
      const result: EvaluatorResult = {
        postworthy: true,
        reason: "Useful release",
        recommended_channels: ["instagram"],
      };
      const drafts: WriterResult = {
        bluesky: [{ pageUrl, text }],
        reddit: "",
        github_discussions: [],
      };
      expect(deriveXQualification(result, drafts)).toEqual(["instagram", "x"]);

      const entry: ReleaseCommsHistoryEntry = {
        sha: "x123456",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "111",
        postworthy: true,
        reason: "Useful release",
        xHandoffs: [{ pageUrl, text }],
        publications: { bluesky: [], githubDiscussions: [] },
        completed: false,
      };
      const state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };
      let calls = 0;
      const first = await processXHandoffs({
        entry,
        recommendedChannels: ["x"],
        state,
        env: { X_ACCESS_TOKEN: "token" },
        publishFn: async (input) => {
          calls += 1;
          expect(input.text).toBe(text);
          return { id: "x-post", url: "https://x.com/i/web/status/x-post" };
        },
        saveStateFn: async () => {},
      });
      expect(calls).toBe(1);
      expect(first.entry.publications?.x).toEqual([
        { pageUrl, id: "x-post", url: "https://x.com/i/web/status/x-post" },
      ]);
      expect(
        selectPendingXHandoffs(
          first.entry.xHandoffs ?? [],
          first.entry.publications?.x ?? [],
        ),
      ).toEqual([]);

      await processXHandoffs({
        entry: first.entry,
        recommendedChannels: ["x"],
        state,
        env: { X_ACCESS_TOKEN: "token" },
        publishFn: async () => {
          calls += 1;
          throw new Error("must not duplicate post");
        },
        saveStateFn: async () => {},
      });
      expect(calls).toBe(1);
    });

    it("skips an unconfigured account and reports a configured publishing failure", async () => {
      const entry: ReleaseCommsHistoryEntry = {
        sha: "x987654",
        date: "2026-09-11T12:00:00.000Z",
        promoteRunId: "222",
        postworthy: true,
        reason: "Useful release",
        xHandoffs: [{ pageUrl, text }],
        publications: { bluesky: [], githubDiscussions: [] },
      };
      const state: ReleaseCommsState = {
        version: 1,
        lastEvaluatedSha: null,
        history: [],
      };
      const skipped = await processXHandoffs({
        entry,
        recommendedChannels: ["x"],
        state,
        env: {},
      });
      expect(skipped.xPublishFailed).toBe(false);
      const failed = await processXHandoffs({
        entry,
        recommendedChannels: ["x"],
        state,
        env: { X_ACCESS_TOKEN: "token" },
        publishFn: async () => {
          throw new Error("rate limited");
        },
      });
      expect(failed.xPublishFailed).toBe(true);
    });
  });

  describe("selectPendingDiscordDestinations", () => {
    it("only retries auto-publish destinations that have not already succeeded", () => {
      const destinations = [
        {
          id: "main-community",
          source: "bluesky" as const,
          strip_hashtags: true,
          auto_publish: true,
          webhookEnvVar: "DISCORD_WEBHOOK_URL",
        },
        {
          id: "overflow",
          source: "bluesky" as const,
          strip_hashtags: true,
          auto_publish: true,
          webhookEnvVar: "DISCORD_WEBHOOK_URL_2",
        },
      ];

      const pending = selectPendingDiscordDestinations(destinations, [
        "main-community",
      ]);

      expect(pending.map((dest) => dest.id)).toEqual(["overflow"]);
    });

    it("excludes destinations that are not configured for auto-publish", () => {
      const destinations = [
        {
          id: "manual-only",
          source: "bluesky" as const,
          strip_hashtags: true,
          auto_publish: false,
          webhookEnvVar: "DISCORD_WEBHOOK_URL",
        },
      ];

      expect(selectPendingDiscordDestinations(destinations, [])).toEqual([]);
    });
  });

  describe("findOversizedBlueskyDrafts", () => {
    it("returns nothing when every draft fits under the character limit", () => {
      expect(
        findOversizedBlueskyDrafts({
          bluesky: [
            {
              pageUrl: "https://codexcryptica.com/answers/short",
              text: "A short post.",
            },
          ],
          discord: "",
          reddit: "",
          github_discussions: [],
        }),
      ).toEqual([]);
    });

    it("flags a draft that exceeds 280 characters once the page URL is resolved in", () => {
      const pageUrl = "https://codexcryptica.com/answers/long-one";
      const oversized = findOversizedBlueskyDrafts({
        bluesky: [{ pageUrl, text: "x".repeat(295) }],
        discord: "",
        reddit: "",
        github_discussions: [],
      });
      expect(oversized).toHaveLength(1);
      expect(oversized[0]).toMatchObject({ pageUrl });
      expect(oversized[0].length).toBeGreaterThan(280);
    });
  });

  describe("buildWriterRetryPrompt", () => {
    it("appends the flagged drafts and asks for only those posts back", () => {
      const prompt = buildWriterRetryPrompt("BASE PROMPT", [
        { pageUrl: "https://codexcryptica.com/answers/long-one", length: 340 },
      ]);
      expect(prompt).toContain("BASE PROMPT");
      expect(prompt).toContain("https://codexcryptica.com/answers/long-one");
      expect(prompt).toContain("340 characters");
      expect(prompt).toContain("REJECTED");
      expect(prompt).toContain('"bluesky"');
      expect(prompt).toContain(
        "Do NOT resend reddit, discord, github_discussions",
      );
    });
  });

  describe("mergeBlueskyRetry", () => {
    it("replaces only the flagged post(s), leaving everything else untouched", () => {
      const previous: WriterResult = {
        bluesky: [
          {
            pageUrl: "https://codexcryptica.com/answers/short",
            text: "keep me",
          },
          {
            pageUrl: "https://codexcryptica.com/answers/long-one",
            text: "x".repeat(340),
          },
        ],
        discord: "discord copy",
        reddit: "reddit copy",
        github_discussions: [
          {
            pageUrl: "https://codexcryptica.com/answers/short",
            title: "title",
            body: "body",
          },
        ],
      };
      const merged = mergeBlueskyRetry(previous, {
        bluesky: [
          {
            pageUrl: "https://codexcryptica.com/answers/long-one",
            text: "shortened",
          },
        ],
      });
      expect(merged.bluesky).toEqual([
        { pageUrl: "https://codexcryptica.com/answers/short", text: "keep me" },
        {
          pageUrl: "https://codexcryptica.com/answers/long-one",
          text: "shortened",
        },
      ]);
      expect(merged.discord).toBe("discord copy");
      expect(merged.reddit).toBe("reddit copy");
      expect(merged.github_discussions).toBe(previous.github_discussions);
    });
  });

  describe("runWriterPassWithBudgetRetries", () => {
    const evaluation: EvaluatorResult = { postworthy: true, reason: "x" };
    const oversizedDraft: WriterResult = {
      bluesky: [
        {
          pageUrl: "https://codexcryptica.com/answers/long-one",
          text: "x".repeat(340),
        },
      ],
      discord: "discord copy",
      reddit: "reddit copy",
      github_discussions: [],
    };

    it("retries an oversized draft, merges the fix, and returns the merged result", async () => {
      const calls: string[] = [];
      const runPass = async (
        _prompt: string,
        _logPath: string,
        _runId: string,
        isValid: (value: unknown) => boolean,
        passName: string,
      ) => {
        calls.push(passName);
        const value =
          passName === "write"
            ? oversizedDraft
            : {
                bluesky: [
                  {
                    pageUrl: oversizedDraft.bluesky[0].pageUrl,
                    text: "short enough",
                  },
                ],
              };
        return isValid(value) ? value : null;
      };

      const result = await runWriterPassWithBudgetRetries(
        evaluation,
        [],
        "/tmp/log",
        "run-1",
        runPass as never,
      );

      expect(calls).toEqual(["write", "write-retry-1"]);
      expect(result?.bluesky).toEqual([
        { pageUrl: oversizedDraft.bluesky[0].pageUrl, text: "short enough" },
      ]);
      expect(result?.discord).toBe("discord copy");
      expect(result?.reddit).toBe("reddit copy");
    });

    it("stops retrying and falls back to filtering when a retry returns no parseable JSON", async () => {
      const calls: string[] = [];
      const runPass = async (
        _prompt: string,
        _logPath: string,
        _runId: string,
        _isValid: (value: unknown) => boolean,
        passName: string,
      ) => {
        calls.push(passName);
        return passName === "write" ? oversizedDraft : null;
      };

      const result = await runWriterPassWithBudgetRetries(
        evaluation,
        [],
        "/tmp/log",
        "run-1",
        runPass as never,
      );

      expect(calls).toEqual(["write", "write-retry-1"]);
      expect(result?.bluesky).toEqual([]);
      expect(result?.discord).toBe("discord copy");
      expect(result?.reddit).toBe("reddit copy");
    });

    it("gives up after exhausting all attempts and filters out the still-oversized post", async () => {
      const calls: string[] = [];
      const runPass = async (
        _prompt: string,
        _logPath: string,
        _runId: string,
        isValid: (value: unknown) => boolean,
        passName: string,
      ) => {
        calls.push(passName);
        const value =
          passName === "write"
            ? oversizedDraft
            : {
                bluesky: [
                  {
                    pageUrl: oversizedDraft.bluesky[0].pageUrl,
                    text: "x".repeat(340),
                  },
                ],
              };
        return isValid(value) ? value : null;
      };

      const result = await runWriterPassWithBudgetRetries(
        evaluation,
        [],
        "/tmp/log",
        "run-1",
        runPass as never,
      );

      expect(calls).toEqual([
        "write",
        "write-retry-1",
        "write-retry-2",
        "write-retry-3",
      ]);
      expect(result?.bluesky).toEqual([]);
    });

    it("returns null when the initial write pass produces no parseable JSON", async () => {
      const runPass = async () => null;
      const result = await runWriterPassWithBudgetRetries(
        evaluation,
        [],
        "/tmp/log",
        "run-1",
        runPass as never,
      );
      expect(result).toBeNull();
    });
  });
});
