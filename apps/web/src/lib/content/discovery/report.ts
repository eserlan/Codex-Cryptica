import type { DiscoveryEntry, DiscoveryUserJob } from "./schema";
import { entries as allEntries } from "./entries";

/**
 * Portfolio view over the discovery registry.
 *
 * The audit is a linter: it answers "what is wrong?" This answers "what is
 * missing?", which is the question worth asking when deciding what to build
 * next. Nothing here fails a build — it is a planning aid, and the issue that
 * introduced the registry (#2566) was explicit that reports must not become a
 * gate.
 *
 * Everything is derived from data the registry already holds. There is no
 * second source to keep in step, and no keyword list anywhere near it.
 */

/** Job columns, in the order a reader moves through them. */
export const JOB_ORDER: DiscoveryUserJob[] = [
  "understand",
  "create",
  "see-an-example",
  "adopt-workflow",
  "evaluate",
  "migrate",
  "reference",
  "navigate",
];

/** Only live, indexable pages count towards coverage. */
export function coverableEntries(
  entries: DiscoveryEntry[] = allEntries,
): DiscoveryEntry[] {
  return entries.filter(
    (entry) =>
      entry.indexable && entry.status === "live" && entry.parentCluster,
  );
}

export interface ClusterCoverage {
  cluster: string;
  /** Canonical paths, by the job they serve. */
  byJob: Map<DiscoveryUserJob, string[]>;
  total: number;
}

/** One row per cluster, jobs across. */
export function clusterCoverage(
  entries: DiscoveryEntry[] = allEntries,
): ClusterCoverage[] {
  const clusters = new Map<string, ClusterCoverage>();
  for (const entry of coverableEntries(entries)) {
    const cluster = entry.parentCluster as string;
    const row =
      clusters.get(cluster) ??
      ({ cluster, byJob: new Map(), total: 0 } satisfies ClusterCoverage);
    row.byJob.set(entry.userJob, [
      ...(row.byJob.get(entry.userJob) ?? []),
      entry.canonicalPath,
    ]);
    row.total += 1;
    clusters.set(cluster, row);
  }
  return [...clusters.values()].sort((a, b) =>
    a.cluster.localeCompare(b.cluster),
  );
}

export interface CoverageGap {
  cluster: string;
  /** The job that exists in this cluster. */
  has: DiscoveryUserJob;
  /** The job that does not. */
  missing: DiscoveryUserJob;
  /** How many pages already serve `has` — a rough sense of how well-trodden it is. */
  weight: number;
  message: string;
}

/**
 * Pairs of jobs that usually want each other.
 *
 * A subject with a generator and no explanation leaves the reader who is not
 * ready to generate anything with nowhere to land; a subject explained but not
 * generable leaves the opposite gap. Neither is automatically a mistake, which
 * is why this reports rather than enforces.
 */
const COMPLEMENTS: Array<[DiscoveryUserJob, DiscoveryUserJob, string]> = [
  [
    "create",
    "understand",
    "has a generator but nothing explaining the concept behind it",
  ],
  [
    "understand",
    "create",
    "explains the concept but offers no tool to act on it",
  ],
];

export function coverageGaps(
  entries: DiscoveryEntry[] = allEntries,
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  for (const row of clusterCoverage(entries)) {
    for (const [has, missing, phrasing] of COMPLEMENTS) {
      const present = row.byJob.get(has);
      if (present && !row.byJob.get(missing)) {
        gaps.push({
          cluster: row.cluster,
          has,
          missing,
          weight: present.length,
          message: `${row.cluster} ${phrasing} (${present.length} × ${has})`,
        });
      }
    }
  }
  // Heaviest first: a cluster with four generators and no answer is a stronger
  // candidate than one with a single generator.
  return gaps.sort(
    (a, b) => b.weight - a.weight || a.cluster.localeCompare(b.cluster),
  );
}

/** Clusters serving none of the given job at all. */
export function clustersMissingJob(
  job: DiscoveryUserJob,
  entries: DiscoveryEntry[] = allEntries,
): string[] {
  return clusterCoverage(entries)
    .filter((row) => !row.byJob.has(job))
    .map((row) => row.cluster);
}

/** Entry counts per page family. */
export function familyCounts(
  entries: DiscoveryEntry[] = allEntries,
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.pageKind, (counts.get(entry.pageKind) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** How many phrasings the registry absorbs without minting URLs. */
export function aliasLoad(entries: DiscoveryEntry[] = allEntries): {
  aliases: number;
  pages: number;
  ratio: number;
} {
  const aliases = entries.reduce(
    (total, entry) => total + entry.intentAliases.length,
    0,
  );
  const pages = entries.length;
  return { aliases, pages, ratio: pages === 0 ? 0 : aliases / pages };
}

/** Everything the CLI renders, in one shape so it can also be emitted as JSON. */
export function buildReport(entries: DiscoveryEntry[] = allEntries) {
  return {
    totals: {
      entries: entries.length,
      indexable: entries.filter((entry) => entry.indexable).length,
      clustered: coverableEntries(entries).length,
      clusters: clusterCoverage(entries).length,
      ...aliasLoad(entries),
    },
    families: familyCounts(entries),
    clusters: clusterCoverage(entries).map((row) => ({
      cluster: row.cluster,
      total: row.total,
      jobs: Object.fromEntries(
        [...row.byJob].map(([job, paths]) => [job, paths]),
      ),
    })),
    gaps: coverageGaps(entries),
    missingExamples: clustersMissingJob("see-an-example", entries),
  };
}
