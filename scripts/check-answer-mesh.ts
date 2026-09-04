import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answers } from "../apps/web/src/lib/content/answers/pages";
import type { AnswerConfigInput } from "../apps/web/src/lib/content/answers/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_PAGES_DIR = path.resolve(
  __dirname,
  "../apps/web/src/lib/content/answers/pages",
);

export interface MeshFinding {
  type:
    "missing-reciprocal" | "broken-link" | "alias-conflict" | "cluster-orphan";
  message: string;
  sourceSlug: string;
  targetSlug?: string;
  alias?: string;
}

export interface MeshAnalysisResult {
  totalAnswers: number;
  totalLinks: number;
  reciprocalCount: number;
  missingReciprocalCount: number;
  brokenLinks: MeshFinding[];
  missingReciprocal: MeshFinding[];
  aliasConflicts: MeshFinding[];
  clusterOrphans: MeshFinding[];
}

/**
 * Analyzes the interconnectedness of answer pages.
 */
export function analyzeAnswerMesh(
  registry: Record<string, AnswerConfigInput> = answers,
): MeshAnalysisResult {
  const answerEntries = Object.values(registry);
  const answerMap = new Map(answerEntries.map((a) => [a.slug, a]));

  const brokenLinks: MeshFinding[] = [];
  const missingReciprocal: MeshFinding[] = [];
  const aliasConflicts: MeshFinding[] = [];
  const clusterOrphans: MeshFinding[] = [];

  let totalLinks = 0;
  let reciprocalCount = 0;

  // Build cluster maps
  const clusterMap = new Map<string, AnswerConfigInput[]>();
  for (const answer of answerEntries) {
    const cluster = answer.discovery?.parentCluster ?? answer.category;
    const existing = clusterMap.get(cluster) ?? [];
    existing.push(answer);
    clusterMap.set(cluster, existing);
  }

  for (const answer of answerEntries) {
    const related = answer.relatedAnswers ?? [];
    totalLinks += related.length;

    // Check related answers
    for (const targetSlug of related) {
      const target = answerMap.get(targetSlug);
      if (!target) {
        brokenLinks.push({
          type: "broken-link",
          sourceSlug: answer.slug,
          targetSlug,
          message: `Answer "${answer.slug}" links to unknown answer "${targetSlug}".`,
        });
        continue;
      }

      const targetRelated = target.relatedAnswers ?? [];
      if (targetRelated.includes(answer.slug)) {
        reciprocalCount++;
      } else {
        missingReciprocal.push({
          type: "missing-reciprocal",
          sourceSlug: answer.slug,
          targetSlug,
          message: `"${answer.slug}" links to "${targetSlug}", but "${targetSlug}" does not link back.`,
        });
      }
    }

    // Check alias conflicts against other answers' primary intents
    const aliases = answer.discovery?.intentAliases ?? [];
    for (const alias of aliases) {
      const normAlias = alias.toLowerCase().trim();
      for (const other of answerEntries) {
        if (other.slug === answer.slug) continue;
        const otherPrimary = (
          other.discovery?.primaryIntent ??
          other.question.toLowerCase().replace(/\?$/, "")
        )
          .toLowerCase()
          .trim();

        if (normAlias === otherPrimary) {
          aliasConflicts.push({
            type: "alias-conflict",
            sourceSlug: answer.slug,
            targetSlug: other.slug,
            alias,
            message: `"${answer.slug}" defines alias "${alias}" which is the primary intent of "${other.slug}".`,
          });
        }
      }
    }
  }

  // Check cluster connectivity
  for (const [cluster, clusterAnswers] of clusterMap.entries()) {
    if (clusterAnswers.length <= 1) continue;
    for (const answer of clusterAnswers) {
      const related = answer.relatedAnswers ?? [];
      const hasClusterLink = related.some((targetSlug) => {
        const target = answerMap.get(targetSlug);
        if (!target) return false;
        const targetCluster =
          target.discovery?.parentCluster ?? target.category;
        return targetCluster === cluster;
      });

      if (!hasClusterLink) {
        clusterOrphans.push({
          type: "cluster-orphan",
          sourceSlug: answer.slug,
          message: `Answer "${answer.slug}" is in cluster "${cluster}" but does not link to any other answer in the same cluster.`,
        });
      }
    }
  }

  return {
    totalAnswers: answerEntries.length,
    totalLinks,
    reciprocalCount: Math.floor(reciprocalCount / 2),
    missingReciprocalCount: missingReciprocal.length,
    brokenLinks,
    missingReciprocal,
    aliasConflicts,
    clusterOrphans,
  };
}

