#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
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
  return (
    IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    normalized.endsWith(".generated.json")
  );
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

const ANSWER_PAGES_PREFIX = "apps/web/src/lib/content/answers/pages/";

/** Changed Answer page files that the editorial checker should inspect (#4012). */
export function filterAnswerPageFiles(files, root = process.cwd()) {
  return files.filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    return (
      normalized.startsWith(ANSWER_PAGES_PREFIX) &&
      normalized.endsWith(".ts") &&
      !normalized.endsWith(".test.ts") &&
      existsSync(resolve(root, normalized))
    );
  });
}

/** Changed components and modules that the UI pattern checker should inspect. */
export function filterUiPatternFiles(files, root = process.cwd()) {
  return files.filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    return (
      /^(apps|packages)\//.test(normalized) &&
      /\.(svelte|ts)$/.test(normalized) &&
      !/\.(test|spec)\.ts$/.test(normalized) &&
      existsSync(resolve(root, normalized))
    );
  });
}

const CONTENT_PREFIXES = [
  "apps/web/src/lib/content/answers/",
  "apps/web/src/lib/content/for/",
  "apps/web/src/lib/content/help/",
  "apps/web/src/lib/content/discovery/",
];

/** True when the change touches public discovery content that has deterministic mesh/intent checks. */
export function touchesDiscoveryContent(files) {
  return files.some((file) => {
    const normalized = file.replace(/\\/g, "/");
    return CONTENT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
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

export function buildEslintArgs(lintFiles, { fix = false } = {}) {
  const args = [
    "eslint",
    "--cache",
    "--cache-strategy",
    "content",
    "--cache-location",
    "node_modules/.cache/eslint/",
  ];
  if (fix) args.push("--fix");
  args.push(...lintFiles);
  return args;
}

// fallow-ignore-next-line complexity -- git diff and status fallbacks are covered by lint-changed tests.
export function getChangedFiles({
  base,
  head = "HEAD",
  stagedOnly = false,
  committedOnly = false,
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

  // Include working-tree modifications locally unless --committed-only is set.
  if (!committedOnly) {
    try {
      const uncommittedOutput = execFileSync("git", ["status", "--porcelain"], {
        cwd,
        encoding: "utf8",
      });
      for (const line of uncommittedOutput.split("\n")) {
        if (!line) continue;
        if (line.startsWith("??")) continue; // Skip untracked files
        const pathPart = line.slice(3).trim();
        const finalPath = pathPart.includes(" -> ")
          ? pathPart.split(" -> ")[1].trim()
          : pathPart;
        if (finalPath) fileSet.add(finalPath);
      }
    } catch {
      // Ignore status errors
    }
  }

  return Array.from(fileSet);
}

export function runBufferedCommand(label, cmd, args, cwd, onSpawn) {
  return new Promise((resolvePromise) => {
    const startedAt = Date.now();
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    onSpawn?.(child, true);
    let output = "";
    const append = (chunk) => {
      output += chunk.toString();
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.on("close", (code) => {
      onSpawn?.(child, false);
      resolvePromise({
        name: label,
        label,
        ok: code === 0,
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
        output,
      });
    });
    child.on("error", (err) => {
      onSpawn?.(child, false);
      resolvePromise({
        name: label,
        label,
        ok: false,
        code: 1,
        durationMs: Date.now() - startedAt,
        output: `${output}\n${err.message}`.trim(),
      });
    });
  });
}

function addContentLintSteps(steps, changedFiles, base, cwd) {
  const answerFiles = filterAnswerPageFiles(changedFiles, cwd);
  if (answerFiles.length > 0) {
    steps.push({
      label: `Answer editorial (${answerFiles.length} file(s))`,
      cmd: "bun",
      args: ["scripts/check-answer-editorial.ts", "--files", ...answerFiles],
    });
  }
  const uiFiles = filterUiPatternFiles(changedFiles, cwd);
  if (uiFiles.length > 0) {
    const uiBase = base ?? resolveGitBase(cwd);
    steps.push({
      label: `UI patterns (${uiFiles.length} file(s))`,
      cmd: "bun",
      args: [
        "scripts/check-ui-patterns.mjs",
        ...(uiBase ? ["--base", uiBase] : []),
        "--files",
        ...uiFiles,
      ],
    });
  }
  if (touchesDiscoveryContent(changedFiles)) {
    steps.push(
      {
        label: "Answer mesh (reciprocal links)",
        cmd: "bun",
        args: ["scripts/check-answer-mesh.ts"],
      },
      {
        label: "Discovery intent audit",
        cmd: "bun",
        args: ["scripts/discovery-audit.mjs"],
      },
    );
  }
}

function buildLintSteps({
  changedFiles,
  lintFiles,
  formatFiles,
  fix,
  base,
  cwd,
}) {
  const runner = process.platform === "win32" ? "npx.cmd" : "bunx";
  const steps = [];
  if (lintFiles.length > 0) {
    steps.push({
      label: `ESLint (${lintFiles.length} file(s))`,
      cmd: runner,
      args: buildEslintArgs(lintFiles, { fix }),
    });
  }
  if (formatFiles.length > 0) {
    steps.push({
      label: `Prettier (${formatFiles.length} file(s))`,
      cmd: runner,
      args: ["prettier", fix ? "--write" : "--check", ...formatFiles],
    });
  }
  addContentLintSteps(steps, changedFiles, base, cwd);
  return steps;
}

// fallow-ignore-next-line complexity -- both lint and format outcomes are handled by the changed-file validation path.
export async function runLintChanged({
  base,
  head = "HEAD",
  fix = false,
  committedOnly = false,
  cwd = process.cwd(),
} = {}) {
  const changedFiles = getChangedFiles({ base, head, committedOnly, cwd });
  const lintFiles = filterLintableFiles(changedFiles, cwd);
  const formatFiles = filterFormattableFiles(changedFiles, cwd);

  if (lintFiles.length === 0 && formatFiles.length === 0) {
    console.log("✨ No changed files to lint or format.");
    return true;
  }

  console.log(
    `🔍 Checking ${lintFiles.length} lintable / ${formatFiles.length} formattable changed file(s)...`,
  );

  const steps = buildLintSteps({
    changedFiles,
    lintFiles,
    formatFiles,
    fix,
    base,
    cwd,
  });

  // Run sequentially when --fix writes files, concurrently when read-only.
  const results = fix
    ? await steps.reduce(async (accPromise, step) => {
        const acc = await accPromise;
        acc.push(
          await runBufferedCommand(step.label, step.cmd, step.args, cwd),
        );
        return acc;
      }, Promise.resolve([]))
    : await Promise.all(
        steps.map((step) =>
          runBufferedCommand(step.label, step.cmd, step.args, cwd),
        ),
      );

  for (const result of results) {
    console.log(`${result.ok ? "✅" : "❌"} ${result.label}`);
    if (!result.ok && result.output.trim()) {
      console.error(result.output.trimEnd());
    }
  }

  if (touchesDiscoveryContent(changedFiles)) {
    console.log(
      "\n💡 Content changed: run /codex-review and verify every feature, UI path or 'automatically does X' claim against code before pushing.",
    );
  }

  return results.every((result) => result.ok);
}

export function parseGateCliArgs(argv = process.argv) {
  const baseIndex = argv.indexOf("--base");
  const headIndex = argv.indexOf("--head");
  return {
    fix: argv.includes("--fix"),
    committedOnly: argv.includes("--committed-only"),
    verbose: argv.includes("--verbose"),
    base: baseIndex !== -1 ? argv[baseIndex + 1] : undefined,
    head: headIndex !== -1 ? argv[headIndex + 1] : "HEAD",
  };
}

if (import.meta.main) {
  const { fix, committedOnly, base, head } = parseGateCliArgs();
  const success = await runLintChanged({ base, head, fix, committedOnly });
  if (!success) {
    process.exit(1);
  }
}
