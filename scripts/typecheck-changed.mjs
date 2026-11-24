#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  loadWorkspaces,
  selectAffectedWorkspaces,
} from "./affected-workspaces.mjs";
import { getChangedFiles, parseGateCliArgs } from "./lint-changed.mjs";

function stepForWorkspace(workspace, { ci = Boolean(process.env.CI) } = {}) {
  if (workspace.path === "apps/web") {
    const args = ci
      ? [
          "svelte-check",
          "--tsconfig",
          "./tsconfig.json",
          "--threshold",
          "error",
        ]
      : [
          "svelte-check",
          "--tsconfig",
          "./tsconfig.typecheck.json",
          "--threshold",
          "error",
          "--diagnostic-sources",
          "js,svelte",
          "--incremental",
          "--tsgo",
        ];
    return {
      label: ci ? "web (svelte-check)" : "web (svelte-check incremental+tsgo)",
      command: "bunx",
      args,
      cwd: "apps/web",
    };
  }
  if (workspace.scripts?.["lint:types"]) {
    return {
      label: workspace.name,
      command: "bun",
      args: ["run", "lint:types"],
      cwd: workspace.path,
    };
  }
  return null;
}

const NON_TYPECHECK_PREFIXES = ["scripts/", ".husky/", "specs/", ".github/"];

export function filterTypecheckTriggerFiles(changedFiles) {
  return changedFiles.filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    return !NON_TYPECHECK_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    );
  });
}

export function planTypecheck({
  changedFiles,
  workspaces,
  ci = Boolean(process.env.CI),
}) {
  const triggerFiles = filterTypecheckTriggerFiles(changedFiles);
  if (triggerFiles.length === 0) return [];
  const { workspaces: affected } = selectAffectedWorkspaces(
    workspaces,
    triggerFiles,
  );
  return affected
    .map((workspace) => stepForWorkspace(workspace, { ci }))
    .filter(Boolean);
}

function runStep(step, cwd, exec) {
  console.log(`🔎 Typechecking ${step.label}...`);
  try {
    exec(step.command, step.args, { cwd: resolve(cwd, step.cwd) });
    return true;
  } catch {
    console.error(`❌ Typecheck failed for ${step.label}.`);
    return false;
  }
}

export async function runTypecheckChanged(options = {}) {
  const {
    base,
    head = "HEAD",
    committedOnly = false,
    cwd = process.cwd(),
    exec = (command, args, opts) =>
      execFileSync(command, args, { ...opts, stdio: "inherit" }),
  } = options;
  const changedFiles = getChangedFiles({ base, head, committedOnly, cwd });
  const steps =
    changedFiles.length === 0
      ? []
      : planTypecheck({ changedFiles, workspaces: await loadWorkspaces(cwd) });

  if (steps.length === 0) {
    console.log("✨ No workspaces need typechecking.");
    return true;
  }

  const passed = steps.every((step) => runStep(step, cwd, exec));
  if (passed) console.log("✅ Typecheck passed.");
  return passed;
}

if (import.meta.main) {
  const { committedOnly, base, head } = parseGateCliArgs();
  const ok = await runTypecheckChanged({ base, head, committedOnly });
  if (!ok) {
    process.exit(1);
  }
}
