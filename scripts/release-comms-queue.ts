import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { QueueResult } from "./release-comms-prompts.ts";
import type { ReleaseCommsHistoryEntry } from "./release-comms-types.ts";

const BLUESKY_LOG_PATH = ".social/bluesky-posts.md";
const DRAFTED_HEADER = "## Drafted (not yet posted)";

/** Format one auto-drafted Bluesky post as an entry matching the log's existing "Drafted" shape. */
export function formatBlueskyDraftEntry(
  draft: string,
  entry: Pick<ReleaseCommsHistoryEntry, "sha" | "date">,
): string {
  const shortSha = entry.sha.slice(0, 7);
  const dateOnly = entry.date.slice(0, 10);
  return [
    `### Release comms auto-draft, ${dateOnly} (\`${shortSha}\`)`,
    "",
    `- **Text:** ${draft}`,
    "",
    "- **Image:** _TODO — needs a screenshot before this can be posted (see bsky-note SKILL.md Step 2 for sourcing one)._",
    "- **Alt:** _TODO_",
    `- **Note:** Auto-queued by the release comms agent from production release \`${shortSha}\`; text not yet human-reviewed.`,
  ].join("\n");
}

/**
 * Insert new entries right after the "## Drafted (not yet posted)" heading,
 * so the newest auto-drafts surface first. Throws if the heading is missing
 * rather than silently appending somewhere wrong.
 */
export function insertDraftsIntoBlueskyLog(
  fileContent: string,
  newEntries: string[],
): string {
  if (newEntries.length === 0) return fileContent;

  const headerIndex = fileContent.indexOf(DRAFTED_HEADER);
  if (headerIndex === -1) {
    throw new Error(`Could not find "${DRAFTED_HEADER}" in the Bluesky log`);
  }

  const insertAt = headerIndex + DRAFTED_HEADER.length;
  const before = fileContent.slice(0, insertAt);
  const after = fileContent.slice(insertAt);
  const block = `\n\n${newEntries.join("\n\n")}`;
  return `${before}${block}${after}`;
}

/**
 * Queue Bluesky drafts into .social/bluesky-posts.md and push the change
 * directly to `staging`, using an isolated worktree so this never touches
 * whatever branch/state the caller's own working directory is on (which may
 * be shared with other automation running in the same checkout).
 */
export async function queueBlueskyDrafts(
  drafts: string[],
  entry: Pick<ReleaseCommsHistoryEntry, "sha" | "date">,
  repositoryRoot: string,
): Promise<QueueResult> {
  if (drafts.length === 0) return { queued: 0 };

  const worktreeDir = await mkdtemp(join(tmpdir(), "release-comms-queue-"));
  try {
    execFileSync("git", ["fetch", "origin", "staging"], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    execFileSync(
      "git",
      ["worktree", "add", "--detach", worktreeDir, "origin/staging"],
      { cwd: repositoryRoot, stdio: "ignore" },
    );

    const logPath = resolve(worktreeDir, BLUESKY_LOG_PATH);
    const original = await readFile(logPath, "utf8");
    const newEntries = drafts.map((draft) =>
      formatBlueskyDraftEntry(draft, entry),
    );
    const updated = insertDraftsIntoBlueskyLog(original, newEntries);
    await writeFile(logPath, updated, "utf8");

    execFileSync("git", ["add", BLUESKY_LOG_PATH], {
      cwd: worktreeDir,
      stdio: "ignore",
    });
    execFileSync(
      "git",
      [
        "commit",
        "-m",
        `chore(social): queue ${drafts.length} release-comms draft(s) from ${entry.sha.slice(0, 7)}`,
      ],
      { cwd: worktreeDir, stdio: "ignore" },
    );

    try {
      execFileSync("git", ["push", "origin", "HEAD:staging"], {
        cwd: worktreeDir,
        stdio: "ignore",
      });
    } catch {
      // Remote moved under us; rebase once onto the latest staging and retry.
      execFileSync("git", ["fetch", "origin", "staging"], {
        cwd: worktreeDir,
        stdio: "ignore",
      });
      execFileSync("git", ["rebase", "origin/staging"], {
        cwd: worktreeDir,
        stdio: "ignore",
      });
      execFileSync("git", ["push", "origin", "HEAD:staging"], {
        cwd: worktreeDir,
        stdio: "ignore",
      });
    }

    const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).trim();
    const remoteUrl = execFileSync(
      "gh",
      ["repo", "view", "--json", "url", "--jq", ".url"],
      { cwd: worktreeDir, encoding: "utf-8" },
    ).trim();

    return {
      queued: drafts.length,
      commitUrl: `${remoteUrl}/commit/${commitSha}`,
    };
  } catch (error) {
    return {
      queued: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", worktreeDir, "--force"], {
        cwd: repositoryRoot,
        stdio: "ignore",
      });
    } catch {
      await rm(worktreeDir, { recursive: true, force: true });
    }
  }
}
