#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const WORKSPACE_ROOTS = ["apps", "packages"];
const FULL_VALIDATION_FILES = new Set([
  "bun.lock",
  "package.json",
  "eslint.config.js",
  "tsconfig.json",
]);

function isDocumentationPath(file) {
  return file.startsWith("docs/") || file.endsWith(".md");
}

export async function loadWorkspaces(root = process.cwd()) {
  const workspaces = [];
  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const directory = join(root, workspaceRoot);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = `${workspaceRoot}/${entry.name}`;
      try {
        const manifest = JSON.parse(
          await readFile(join(root, path, "package.json"), "utf8"),
        );
        workspaces.push({
          name: manifest.name,
          path,
          scripts: manifest.scripts ?? {},
          dependencies: {
            ...manifest.dependencies,
            ...manifest.devDependencies,
          },
        });
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  return workspaces.sort((left, right) => left.name.localeCompare(right.name));
}

export function selectAffectedWorkspaces(
  workspaces,
  changedFiles,
  forceFull = false,
) {
  const fullReason = forceFull
    ? "full validation requested"
    : changedFiles.find(
        (file) =>
          FULL_VALIDATION_FILES.has(file) ||
          file.startsWith(".github/") ||
          file.startsWith("scripts/") ||
          (!WORKSPACE_ROOTS.some((root) => file.startsWith(`${root}/`)) &&
            !isDocumentationPath(file)),
      );

  if (fullReason) {
    return {
      workspaces,
      reasons: Object.fromEntries(
        workspaces.map(({ name }) => [name, `full validation: ${fullReason}`]),
      ),
      full: true,
    };
  }

  const selected = new Set();
  const reasons = {};
  for (const workspace of workspaces) {
    const changed = changedFiles.find(
      (file) =>
        file === workspace.path || file.startsWith(`${workspace.path}/`),
    );
    if (changed) {
      selected.add(workspace.name);
      reasons[workspace.name] = `changed path: ${changed}`;
    }
  }

  let widened = true;
  while (widened) {
    widened = false;
    for (const workspace of workspaces) {
      if (selected.has(workspace.name)) continue;
      const dependency = Object.keys(workspace.dependencies).find((name) =>
        selected.has(name),
      );
      if (dependency) {
        selected.add(workspace.name);
        reasons[workspace.name] =
          `depends on affected workspace: ${dependency}`;
        widened = true;
      }
    }
  }

  return {
    workspaces: workspaces.filter(({ name }) => selected.has(name)),
    reasons,
    full: false,
  };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const base = option("--base");
  const head = option("--head") ?? "HEAD";
  const forceFull = process.argv.includes("--full");
  const runValidation = process.argv.includes("--run");
  if (!base && !forceFull) throw new Error("Pass --base <git-ref> or --full");

  const changedFiles = forceFull
    ? []
    : execFileSync("git", ["diff", "--name-only", base, head, "--"], {
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean);
  const result = selectAffectedWorkspaces(
    await loadWorkspaces(),
    changedFiles,
    forceFull,
  );
  const names = result.workspaces.map(({ name }) => name);
  const scriptNames = ["lint", "test:coverage", "lint:types", "build"];
  const outputs = Object.fromEntries(
    scriptNames.map((script) => [
      script.replace(":", "_"),
      result.workspaces
        .filter((workspace) => workspace.scripts[script])
        .map(({ name }) => name)
        .join(" "),
    ]),
  );
  outputs.affected = names.join(" ");
  outputs.web = String(names.includes("web"));
  outputs.full = String(result.full);

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(
      outputFile,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
  }

  console.log(`Affected workspaces: ${names.join(", ") || "none"}`);
  for (const name of names) console.log(`- ${name}: ${result.reasons[name]}`);

  if (runValidation) {
    for (const workspace of result.workspaces) {
      for (const script of ["lint", "test"]) {
        if (!workspace.scripts[script]) continue;
        console.log(`Running ${script} for ${workspace.name}`);
        execFileSync("bun", ["run", "--filter", workspace.name, script], {
          stdio: "inherit",
        });
      }
    }
  }
}

if (import.meta.main)
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
