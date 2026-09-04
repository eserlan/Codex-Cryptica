import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, extname, basename } from "node:path";

export interface FileAnalysis {
  path: string;
  relativePath: string;
  totalLines: number;
  codeLines: number;
  functionCount: number;
  type: ArchitecturalType;
  isDataCatalog: boolean;
  status: "CRITICAL" | "WATCH" | "STABLE";
  rationale?: string;
}

export type ArchitecturalType =
  | "UI Component"
  | "Store (State)"
  | "Service"
  | "Controller"
  | "Worker Router"
  | "Engine Core"
  | "Utility / Module"
  | "Data Catalog";

export interface AnalysisOptions {
  rootDir?: string;
  threshold?: number;
  criticalThreshold?: number;
  topCount?: number;
  summaryPath?: string;
  jsonPath?: string;
  failOnCritical?: boolean;
}

export interface AnalysisReport {
  timestamp: string;
  threshold: number;
  criticalThreshold: number;
  totalFilesScanned: number;
  sourceFilesEvaluated: number;
  dataCatalogsExcluded: number;
  watchCount: number;
  criticalCount: number;
  topFiles: FileAnalysis[];
  breakdownByType: Record<
    ArchitecturalType,
    { count: number; totalLines: number; overThreshold: number }
  >;
}

/**
 * Data/catalog files exempted by Constitution Principle XIV.4 and docs/GOD_FILES_ANALYSIS.md.
 * These are single-responsibility data definitions whose size comes from content volume,
 * not coupling or complex logic.
 */
const DATA_CATALOG_PATTERNS = [
  /packages\/generator-engine\/src\/public-.*\.ts$/,
  /packages\/generator-engine\/src\/campaign-generator-registry\.ts$/,
  /packages\/generator-engine\/src\/language-profile\.ts$/,
  /packages\/schema\/src\/silhouettes\.ts$/,
  /packages\/schema\/src\/theme-templates\.ts$/,
  /packages\/schema\/src\/art-direction-catalogue\.ts$/,
  /apps\/web\/src\/lib\/config\/seo-pages\.ts$/,
  /apps\/web\/src\/lib\/components\/seo\/generator-page-meta\.ts$/,
  /EntityTemplateConstants\.ts$/,
];

/**
 * Directories to ignore completely during scanning.
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".svelte-kit",
  "dist",
  "build",
  ".git",
  ".agent",
  ".agents",
  ".codex",
  ".specify",
  ".gemini",
  "coverage",
  "test-results",
  "playwright-report",
  "static",
]);

/**
 * Determine if a file path is a test file or test utility.
 */
export function isTestFile(relativePath: string): boolean {
  if (
    relativePath.endsWith(".test.ts") ||
    relativePath.endsWith(".test.js") ||
    relativePath.endsWith(".test.mjs") ||
    relativePath.endsWith(".spec.ts") ||
    relativePath.endsWith(".spec.js")
  ) {
    return true;
  }
  const parts = relativePath.split("/");
  return (
    parts.includes("tests") ||
    parts.includes("__tests__") ||
    parts.includes("test-utils")
  );
}

/**
 * Classify file into its architectural layer.
 */
export function classifyArchitecture(
  relativePath: string,
  isData: boolean,
): ArchitecturalType {
  if (isData) return "Data Catalog";
  if (relativePath.endsWith(".svelte")) return "UI Component";
  if (relativePath.includes("/workers/") || relativePath.endsWith(".worker.ts"))
    return "Worker Router";
  if (
    relativePath.includes("/stores/") ||
    relativePath.endsWith("store.ts") ||
    relativePath.endsWith("store.svelte.ts") ||
    basename(relativePath).includes("-store")
  ) {
    return "Store (State)";
  }
  if (
    relativePath.includes("/services/") ||
    relativePath.endsWith("service.ts") ||
    relativePath.endsWith("service.svelte.ts") ||
    basename(relativePath).includes("-service")
  ) {
    return "Service";
  }
  if (
    relativePath.includes("/controllers/") ||
    relativePath.endsWith("controller.ts") ||
    relativePath.endsWith("controller.svelte.ts") ||
    basename(relativePath).includes("-controller")
  ) {
    return "Controller";
  }
  if (
    relativePath.startsWith("packages/") &&
    relativePath.includes("-engine/")
  ) {
    return "Engine Core";
  }
  return "Utility / Module";
}

