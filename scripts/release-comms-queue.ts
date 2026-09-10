import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { QueueResult } from "./release-comms-prompts.ts";
import type { ReleaseCommsHistoryEntry } from "./release-comms-types.ts";

export const BLUESKY_LOG_PATH = ".social/bluesky-posts.md";
export const DRAFTED_HEADER = "## Drafted (not yet posted)";
export const TRACKER_HEADER = "## Cross-Platform Posting Tracker";
export const DEFAULT_PLATFORM_COLUMNS = [
  "Bluesky",
  "Discord",
  "Instagram",
  "Patreon",
];

export interface TrackerRow {
  date: string;
  topic: string;
  reference: string;
  platforms?: Record<string, boolean>;
}

export function formatTrackerTableRow(
  row: TrackerRow,
  columns: string[] = DEFAULT_PLATFORM_COLUMNS,
): string {
  const platformCells = columns.map((col) => {
    const isTicked = row.platforms?.[col.toLowerCase()] ?? false;
    return isTicked ? "[x]" : "[ ]";
  });
  return `| ${row.date} | ${row.topic} | ${row.reference} | ${platformCells.join(" | ")} |`;
}

/**
 * Insert a new row into the Cross-Platform Posting Tracker table right below
 * the header and separator. If the table doesn't exist, returns content unchanged.
 */
export function insertTrackerTableRow(
  fileContent: string,
  rowString: string,
): string {
  const lines = fileContent.split("\n");
  const headerIdx = lines.findIndex((line) => line.trim() === TRACKER_HEADER);
  if (headerIdx === -1) return fileContent;

  let sepIdx = -1;
  for (let i = headerIdx + 1; i < lines.length && i < headerIdx + 5; i++) {
    if (lines[i].includes("|") && lines[i].includes("---")) {
      sepIdx = i;
      break;
    }
  }
  if (sepIdx === -1) return fileContent;

  lines.splice(sepIdx + 1, 0, rowString);
  return lines.join("\n");
}

/**
 * Update the platform status checkbox ([ ] -> [x] or [x] -> [ ]) for a matching row
 * in the Cross-Platform Posting Tracker table.
 * Dynamically looks up the platform column index so new platforms can be added without
 * modifying this function.
 */
export function updatePlatformStatus(
  fileContent: string,
  identifier: string,
  platform: string,
  status: boolean,
): string {
  const lines = fileContent.split("\n");
  const headerIdx = lines.findIndex((line) => line.trim() === TRACKER_HEADER);
  if (headerIdx === -1) return fileContent;

  let tableHeaderIdx = -1;
  for (let i = headerIdx + 1; i < lines.length && i < headerIdx + 5; i++) {
    if (lines[i].includes("|") && !lines[i].includes("---")) {
      tableHeaderIdx = i;
      break;
    }
  }
  if (tableHeaderIdx === -1) return fileContent;

  const headerLine = lines[tableHeaderIdx];
  const headerCols = headerLine
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  const platformColIdx = headerCols.findIndex(
    (c) => c.toLowerCase() === platform.toLowerCase(),
  );
  if (platformColIdx === -1) return fileContent;

  for (let i = tableHeaderIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) break;

    if (line.toLowerCase().includes(identifier.toLowerCase())) {
      const cells = line.split("|");
      const targetCellIdx = platformColIdx + 1;
      if (targetCellIdx < cells.length) {
        const currentCell = cells[targetCellIdx];
        const isEmoji =
          currentCell.includes("✅") || currentCell.includes("⬜");
        const newStatus = isEmoji
          ? status
            ? " ✅ "
            : " ⬜ "
          : status
            ? " [x] "
            : " [ ] ";
        cells[targetCellIdx] = newStatus;
        lines[i] = cells.join("|");
        break;
      }
    }
  }

  return lines.join("\n");
}

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
    let updated = insertDraftsIntoBlueskyLog(original, newEntries);

    for (const draft of drafts) {
      const shortSha = entry.sha.slice(0, 7);
      const dateOnly = entry.date.slice(0, 10);
      const snippet = draft.replace(/\n+/g, " ").slice(0, 60) + "...";
      const row = formatTrackerTableRow({
        date: dateOnly,
        topic: `Release comms auto-draft (\`${shortSha}\`)`,
        reference: snippet,
        platforms: {
          bluesky: false,
          discord: false,
          instagram: false,
          patreon: false,
        },
      });
      updated = insertTrackerTableRow(updated, row);
    }

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
