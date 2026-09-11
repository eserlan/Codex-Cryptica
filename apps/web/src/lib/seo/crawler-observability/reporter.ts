/**
 * Crawler Activity Reporting & Gap Analysis Engine (#2864).
 *
 * Provides aggregation, markdown table rendering, and coverage gap detection
 * comparing actual provider visits against canonical cluster routes.
 */

import { discoverClusterTargetRoutes } from "../crawler-access-clusters";
import type { AiCrawlerEvent } from "./event-model";

export interface CrawlerActivityAggregate {
  date: string; // YYYY-MM-DD
  provider: string;
  agentType: string;
  cluster: string;
  requests: number;
  uniquePaths: number;
  status2xx: number;
  blockedOrErrors: number;
  verifiedCount: number;
  unverifiedCount: number;
  paths: Set<string>;
}

/**
 * Aggregate an array of AiCrawlerEvent records into daily provider/cluster summaries.
 */
export function aggregateCrawlerEvents(
  events: readonly AiCrawlerEvent[],
): CrawlerActivityAggregate[] {
  const map = new Map<string, CrawlerActivityAggregate>();

  for (const event of events) {
    const date = event.timestamp.slice(0, 10);
    const cluster = event.primaryContentCluster || "unclustered";
    const key = `${date}::${event.provider}::${event.agentType}::${cluster}`;

    let agg = map.get(key);
    if (!agg) {
      agg = {
        date,
        provider: event.provider,
        agentType: event.agentType,
        cluster,
        requests: 0,
        uniquePaths: 0,
        status2xx: 0,
        blockedOrErrors: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        paths: new Set<string>(),
      };
      map.set(key, agg);
    }

    agg.requests += 1;
    agg.paths.add(event.path);

    if (event.verified) {
      agg.verifiedCount += 1;
    } else {
      agg.unverifiedCount += 1;
    }

    if (event.responseStatus >= 200 && event.responseStatus < 300) {
      agg.status2xx += 1;
    } else if (
      event.responseStatus === 403 ||
      event.responseStatus === 429 ||
      event.responseStatus >= 500
    ) {
      agg.blockedOrErrors += 1;
    }
  }

  const results: CrawlerActivityAggregate[] = [];
  for (const agg of map.values()) {
    agg.uniquePaths = agg.paths.size;
    results.push(agg);
  }

  // Sort by date desc, provider asc, cluster asc
  results.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.cluster.localeCompare(b.cluster);
  });

  return results;
}

/**
 * Render Markdown summary table matching Issue #2864 specification:
 * | Date | Provider | Agent type | Cluster | Requests | Unique paths | 2xx | Blocked/errors |
 */
export function formatActivitySummaryTable(
  aggregates: readonly CrawlerActivityAggregate[],
): string {
  if (aggregates.length === 0) {
    return "No crawler activity recorded for the selected period.";
  }

  const lines: string[] = [
    "| Date | Provider | Agent type | Cluster | Requests | Unique paths | 2xx | Blocked/errors |",
    "| --- | --- | --- | --- | ---:| ---:| ---:| ---:|",
  ];

  for (const a of aggregates) {
    lines.push(
      `| ${a.date} | ${a.provider} | ${a.agentType} | ${a.cluster} | ${a.requests} | ${a.uniquePaths} | ${a.status2xx} | ${a.blockedOrErrors} |`,
    );
  }

  return lines.join("\n");
}

/**
 * Identify canonical cluster routes that have never been fetched by any recognised provider.
 *
 * Compares observed routes against the discovery registry's canonical cluster routes.
 */
export function findUnfetchedClusterRoutes(
  events: readonly AiCrawlerEvent[],
  targetClusters?: readonly string[],
): Map<string, string[]> {
  const routeTargets = discoverClusterTargetRoutes(targetClusters);
  const fetchedPaths = new Set(
    events
      .filter((e) => e.verified)
      .map((e) => e.path.toLowerCase().replace(/\/+$/, "") || "/"),
  );

  const unfetchedByCluster = new Map<string, string[]>();

  for (const target of routeTargets.values()) {
    const normTarget = target.path.toLowerCase().replace(/\/+$/, "") || "/";
    if (fetchedPaths.has(normTarget)) continue;

    for (const cluster of target.clusters) {
      const existing = unfetchedByCluster.get(cluster) || [];
      if (!existing.includes(target.path)) {
        existing.push(target.path);
        unfetchedByCluster.set(cluster, existing);
      }
    }
  }

  return unfetchedByCluster;
}

/**
 * Format coverage gap report in markdown.
 */
export function formatCoverageGapReport(
  unfetchedByCluster: Map<string, string[]>,
): string {
  if (unfetchedByCluster.size === 0) {
    return "✓ All canonical cluster routes have been fetched by at least one verified provider.";
  }

  const lines: string[] = [
    "### Unfetched Cluster Routes by Verified Providers\n",
  ];
  for (const [cluster, routes] of unfetchedByCluster.entries()) {
    lines.push(`**Cluster \`${cluster}\` (${routes.length} unfetched):**`);
    for (const r of routes) {
      lines.push(`- \`${r}\``);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