/**
 * Check whether a file is a data/config catalogue according to Constitution Principle XIV.
 */
export function isDataCatalogModule(
  relativePath: string,
  content: string,
): boolean {
  // 1. Explicit pattern matches
  for (const pattern of DATA_CATALOG_PATTERNS) {
    if (pattern.test(relativePath)) {
      return true;
    }
  }

  // 2. Svelte components are UI, never pure data modules
  if (relativePath.endsWith(".svelte")) {
    return false;
  }

  // 3. Heuristic: if file is mostly constant declarations and has zero/near-zero function declarations
  // or class declarations, check line/function density.
  const functionMatches = content.match(
    /function\s+[a-zA-Z0-9_$]+|\b[a-zA-Z0-9_$]+\s*\([^)]*\)\s*:\s*[^={]+=>|\b(?:class)\s+[a-zA-Z0-9_$]+/g,
  );
  const functionCount = functionMatches ? functionMatches.length : 0;

  const lines = content.split("\n").length;
  // If file has over 500 lines but <= 2 function declarations, and exports constants/dictionaries
  if (lines > 500 && functionCount <= 2) {
    if (
      content.includes("export const ") ||
      content.includes("export default ") ||
      content.includes("export type ")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Count total lines, non-empty code lines, and function definitions.
 */
export function analyzeContent(content: string): {
  totalLines: number;
  codeLines: number;
  functionCount: number;
} {
  const lines = content.split("\n");
  const totalLines = lines.length;

  let codeLines = 0;
  let inBlockComment = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (inBlockComment) {
      if (line.includes("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    if (line.startsWith("/*")) {
      if (!line.includes("*/")) {
        inBlockComment = true;
      }
      continue;
    }

    if (line.startsWith("//") || line.startsWith("<!--")) {
      continue;
    }

    codeLines++;
  }

  const funcMatches = content.match(
    /\b(?:function\s+[a-zA-Z0-9_$]+|async\s+function\s+[a-zA-Z0-9_$]+|(?:public\s+|private\s+|protected\s+|async\s+)*[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{|(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g,
  );
  const functionCount = funcMatches ? funcMatches.length : 0;

  return { totalLines, codeLines, functionCount };
}

/**
 * Recursively find all source files in target directories.
 */
async function collectFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".codex") continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath, baseDir)));
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (
        ext === ".ts" ||
        ext === ".svelte" ||
        ext === ".js" ||
        ext === ".mjs"
      ) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Run the god file analysis on the repository.
 */
export async function runGodFileAnalysis(
  options: AnalysisOptions = {},
): Promise<AnalysisReport> {
  const rootDir = options.rootDir || process.cwd();
  const threshold = options.threshold ?? 500;
  const criticalThreshold = options.criticalThreshold ?? 800;
  const topCount = options.topCount ?? 20;

  const targetDirs = ["apps", "packages"].map((d) => resolve(rootDir, d));
  const allFiles: string[] = [];

  for (const dir of targetDirs) {
    try {
      const files = await collectFiles(dir, rootDir);
      allFiles.push(...files);
    } catch {
      // Directory may not exist in test setups
    }
  }

  let sourceFilesEvaluated = 0;
  let dataCatalogsExcluded = 0;
  const evaluatedFiles: FileAnalysis[] = [];

  const breakdownByType: Record<
    ArchitecturalType,
    { count: number; totalLines: number; overThreshold: number }
  > = {
    "UI Component": { count: 0, totalLines: 0, overThreshold: 0 },
    "Store (State)": { count: 0, totalLines: 0, overThreshold: 0 },
    Service: { count: 0, totalLines: 0, overThreshold: 0 },
    Controller: { count: 0, totalLines: 0, overThreshold: 0 },
    "Worker Router": { count: 0, totalLines: 0, overThreshold: 0 },
    "Engine Core": { count: 0, totalLines: 0, overThreshold: 0 },
    "Utility / Module": { count: 0, totalLines: 0, overThreshold: 0 },
    "Data Catalog": { count: 0, totalLines: 0, overThreshold: 0 },
  };

  for (const filePath of allFiles) {
    const relativePath = relative(rootDir, filePath);

    if (isTestFile(relativePath)) {
      continue;
    }

    const content = await readFile(filePath, "utf-8");
    const { totalLines, codeLines, functionCount } = analyzeContent(content);

    const isData = isDataCatalogModule(relativePath, content);
    const archType = classifyArchitecture(relativePath, isData);

    breakdownByType[archType].count++;
    breakdownByType[archType].totalLines += totalLines;
    if (totalLines >= threshold) {
      breakdownByType[archType].overThreshold++;
    }

    if (isData) {
      dataCatalogsExcluded++;
      continue;
    }

    sourceFilesEvaluated++;

    let status: "CRITICAL" | "WATCH" | "STABLE" = "STABLE";
    if (totalLines >= criticalThreshold) {
      status = "CRITICAL";
    } else if (totalLines >= threshold) {
      status = "WATCH";
    }

    evaluatedFiles.push({
      path: filePath,
      relativePath,
      totalLines,
      codeLines,
      functionCount,
      type: archType,
      isDataCatalog: false,
      status,
    });
  }

  // Sort descending by totalLines
  evaluatedFiles.sort((a, b) => b.totalLines - a.totalLines);

  const watchCount = evaluatedFiles.filter((f) => f.status === "WATCH").length;
  const criticalCount = evaluatedFiles.filter(
    (f) => f.status === "CRITICAL",
  ).length;
  const topFiles = evaluatedFiles.slice(0, topCount);

  return {
    timestamp: new Date().toISOString(),
    threshold,
    criticalThreshold,
    totalFilesScanned: allFiles.length,
    sourceFilesEvaluated,
    dataCatalogsExcluded,
    watchCount,
    criticalCount,
    topFiles,
    breakdownByType,
  };
}

/**
 * Format the analysis report into GitHub Step Summary Markdown.
 */
export function formatMarkdownSummary(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push("# 🏛️ God File Analysis Report");
  lines.push("");
  lines.push(
    `_Evaluated on ${report.timestamp.split("T")[0]} against Constitution Principle XIV (Bounded Responsibility)._`,
  );
  lines.push("");

  // Executive KPI summary cards
  lines.push("### Executive Summary");
  lines.push("");
  lines.push(`| Metric | Value | Reference |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(
    `| **Evaluated Source Files** | \`${report.sourceFilesEvaluated}\` | Excluding tests & data catalogues |`,
  );
  lines.push(
    `| **Data Catalogues Excluded** | \`${report.dataCatalogsExcluded}\` | Principle XIV.4 constant registries |`,
  );
  lines.push(
    `| **🔴 Critical Files (>= ${report.criticalThreshold} lines)** | \`${report.criticalCount}\` | Immediate refactor candidates |`,
  );
  lines.push(
    `| **🟡 Watch Files (>= ${report.threshold} lines)** | \`${report.watchCount}\` | Principle XIV review trigger |`,
  );
  lines.push("");

  // Principle XIV reminder
  lines.push("> [!IMPORTANT]");
  lines.push("> **Constitution Principle XIV (Bounded Responsibility)**:");
  lines.push(
    "> Files crossing **500 lines** must be justified in review by naming their single responsibility, or decomposed along unrelated concerns. Data modules (constants, catalogues) are exempt from size triggers.",
  );
  lines.push("");

  // Top offenders table
  lines.push(`### Top Largest Source Files (Ranked)`);
  lines.push("");
  lines.push(
    "| Rank | Status | File Path | Total Lines | Code Lines | Est. Handlers/Funcs | Layer |",
  );
  lines.push("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

  report.topFiles.forEach((file, idx) => {
    const rank = idx + 1;
    const statusIcon =
      file.status === "CRITICAL"
        ? "🔴 CRITICAL"
        : file.status === "WATCH"
          ? "🟡 WATCH"
          : "🟢 STABLE";
    lines.push(
      `| ${rank} | ${statusIcon} | \`${file.relativePath}\` | ${file.totalLines} | ${file.codeLines} | ${file.functionCount} | ${file.type} |`,
    );
  });
  lines.push("");

  // Breakdown by layer
  lines.push("### Breakdown By Architectural Layer");
  lines.push("");
  lines.push("| Layer | Total Files | Over 500 Lines | Total Lines |");
  lines.push("| :--- | :--- | :--- | :--- |");

  for (const [layer, stats] of Object.entries(report.breakdownByType)) {
    if (layer === "Data Catalog" && stats.count === 0) continue;
    lines.push(
      `| ${layer} | ${stats.count} | ${stats.overThreshold} | ${stats.totalLines.toLocaleString()} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Main execution CLI entrypoint.
 */
async function main() {
  const args = process.argv.slice(2);
  let summaryPath: string | undefined;
  let jsonPath: string | undefined;
  let threshold = 500;
  let criticalThreshold = 800;
  let topCount = 25;
  let failOnCritical = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--summary-file" && args[i + 1]) {
      summaryPath = args[++i];
    } else if (arg.startsWith("--summary-file=")) {
      summaryPath = arg.split("=")[1];
    } else if (arg === "--json-file" && args[i + 1]) {
      jsonPath = args[++i];
    } else if (arg.startsWith("--json-file=")) {
      jsonPath = arg.split("=")[1];
    } else if (arg === "--threshold" && args[i + 1]) {
      threshold = parseInt(args[++i], 10);
    } else if (arg === "--critical-threshold" && args[i + 1]) {
      criticalThreshold = parseInt(args[++i], 10);
    } else if (arg === "--top" && args[i + 1]) {
      topCount = parseInt(args[++i], 10);
    } else if (arg === "--fail-on-critical") {
      failOnCritical = true;
    }
  }

  console.log("🔍 Running God File Analysis for Codex-Cryptica...");
  const report = await runGodFileAnalysis({
    threshold,
    criticalThreshold,
    topCount,
  });

  console.log(`Evaluated ${report.sourceFilesEvaluated} source files.`);
  console.log(
    `Excluded ${report.dataCatalogsExcluded} pure data/catalogue modules.`,
  );
  console.log(
    `🔴 Critical files (>= ${report.criticalThreshold}): ${report.criticalCount}`,
  );
  console.log(`🟡 Watch files (>= ${report.threshold}): ${report.watchCount}`);

  const markdown = formatMarkdownSummary(report);

  if (summaryPath) {
    await writeFile(summaryPath, markdown, "utf-8");
    console.log(`✅ Summary written to ${summaryPath}`);
  }

  if (jsonPath) {
    await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`✅ JSON report written to ${jsonPath}`);
  }

  // Also write to $GITHUB_STEP_SUMMARY if present in environment and not explicitly passed
  if (!summaryPath && process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, {
      flag: "a",
      encoding: "utf-8",
    });
    console.log("✅ Appended report to GITHUB_STEP_SUMMARY");
  }

  if (failOnCritical && report.criticalCount > 0) {
    console.error(
      `❌ Failed: Found ${report.criticalCount} critical god files!`,
    );
    process.exit(1);
  }
}

// Only invoke main when executed directly
if (import.meta.main) {
  main().catch((err) => {
    console.error("Analysis failed:", err);
    process.exit(1);
  });
}
