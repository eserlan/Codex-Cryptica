#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
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

export function groupTestsByWorkspace(testFiles) {
  const groups = new Map();

  for (const file of testFiles) {
    const normalized = file.replace(/\\/g, "/");
    let workspace = "root";

    if (normalized.startsWith("apps/web/")) {
      workspace = "apps/web";
    } else if (normalized.startsWith("packages/")) {
      const parts = normalized.split("/");
      workspace = `${parts[0]}/${parts[1]}`;
    } else if (normalized.startsWith("apps/")) {
      const parts = normalized.split("/");
      workspace = `${parts[0]}/${parts[1]}`;
    }

    if (!groups.has(workspace)) {
      groups.set(workspace, []);
    }
    groups.get(workspace).push(normalized);
  }

  return groups;
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

  const allTestFiles = Array.from(testFilesSet);

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

    if (workspace === "apps/web") {
      // In apps/web, vitest runs relative to apps/web directory
      const relativeFiles = files.map((f) =>
        relative("apps/web", f).replace(/\\/g, "/"),
      );
      try {
        execFileSync("bunx", ["vitest", "run", ...relativeFiles], {
          cwd: resolve(cwd, "apps/web"),
          stdio: "inherit",
        });
        console.log(`✅ ${workspace} tests passed.`);
      } catch {
        allPassed = false;
        console.error(`❌ ${workspace} tests failed.`);
      }
    } else {
      // For packages or root, use bun test
      try {
        execFileSync("bun", ["test", ...files], {
          cwd,
          stdio: "inherit",
        });
        console.log(`✅ ${workspace} tests passed.`);
      } catch {
        allPassed = false;
        console.error(`❌ ${workspace} tests failed.`);
      }
    }
  }

  return allPassed;
}

if (import.meta.main) {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex !== -1 ? process.argv[baseIndex + 1] : undefined;
  const headIndex = process.argv.indexOf("--head");
  const head = headIndex !== -1 ? process.argv[headIndex + 1] : "HEAD";

  const success = runTestChanged({ base, head });
  if (!success) {
    process.exit(1);
  }
}
