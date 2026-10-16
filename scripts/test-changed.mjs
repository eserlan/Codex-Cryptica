#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { availableParallelism, setPriority } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { getChangedFiles } from "./lint-changed.mjs";

const TEST_EXTENSIONS = [".test.ts", ".spec.ts", ".test.js", ".spec.js"];

export function findCoLocatedTests(filePath, root = process.cwd()) {
  const tests = [];
  const normalized = filePath.replace(/\\/g, "/");

  // If it's already a test file
  if (TEST_EXTENSIONS.some((ext) => normalized.endsWith(ext))) {
    if (existsSync(resolve(root, normalized))) {
      tests.push(normalized);
    }
    return tests;
  }

  // Check possible co-located test extensions
  const withoutExt = normalized.replace(/\.(svelte|ts|js|tsx|jsx)$/, "");
  for (const ext of TEST_EXTENSIONS) {
    const candidate = `${withoutExt}${ext}`;
    if (existsSync(resolve(root, candidate))) {
      tests.push(candidate);
    }
  }

  // Check tests/ or test/ directory counterparts when file is under src/
  if (normalized.includes("/src/")) {
    for (const testDir of ["/tests/", "/test/"]) {
      const candDir = normalized.replace("/src/", testDir);
      const candWithoutExt = candDir.replace(/\.(svelte|ts|js|tsx|jsx)$/, "");
      for (const ext of TEST_EXTENSIONS) {
        const candidate = `${candWithoutExt}${ext}`;
        if (
          existsSync(resolve(root, candidate)) &&
          !tests.includes(candidate)
        ) {
          tests.push(candidate);
        }
      }
    }
  }

  // Handle SvelteKit route files like +page.svelte / +layout.svelte
  const parts = normalized.split("/");
  const filename = parts[parts.length - 1];
  const dir = dirname(normalized);

  if (filename === "+page.svelte" || filename === "+page.ts") {
    for (const pattern of [
      "page.route.test.ts",
      "page.test.ts",
      "page.load.test.ts",
      "+page.test.ts",
    ]) {
      const candidate = join(dir, pattern).replace(/\\/g, "/");
      if (existsSync(resolve(root, candidate))) {
        tests.push(candidate);
      }
    }
  } else if (filename === "+layout.svelte" || filename === "+layout.ts") {
    for (const pattern of [
      "layout.route.test.ts",
      "layout.test.ts",
      "+layout.test.ts",
    ]) {
      const candidate = join(dir, pattern).replace(/\\/g, "/");
      if (existsSync(resolve(root, candidate))) {
        tests.push(candidate);
      }
    }
  }

  return tests;
}

export function groupTestsByWorkspace(testFiles, root = process.cwd()) {
  const groups = new Map();

  for (const file of testFiles) {
    const normalized = file.replace(/\\/g, "/");
    let workspace = "root";

    const parts = normalized.split("/");
    if (parts[0] === "apps" || parts[0] === "packages") {
      for (let length = 2; length < parts.length; length += 1) {
        const candidate = parts.slice(0, length).join("/");
        if (existsSync(resolve(root, candidate, "package.json"))) {
          workspace = candidate;
        }
      }
    }

    if (!groups.has(workspace)) {
      groups.set(workspace, []);
    }
    groups.get(workspace).push(normalized);
  }

  return groups;
}

/**
 * Playwright E2E specs live in apps/web/tests and run in their own CI job.
 * Handing one to vitest fails with "No test files found", so they are not
 * unit-test targets.
 */
export function isUnitTestFile(file) {
  return !file.replace(/\\/g, "/").startsWith("apps/web/tests/");
}

export function getWorkspaceTestInvocation(workspace, packageName, files) {
  if (workspace === "root") {
    return { cwd: ".", args: ["test", ...files] };
  }

  const workspacePath = workspace.replace(/\\/g, "/");
  const relativeFiles = files.map((file) =>
    relative(workspacePath, file).replace(/\\/g, "/"),
  );
  return {
    cwd: workspacePath,
    args: ["run", "--filter", packageName, "test", "--", ...relativeFiles],
  };
}

function runWebTests(files, cwd) {
  const relativeFiles = files.map((file) =>
    relative("apps/web", file).replace(/\\/g, "/"),
  );
  execFileSync("bunx", ["vitest", "run", ...relativeFiles], {
    cwd: resolve(cwd, "apps/web"),
    stdio: "inherit",
  });
}

function runPackageTests(workspace, files, cwd) {
  if (workspace === "root") {
    const invocation = getWorkspaceTestInvocation(workspace, "", files);
    execFileSync("bun", invocation.args, {
      cwd: resolve(cwd, invocation.cwd),
      stdio: "inherit",
    });
    return;
  }

  const manifestPath = resolve(cwd, workspace, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const invocation = getWorkspaceTestInvocation(
    workspace,
    manifest.name,
    files,
  );
  execFileSync("bun", invocation.args, {
    cwd: resolve(cwd, invocation.cwd),
    stdio: "inherit",
  });
}

function runWorkspaceTests(workspace, files, cwd) {
  try {
    if (workspace === "apps/web") {
      runWebTests(files, cwd);
    } else {
      runPackageTests(workspace, files, cwd);
    }
    console.log(`✅ ${workspace} tests passed.`);
    return true;
  } catch {
    console.error(`❌ ${workspace} tests failed.`);
    return false;
  }
}

/**
 * Local runs share the machine with an editor and browser, so cap vitest at
 * half the cores and drop the test processes' scheduling priority (children
 * inherit it). CI keeps full parallelism; an explicit VITEST_MAX_WORKERS wins.
 */
export function getLocalTestEnv(
  env = process.env,
  cores = availableParallelism(),
) {
  if (env.CI || env.VITEST_MAX_WORKERS) return {};
  return { VITEST_MAX_WORKERS: String(Math.max(1, Math.floor(cores / 2))) };
}

function throttleLocalRun() {
  Object.assign(process.env, getLocalTestEnv());
  if (process.env.CI) return;
  try {
    setPriority(10);
  } catch {
    // Not permitted on every platform; running at normal priority is fine.
  }
}

export function runTestChanged({
  base,
  head = "HEAD",
  cwd = process.cwd(),
} = {}) {
  const changedFiles = getChangedFiles({ base, head, cwd });
  const testFilesSet = new Set();

  for (const file of changedFiles) {
    const found = findCoLocatedTests(file, cwd);
    for (const t of found) {
      testFilesSet.add(t);
    }
  }

  const allTestFiles = Array.from(testFilesSet).filter(isUnitTestFile);

  if (allTestFiles.length === 0) {
    console.log("✨ No test files affected by changed files.");
    return true;
  }

  console.log(`🔍 Found ${allTestFiles.length} affected test file(s):`);
  for (const file of allTestFiles) {
    console.log(`  - ${file}`);
  }

  const workspaceGroups = groupTestsByWorkspace(allTestFiles);
  let allPassed = true;

  for (const [workspace, files] of workspaceGroups.entries()) {
    console.log(
      `\n🧪 Running tests for ${workspace} (${files.length} test file(s))...`,
    );
    if (!runWorkspaceTests(workspace, files, cwd)) allPassed = false;
  }

  return allPassed;
}

if (import.meta.main) {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex !== -1 ? process.argv[baseIndex + 1] : undefined;
  const headIndex = process.argv.indexOf("--head");
  const head = headIndex !== -1 ? process.argv[headIndex + 1] : "HEAD";

  throttleLocalRun();
  const success = runTestChanged({ base, head });
  if (!success) {
    process.exit(1);
  }
}
