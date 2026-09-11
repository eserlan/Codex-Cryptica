#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const LINT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".svelte",
  ".mjs",
  ".cjs",
]);

const FORMAT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".svelte",
  ".json",
  ".md",
  ".css",
  ".mjs",
  ".cjs",
]);

const IGNORED_PREFIXES = [
  "node_modules/",
  "build/",
  ".svelte-kit/",
  "dist/",
  ".gemini/",
  ".codex/",
];

export function isIgnoredPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function filterLintableFiles(files, root = process.cwd()) {
  return files.filter((file) => {
    if (isIgnoredPath(file)) return false;
    const hasValidExt = Array.from(LINT_EXTENSIONS).some((ext) =>
      file.endsWith(ext),
    );
    return hasValidExt && existsSync(resolve(root, file));
  });
}

export function filterFormattableFiles(files, root = process.cwd()) {
  return files.filter((file) => {
    if (isIgnoredPath(file)) return false;
    const hasValidExt = Array.from(FORMAT_EXTENSIONS).some((ext) =>
      file.endsWith(ext),
    );
    return hasValidExt && existsSync(resolve(root, file));
  });
}

export function resolveGitBase(cwd = process.cwd()) {
  const candidates = [
    () =>
      execFileSync("git", ["merge-base", "HEAD", "origin/staging"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    () =>
      execFileSync("git", ["merge-base", "HEAD", "staging"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    () =>
      execFileSync("git", ["rev-parse", "HEAD~1"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
  ];

  for (const candidate of candidates) {
    try {
      const result = candidate();
      if (result) return result;
    } catch {
      // Continue to next fallback
    }
  }
  return null;
}

export function getChangedFiles({
  base,
  head = "HEAD",
  stagedOnly = false,
  cwd = process.cwd(),
} = {}) {
  const fileSet = new Set();

  if (stagedOnly) {
    const output = execFileSync("git", ["diff", "--name-only", "--cached"], {
      cwd,
      encoding: "utf8",
    });
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) fileSet.add(trimmed);
    }
    return Array.from(fileSet);
  }

  const resolvedBase = base || resolveGitBase(cwd);

  if (resolvedBase) {
    try {
      const diffOutput = execFileSync(
        "git",
        ["diff", "--name-only", `${resolvedBase}...${head}`],
        { cwd, encoding: "utf8" },
      );
      for (const line of diffOutput.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) fileSet.add(trimmed);
      }
    } catch {
      // If diff failed, fallback to uncommitted
    }
  }

  // Also include any currently uncommitted working tree changes
  try {
    const uncommittedOutput = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf8",
    });
    for (const line of uncommittedOutput.split("\n")) {
      if (!line) continue;
      const pathPart = line.slice(3).trim();
      const finalPath = pathPart.includes(" -> ")
        ? pathPart.split(" -> ")[1].trim()
        : pathPart;
      if (finalPath) fileSet.add(finalPath);
    }
  } catch {
    // Ignore status errors
  }

  return Array.from(fileSet);
}

export function runLintChanged({
  base,
  head = "HEAD",
  fix = false,
  cwd = process.cwd(),
} = {}) {
  const changedFiles = getChangedFiles({ base, head, cwd });
  const lintFiles = filterLintableFiles(changedFiles, cwd);
  const formatFiles = filterFormattableFiles(changedFiles, cwd);

  if (lintFiles.length === 0 && formatFiles.length === 0) {
    console.log("✨ No changed files to lint or format.");
    return true;
  }

  console.log(
    `🔍 Checking ${lintFiles.length} lintable / ${formatFiles.length} formattable changed file(s)...`,
  );

  let success = true;

  if (lintFiles.length > 0) {
    const args = ["eslint"];
    if (fix) args.push("--fix");
    args.push(...lintFiles);
    try {
      console.log(`\n🧹 Running ESLint on ${lintFiles.length} file(s)...`);
      execFileSync("bunx", args, { cwd, stdio: "inherit" });
      console.log("✅ ESLint passed.");
    } catch {
      success = false;
      console.error("❌ ESLint failed.");
    }
  }

  if (formatFiles.length > 0) {
    const args = ["prettier", fix ? "--write" : "--check", ...formatFiles];
    try {
      console.log(
        `\n🎨 Checking formatting on ${formatFiles.length} file(s)...`,
      );
      execFileSync("bunx", args, { cwd, stdio: "inherit" });
      console.log("✅ Prettier check passed.");
    } catch {
      success = false;
      console.error("❌ Prettier check failed.");
    }
  }

  return success;
}

if (import.meta.main) {
  const fix = process.argv.includes("--fix");
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex !== -1 ? process.argv[baseIndex + 1] : undefined;
  const headIndex = process.argv.indexOf("--head");
  const head = headIndex !== -1 ? process.argv[headIndex + 1] : "HEAD";

  const success = runLintChanged({ base, head, fix });
  if (!success) {
    process.exit(1);
  }
}