/**
 * Automatically applies missing reciprocal links to the corresponding source files.
 */
export function fixMissingReciprocalLinks(
  findings: MeshFinding[],
  pagesDir: string = DEFAULT_PAGES_DIR,
): { fixed: number; modifiedFiles: string[] } {
  let fixed = 0;
  const modifiedFiles = new Set<string>();

  // Group by targetSlug (the file that needs to add sourceSlug to relatedAnswers)
  const additionsByTarget = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (finding.type !== "missing-reciprocal" || !finding.targetSlug) continue;
    const existing = additionsByTarget.get(finding.targetSlug) ?? new Set();
    existing.add(finding.sourceSlug);
    additionsByTarget.set(finding.targetSlug, existing);
  }

  for (const [targetSlug, sourcesToAdd] of additionsByTarget.entries()) {
    const filePath = path.join(pagesDir, `${targetSlug}.ts`);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, "utf-8");
    const relatedMatch = content.match(/relatedAnswers:\s*\[([\s\S]*?)\]/);
    if (!relatedMatch) continue;

    const existingArrayContent = relatedMatch[1];
    const newItems: string[] = [];
    for (const source of sourcesToAdd) {
      if (!existingArrayContent.includes(`"${source}"`)) {
        newItems.push(`    "${source}",\n`);
      }
    }

    if (newItems.length === 0) continue;

    const updatedArrayContent =
      existingArrayContent.trimEnd() + "\n" + newItems.join("") + "  ";
    content = content.replace(
      /relatedAnswers:\s*\[[\s\S]*?\]/,
      `relatedAnswers: [${updatedArrayContent}]`,
    );

    fs.writeFileSync(filePath, content, "utf-8");
    fixed += newItems.length;
    modifiedFiles.add(filePath);
  }

  return { fixed, modifiedFiles: Array.from(modifiedFiles) };
}

export function runCli(): void {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix");
  const isStrict = args.includes("--strict");

  console.log("🕸️  Auditing Answer Knowledge Mesh...");
  const result = analyzeAnswerMesh();

  console.log(
    `Analyzed ${result.totalAnswers} answers (${result.totalLinks} outbound cross-links).`,
  );
  console.log(`✓ ${result.reciprocalCount} reciprocal link pairs verified.`);

  let hasErrors = false;

  if (result.brokenLinks.length > 0) {
    hasErrors = true;
    console.error(`\n✖ ${result.brokenLinks.length} Broken Link(s):`);
    for (const item of result.brokenLinks) {
      console.error(`  - ${item.message}`);
    }
  }

  if (result.aliasConflicts.length > 0) {
    console.warn(`\n⚠ ${result.aliasConflicts.length} Alias Conflict(s):`);
    for (const item of result.aliasConflicts) {
      console.warn(`  - ${item.message}`);
    }
    if (isStrict) hasErrors = true;
  }

  if (result.clusterOrphans.length > 0) {
    console.warn(
      `\n⚠ ${result.clusterOrphans.length} Cluster Isolation Warning(s):`,
    );
    for (const item of result.clusterOrphans) {
      console.warn(`  - ${item.message}`);
    }
    if (isStrict) hasErrors = true;
  }

  if (result.missingReciprocal.length > 0) {
    console.log(
      `\nℹ ${result.missingReciprocal.length} One-Way Link(s) (Not Reciprocal):`,
    );
    for (const item of result.missingReciprocal) {
      console.log(`  - ${item.message}`);
    }

    if (shouldFix) {
      console.log("\n🔧 Applying automatic reciprocal link fixes...");
      const fixResult = fixMissingReciprocalLinks(result.missingReciprocal);
      console.log(
        `✓ Added ${fixResult.fixed} reciprocal link(s) across ${fixResult.modifiedFiles.length} file(s).`,
      );
    } else {
      console.log(
        "\nTip: Run `bun run check:answer-mesh --fix` to automatically reciprocate links in the corresponding answer files.",
      );
    }

    if (isStrict) hasErrors = true;
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log("\n✨ Answer mesh health check complete!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
