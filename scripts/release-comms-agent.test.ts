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
  recordEvaluation,
  runAgentCapturingOutput,
  runWriterPassWithBudgetRetries,
  saveReleaseCommsState,
  selectPendingDiscordDestinations,
  type EvaluatorResult,
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
        'include "discord" whenever any feature is marked "bluesky_worthy": true',
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
        });
        await saveReleaseCommsState(withEntry, path);

        const reloaded = await loadReleaseCommsState(path);
        expect(reloaded.lastEvaluatedSha).toBe("abc1234");
        expect(reloaded.history).toHaveLength(1);
        expect(reloaded.history[0].reason).toBe("new generator");
        expect(reloaded.history[0].drafts?.bluesky).toEqual([
          { pageUrl: "https://codexcryptica.com/answers/x", text: "post text" },
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
        "Discord:\nGenerate faction members!\n\nhttps://codexcryptica.com\n\nReddit:",
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

    it("flags a draft that exceeds 300 characters once the page URL is resolved in", () => {
      const pageUrl = "https://codexcryptica.com/answers/long-one";
      const oversized = findOversizedBlueskyDrafts({
        bluesky: [{ pageUrl, text: "x".repeat(295) }],
        discord: "",
        reddit: "",
        github_discussions: [],
      });
      expect(oversized).toHaveLength(1);
      expect(oversized[0]).toMatchObject({ pageUrl });
      expect(oversized[0].length).toBeGreaterThan(300);
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
