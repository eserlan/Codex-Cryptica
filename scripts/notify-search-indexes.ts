#!/usr/bin/env bun
/**
 * Notify Search Indexes via IndexNow CLI (#3164).
 *
 * Discovers changed public discovery/content routes from:
 *   - Explicit cluster slugs (e.g. `--cluster=heist`)
 *   - Direct URLs/paths (e.g. `--urls=/answers/...,/generators/...`)
 *   - Git diffs (`--base-sha=...`, `--base-ref=...`, `--head-sha=...`)
 *   - Staged or uncommitted working tree changes
 *
 * Batches, deduplicates, and submits canonical URLs to IndexNow.
 *
 * Usage:
 *   bun scripts/notify-search-indexes.ts --cluster=heist --dry-run
 *   bun scripts/notify-search-indexes.ts --base-ref=origin/main --summary
 *   bun scripts/notify-search-indexes.ts --urls=/generators/heist,/tools --dry-run
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  DEFAULT_INDEXNOW_HOST,
  DEFAULT_INDEXNOW_KEY,
  formatIndexNowStepSummary,
  mapChangedFilesToRoutes,
  resolveClusterRoutes,
  submitToIndexNow,
} from "../apps/web/src/lib/seo/indexnow";

interface CliOptions {
  cluster?: string;
  urls: string[];
  files: string[];
  baseSha?: string;
  headSha?: string;
  baseRef?: string;
  dryRun: boolean;
  summary: boolean;
  json: boolean;
  host: string;
  key?: string;
  batchSize?: number;
  help: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    urls: [],
    files: [],
    dryRun: false,
    summary: false,
    json: false,
    host: DEFAULT_INDEXNOW_HOST,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--summary") {
      options.summary = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--cluster=")) {
      options.cluster = arg.slice("--cluster=".length).trim();
    } else if (arg.startsWith("--urls=")) {
      const split = arg.slice("--urls=".length).split(",");
      for (const u of split) {
        if (u.trim()) options.urls.push(u.trim());
      }
    } else if (arg.startsWith("--files=")) {
      const split = arg.slice("--files=".length).split(",");
      for (const f of split) {
        if (f.trim()) options.files.push(f.trim());
      }
    } else if (arg.startsWith("--base-sha=")) {
      options.baseSha = arg.slice("--base-sha=".length).trim();
    } else if (arg.startsWith("--head-sha=")) {
      options.headSha = arg.slice("--head-sha=".length).trim();
    } else if (arg.startsWith("--base-ref=")) {
      options.baseRef = arg.slice("--base-ref=".length).trim();
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length).trim();
    } else if (arg.startsWith("--key=")) {
      options.key = arg.slice("--key=".length).trim();
    } else if (arg.startsWith("--batch-size=")) {
      options.batchSize = Number.parseInt(
        arg.slice("--batch-size=".length).trim(),
        10,
      );
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Codex Cryptica - IndexNow Search Index Notifier (#3164)

Usage:
  bun scripts/notify-search-indexes.ts [options]

Options:
  --cluster=<name>     Notify all canonical routes for a discovery cluster (e.g. "heist")
  --urls=<urls>        Comma-separated URLs or paths to submit directly
  --files=<files>      Comma-separated file paths to map to public routes
  --base-sha=<sha>     Git base commit SHA to diff against
  --head-sha=<sha>     Git head commit SHA (defaults to HEAD)
  --base-ref=<ref>     Git base ref to diff against (e.g. "origin/main")
  --dry-run            Simulate route resolution and validation without submitting
  --summary            Output Markdown summary (writes to GITHUB_STEP_SUMMARY if present)
  --host=<host>        Canonical host (defaults to "${DEFAULT_INDEXNOW_HOST}")
  --key=<key>          IndexNow API key (defaults to active verification key)
  --batch-size=<n>     Max URLs per request (defaults to 1000, max 10000)
  --json               Output JSON result to stdout
  --help, -h           Show this help message
`);
}

export function getDiffFiles(
  base: string,
  head = "HEAD",
  cwd = process.cwd(),
): string[] {
  try {
    // Try triple-dot diff first for ref ranges
    const range = base.includes("...") ? base : `${base}...${head}`;
    const output = execFileSync("git", ["diff", "--name-only", range], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    try {
      // Fall back to direct two-argument diff
      const output = execFileSync("git", ["diff", "--name-only", base, head], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}

export function getLocalChangedFiles(cwd = process.cwd()): string[] {
  const files = new Set<string>();
  try {
    const statusOutput = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=no"],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    for (const line of statusOutput.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Status format: XY PATH or XY "PATH" -> split after 3 characters
      const filePath = trimmed.slice(3).trim();
      if (filePath) files.add(filePath);
    }
  } catch {
    // Ignore git failure
  }
  return [...files];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const candidatePaths: string[] = [];

  // 1. Cluster route resolution
  if (options.cluster) {
    const clusterRoutes = resolveClusterRoutes(options.cluster);
    candidatePaths.push(...clusterRoutes);
  }

  // 2. Direct URLs / paths
  if (options.urls.length > 0) {
    candidatePaths.push(...options.urls);
  }

  // 3. Changed files from CLI flag
  const changedFiles = new Set<string>(options.files);

  // 4. Changed files from Git diff
  const base = options.baseSha || options.baseRef;
  if (base) {
    const diffFiles = getDiffFiles(base, options.headSha || "HEAD");
    for (const f of diffFiles) changedFiles.add(f);
  }

  // 5. If no explicit targets were specified, check local working tree changes
  if (
    !options.cluster &&
    options.urls.length === 0 &&
    changedFiles.size === 0
  ) {
    const localFiles = getLocalChangedFiles();
    for (const f of localFiles) changedFiles.add(f);
  }

  // Map any detected changed files to public routes
  if (changedFiles.size > 0) {
    const mapped = mapChangedFilesToRoutes([...changedFiles]);
    candidatePaths.push(...mapped.candidateRoutes);
  }

  // Deduplicate candidate paths
  const uniqueCandidates = [...new Set(candidatePaths)].sort();

  if (uniqueCandidates.length === 0) {
    if (!options.json) {
      console.log(
        "[indexnow] No public discovery or content changes detected. Nothing to submit.",
      );
    } else {
      console.log(
        JSON.stringify({
          status: "noop",
          message: "No public changes detected",
          submittedUrls: [],
        }),
      );
    }
    process.exit(0);
  }

  const result = await submitToIndexNow(uniqueCandidates, {
    host: options.host,
    key: options.key || process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY,
    dryRun: options.dryRun,
    batchSize: options.batchSize,
  });

  const summaryMarkdown = formatIndexNowStepSummary(result);

  if (options.summary) {
    const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryFile) {
      try {
        appendFileSync(stepSummaryFile, `${summaryMarkdown}\n\n`, "utf8");
      } catch (err) {
        console.error(
          `[indexnow] Failed writing to GITHUB_STEP_SUMMARY: ${err}`,
        );
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[indexnow] ${result.dryRun ? "[DRY RUN] " : ""}Candidate URLs: ${uniqueCandidates.length} | Valid: ${result.submittedUrls.length} | Skipped: ${result.skippedUrls.length}`,
    );
    for (const url of result.submittedUrls) {
      console.log(`  ✓ ${url}`);
    }
    for (const skipped of result.skippedUrls) {
      console.log(`  ✗ ${skipped.url} (${skipped.reason})`);
    }

    if (result.batches.length > 0) {
      for (const b of result.batches) {
        console.log(
          `[indexnow] Batch #${b.batchNumber} (${b.urlCount} URLs): Status ${b.status} ${b.statusText} - ${b.message}`,
        );
      }
    }
  }

  if (!result.overallSuccess && !result.dryRun) {
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`[indexnow] Fatal error: ${err.message || err}`);
    process.exit(1);
  });
}
