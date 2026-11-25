#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function resolveHeadSha(cwd = process.cwd()) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function resolveStampPath(cwd = process.cwd()) {
  const gitDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
    cwd,
    encoding: "utf8",
  }).trim();
  return path.resolve(cwd, gitDir, "codex-review-stamp");
}

export function writeReviewStamp(headSha, stampPath) {
  writeFileSync(stampPath, `${headSha}\n`, "utf8");
}

export function hasValidReviewStamp(headSha, stampPath) {
  if (!existsSync(stampPath)) return false;
  return readFileSync(stampPath, "utf8").trim() === headSha;
}

if (import.meta.main) {
  const checkOnly = process.argv.includes("--check");
  const headSha = resolveHeadSha();
  const stampPath = resolveStampPath();

  if (checkOnly) {
    if (hasValidReviewStamp(headSha, stampPath)) {
      console.log(
        `✅ Local codex-review stamp verified for ${headSha.slice(0, 9)}.`,
      );
      process.exit(0);
    }
    console.error(
      `❌ Missing or stale local codex-review stamp for ${headSha.slice(0, 9)}.\n` +
        `   Run the local codex-review pass (Sweeps 0-8) and stamp HEAD:\n` +
        `     bun scripts/codex-review-stamp.mjs\n` +
        `   (For human WIP pushes, bypass with: SKIP_CODEX_REVIEW=1 git push)`,
    );
    process.exit(1);
  }

  writeReviewStamp(headSha, stampPath);
  console.log(
    `✅ Recorded local codex-review stamp for ${headSha.slice(0, 9)}.`,
  );
}
