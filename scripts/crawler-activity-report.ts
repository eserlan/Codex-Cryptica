#!/usr/bin/env bun
/**
 * AI Crawler & Fetcher Observability Reporting Script (#2864).
 *
 * Answers:
 * - Has each provider accessed Codex during the selected period?
 * - Which pages and content clusters were requested?
 * - Was the access an automatic crawler or a user-triggered fetch?
 * - Did the provider receive 2xx, redirect, 4xx, 5xx, or WAF-blocked responses?
 * - Are verified requests being challenged or blocked?
 * - Which cluster pages have never been fetched by a recognised provider?
 *
 * Usage:
 *   bun scripts/crawler-activity-report.ts                      # Query Cloudflare API or mock sample
 *   bun scripts/crawler-activity-report.ts --file ./events.json # Read local event log
 *   bun scripts/crawler-activity-report.ts --json               # Output JSON format
 *   bun scripts/crawler-activity-report.ts --cluster heist      # Filter by cluster
 */

import { readFileSync, existsSync } from "node:fs";
import {
  aggregateCrawlerEvents,
  findUnfetchedClusterRoutes,
  formatActivitySummaryTable,
  formatCoverageGapReport,
  type AiCrawlerEvent,
  type CrawlerActivityAggregate,
} from "../apps/web/src/lib/seo/crawler-observability";

interface ReportOptions {
  filePath?: string;
  jsonOutput: boolean;
  days: number;
  clusterFilter?: string;
  providerFilter?: string;
}

function parseArgs(): ReportOptions {
  const args = process.argv.slice(2);
  const options: ReportOptions = {
    jsonOutput: false,
    days: 7,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      options.jsonOutput = true;
    } else if (arg === "--file" && i + 1 < args.length) {
      options.filePath = args[++i];
    } else if (arg === "--days" && i + 1 < args.length) {
      options.days = parseInt(args[++i], 10) || 7;
    } else if (arg === "--cluster" && i + 1 < args.length) {
      options.clusterFilter = args[++i].toLowerCase();
    } else if (arg === "--provider" && i + 1 < args.length) {
      options.providerFilter = args[++i].toLowerCase();
    }
  }

  return options;
}

/**
 * Query Cloudflare Workers Analytics Engine SQL API if credentials are configured.
 */
async function queryAnalyticsEngine(
  accountId: string,
  apiToken: string,
  days: number,
): Promise<AiCrawlerEvent[]> {
  const query = `
    SELECT
      timestamp,
      blob1 AS provider,
      blob2 AS agentType,
      blob3 AS primaryContentCluster,
      blob4 AS path,
      blob5 AS cacheStatus,
      blob6 AS country,
      blob7 AS agent,
      blob8 AS verificationMethod,
      double1 AS responseStatus,
      double2 AS verified
    FROM ai_crawler_activity
    WHERE timestamp >= NOW() - INTERVAL '${days}' DAY
    ORDER BY timestamp DESC
    LIMIT 10000
    FORMAT JSON
  `;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!res.ok) {
    throw new Error(
      `Cloudflare Analytics Engine API returned HTTP ${res.status}`,
    );
  }

  // The SQL API is ClickHouse-compatible and returns newline-delimited JSON
  // rows unless the query explicitly requests `FORMAT JSON`, which wraps the
  // rows in a single `{ data: [...] }` object that `res.json()` can parse.
  const result = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
  };

  return (result.data || []).map((row) => ({
    timestamp: String(row.timestamp || new Date().toISOString()),
    provider: (row.provider as any) || "other",
    agent: String(row.agent || "unknown"),
    agentType: (row.agentType as any) || "unknown",
    verified: Number(row.verified) === 1,
    verificationMethod: (row.verificationMethod as any) || "unverified",
    path: String(row.path || "/"),
    responseStatus: Number(row.responseStatus) || 200,
    cacheStatus: String(row.cacheStatus || "UNKNOWN"),
    primaryContentCluster:
      row.primaryContentCluster === "none"
        ? null
        : (row.primaryContentCluster as string),
    contentClusters:
      row.primaryContentCluster === "none" || !row.primaryContentCluster
        ? []
        : [String(row.primaryContentCluster)],
    country: row.country === "XX" ? null : (row.country as string),
  }));
}

export async function runReport(): Promise<void> {
  const options = parseArgs();
  let events: AiCrawlerEvent[] = [];

  if (options.filePath && existsSync(options.filePath)) {
    const raw = readFileSync(options.filePath, "utf-8").trim();
    if (raw.startsWith("[")) {
      events = JSON.parse(raw) as AiCrawlerEvent[];
    } else {
      // JSON Lines format
      events = raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AiCrawlerEvent);
    }
  } else {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (accountId && apiToken) {
      try {
        console.log("Querying Cloudflare Analytics Engine...");
        events = await queryAnalyticsEngine(accountId, apiToken, options.days);
      } catch (err) {
        console.warn("Could not query Cloudflare Analytics Engine API:", err);
      }
    }
  }

  // Filter if requested
  if (options.clusterFilter) {
    events = events.filter(
      (e) =>
        e.primaryContentCluster?.toLowerCase() === options.clusterFilter ||
        e.contentClusters
          .map((c) => c.toLowerCase())
          .includes(options.clusterFilter!),
    );
  }

  if (options.providerFilter) {
    events = events.filter(
      (e) => e.provider.toLowerCase() === options.providerFilter,
    );
  }

  const aggregates: CrawlerActivityAggregate[] = aggregateCrawlerEvents(events);
  const unfetchedGaps = findUnfetchedClusterRoutes(
    events,
    options.clusterFilter ? [options.clusterFilter] : undefined,
  );

  if (options.jsonOutput) {
    console.log(
      JSON.stringify(
        {
          aggregates,
          unfetchedGaps: Object.fromEntries(unfetchedGaps),
          totalRequests: events.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("\n## AI Crawler & Fetcher Activity Summary\n");
  console.log(formatActivitySummaryTable(aggregates));
  console.log("\n");
  console.log(formatCoverageGapReport(unfetchedGaps));
  console.log("");
}

if (import.meta.main) {
  runReport().catch((err) => {
    console.error("Report execution failed:", err);
    process.exit(1);
  });
}
