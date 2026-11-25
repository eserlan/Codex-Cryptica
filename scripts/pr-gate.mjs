#!/usr/bin/env node

import {
  getChangedFiles,
  parseGateCliArgs,
  resolveGitBase,
  runBufferedCommand,
} from "./lint-changed.mjs";

const CSS_OR_SVELTE_RE = /\.(css|svelte)$/;

export function buildGateTasks({
  base,
  head = "HEAD",
  committedOnly = false,
  changedFiles = [],
}) {
  const baseArgs = ["--base", base, "--head", head];
  if (committedOnly) baseArgs.push("--committed-only");

  const hasCssOrSvelte = changedFiles.some((file) =>
    CSS_OR_SVELTE_RE.test(file),
  );
  const fallowArgs = ["fallow", "audit", "--base", base];
  if (!hasCssOrSvelte) {
    fallowArgs.push("--no-css");
  }

  return [
    {
      name: "lint",
      command: "bun",
      args: ["scripts/lint-changed.mjs", ...baseArgs],
    },
    {
      name: "typecheck",
      command: "bun",
      args: ["scripts/typecheck-changed.mjs", ...baseArgs],
    },
    {
      name: "tests",
      command: "bun",
      args: ["scripts/test-changed.mjs", ...baseArgs],
    },
    {
      name: "fallow",
      command: "bunx",
      args: fallowArgs,
    },
  ];
}

function defaultSpawnRunner(task, cwd, activeChildren) {
  return runBufferedCommand(
    task.name,
    task.command,
    task.args,
    cwd,
    (child, active) => {
      if (active) activeChildren.add(child);
      else activeChildren.delete(child);
    },
  );
}

function formatGateLine(result) {
  const icon = result.ok ? "✅" : "❌";
  const sec = (result.durationMs / 1000).toFixed(1);
  return `${icon} ${result.name.padEnd(10)} ${sec}s`;
}

function printGateSummary(results, totalSec, verbose) {
  console.log(`\n=== PR Gate Summary (${totalSec}s wall) ===`);
  results.forEach((result) => console.log(formatGateLine(result)));

  results
    .filter((result) => (!result.ok || verbose) && result.output.trim())
    .forEach((result) => {
      console.log(`\n--- ${result.name} output ---`);
      console.log(result.output.trimEnd());
    });
}

export async function runPrGate(options = {}) {
  const {
    base,
    head = "HEAD",
    committedOnly = false,
    verbose = false,
    cwd = process.cwd(),
    runner,
  } = options;
  const resolvedBase = base || resolveGitBase(cwd) || "origin/staging";
  const changedFiles = getChangedFiles({
    base: resolvedBase,
    head,
    committedOnly,
    cwd,
  });
  const tasks = buildGateTasks({
    base: resolvedBase,
    head,
    committedOnly,
    changedFiles,
  });

  const activeChildren = new Set();
  const cleanup = () => activeChildren.forEach((c) => c.kill("SIGTERM"));
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  const startedAt = Date.now();
  const execTask =
    runner ?? ((task) => defaultSpawnRunner(task, cwd, activeChildren));
  const results = await Promise.all(tasks.map((task) => execTask(task)));

  process.off("SIGINT", cleanup);
  process.off("SIGTERM", cleanup);

  printGateSummary(
    results,
    ((Date.now() - startedAt) / 1000).toFixed(1),
    verbose,
  );
  return results.every((result) => result.ok);
}

if (import.meta.main) {
  const { committedOnly, verbose, base, head } = parseGateCliArgs();
  const ok = await runPrGate({ base, head, committedOnly, verbose });
  if (!ok) {
    process.exit(1);
  }
}
