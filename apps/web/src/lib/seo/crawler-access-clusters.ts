/**
 * Content cluster crawler readiness verification (#2861).
 *
 * Implements dynamic route discovery from the discovery registry,
 * single H1 and JSON-LD structured data assertions, strict cluster
 * route evaluation, cluster contextual link topology verification,
 * and reporting utilities.
 *
 * Extracted from crawler-access.ts to honor Constitution Principle XIV
 * (Bounded Responsibility).
 */
import {
  getDiscoveryEntries,
  getEntryClusters,
} from "../content/discovery/registry";
import type { DiscoveryEntry } from "../content/discovery/schema";
import {
  evaluateCrawlResponse,
  extractSitemapPaths,
  extractTag,
  isPathAllowed,
  readHeader,
  type CrawlFinding,
  type CrawlResponse,
  type RobotsTxt,
} from "./crawler-access";

/**
 * Clusters covered by crawler readiness verification (#2861).
 */
export const CLUSTER_TARGETS = [
  "heist",
  "rumour",
  "religion",
  "puzzle",
] as const;
export type ClusterTarget = (typeof CLUSTER_TARGETS)[number];

/**
 * Explicit boundary statement for crawler access and cluster readiness (#2861).
 * Passing crawler readiness verifies technical reachability and indexability prerequisites;
 * it does NOT guarantee actual search-engine crawling, indexing, ranking, citations, or referral traffic.
 */
export const CRAWLER_READINESS_DISCLAIMER =
  "Passing crawler readiness verifies that discovery routes are reachable, allowed by robots.txt, structurally complete, indexable, and linked. It does NOT guarantee actual search-engine crawling, indexing, ranking, citations, or referral traffic.";

export interface ClusterRouteTarget {
  path: string;
  clusters: string[];
  entry?: DiscoveryEntry;
}

/**
 * Discover cluster routes dynamically from the discovery registry (#2861).
 * Multi-cluster entities are deduplicated by route path while retaining all matched clusters.
 */
export function discoverClusterTargetRoutes(
  targetClusters: readonly string[] = CLUSTER_TARGETS,
  registry: DiscoveryEntry[] = getDiscoveryEntries(),
): Map<string, ClusterRouteTarget> {
  const normalizedTargets = targetClusters.map((c) => c.toLowerCase().trim());
  const routeMap = new Map<string, ClusterRouteTarget>();

  for (const entry of registry) {
    if (!entry.indexable || entry.status !== "live") continue;
    const entryClusters = getEntryClusters(entry).map((c) =>
      c.toLowerCase().trim(),
    );
    const matchedClusters = entryClusters.filter((c) =>
      normalizedTargets.includes(c),
    );
    if (matchedClusters.length === 0) continue;

    const existing = routeMap.get(entry.canonicalPath);
    if (existing) {
      for (const c of matchedClusters) {
        if (!existing.clusters.includes(c)) existing.clusters.push(c);
      }
    } else {
      routeMap.set(entry.canonicalPath, {
        path: entry.canonicalPath,
        clusters: [...matchedClusters],
        entry,
      });
    }
  }

  return routeMap;
}

/**
 * Verify that crawler-visible HTML contains exactly one meaningful <h1> heading (#2861).
 * Catches 0 headings, multiple headings, and whitespace-only headings.
 */
export function validateSingleH1(body: string): CrawlFinding[] {
  const matches = [...body.matchAll(/<h1(?:\s+[^>]*)?>([\s\S]*?)<\/h1>/gi)];
  if (matches.length === 0) {
    return [
      {
        code: "h1-missing",
        severity: "error",
        message: "no <h1> found in crawler-visible HTML",
      },
    ];
  }
  if (matches.length > 1) {
    return [
      {
        code: "h1-multiple",
        severity: "error",
        message: `found ${matches.length} <h1> headings, expected exactly 1`,
      },
    ];
  }
  const text = matches[0][1].replace(/<[^>]+>/g, "").trim();
  if (!text) {
    return [
      {
        code: "h1-empty",
        severity: "error",
        message: "<h1> heading is empty",
      },
    ];
  }
  return [];
}

/**
 * Validate JSON-LD structured data in crawler-visible HTML (#2861).
 * Verifies presence, JSON parse validity, schema.org @context, and @type or typed @graph.
 */
export function validateStructuredData(body: string): CrawlFinding[] {
  const findings: CrawlFinding[] = [];
  const scripts = [
    ...body.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  if (scripts.length === 0) {
    return [
      {
        code: "structured-data-missing",
        severity: "error",
        message: 'no <script type="application/ld+json"> structured data found',
      },
    ];
  }

  for (const script of scripts) {
    const content = script[1].trim();
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      findings.push({
        code: "structured-data-invalid-json",
        severity: "error",
        message: `failed to parse structured data JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (typeof node !== "object" || node === null) {
        findings.push({
          code: "structured-data-invalid-shape",
          severity: "error",
          message: "structured data node must be a JSON object",
        });
        continue;
      }

      const context = node["@context"];
      const hasValidContext =
        typeof context === "string" && /schema\.org/i.test(context);
      if (!hasValidContext) {
        findings.push({
          code: "structured-data-invalid-context",
          severity: "error",
          message: `structured data missing or invalid @context: ${context}`,
        });
      }

      const hasType = Boolean(node["@type"]);
      const hasGraph =
        Array.isArray(node["@graph"]) &&
        node["@graph"].length > 0 &&
        node["@graph"].some(
          (item: any) =>
            typeof item === "object" && item !== null && Boolean(item["@type"]),
        );

      if (!hasType && !hasGraph) {
        findings.push({
          code: "structured-data-missing-type",
          severity: "error",
          message: "structured data missing @type or valid @graph with @type",
        });
      }
    }
  }

  return findings;
}

export interface ClusterEvaluationContext {
  robots?: RobotsTxt;
  crawlerToken?: string;
  sitemapXml?: string;
  llmsTxt?: string;
  llmsFullTxt?: string;
}

/**
 * Strict evaluation of a cluster route's crawler readiness (#2861).
 * Asserts HTTP 200, robots permission, valid <title>, single <h1>, meta description,
 * self-referencing canonical URL, noindex/nofollow absence, structured data,
 * sitemap presence, and llms.txt/llms-full.txt presence per content type policy.
 */
export function evaluateClusterRouteResponse(
  response: CrawlResponse,
  routeTarget: ClusterRouteTarget,
  context?: ClusterEvaluationContext,
): CrawlFinding[] {
  const findings: CrawlFinding[] = [];

  const baseFindings = evaluateCrawlResponse(response, {
    kind: "html",
    indexability: "indexable",
  });

  for (const finding of baseFindings) {
    if (finding.code === "no-heading") continue;

    if (
      finding.code === "canonical-missing" ||
      finding.code === "canonical-mismatch" ||
      finding.code === "description-missing"
    ) {
      findings.push({ ...finding, severity: "error" });
    } else {
      findings.push(finding);
    }
  }

  findings.push(...validateSingleH1(response.body));
  findings.push(...validateStructuredData(response.body));

  // Check for accidental nofollow directives in headers and meta tags
  const xRobots = readHeader(response.headers, "x-robots-tag");
  if (xRobots && /nofollow/i.test(xRobots)) {
    findings.push({
      code: "nofollow",
      severity: "error",
      message: `X-Robots-Tag header carries nofollow: ${xRobots}`,
    });
  }

  const robotsMeta = extractTag(
    response.body,
    /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i,
  );
  if (robotsMeta && /nofollow/i.test(robotsMeta)) {
    findings.push({
      code: "nofollow",
      severity: "error",
      message: `<meta name="robots"> carries nofollow: ${robotsMeta}`,
    });
  }

  if (context?.robots && context?.crawlerToken) {
    if (
      !isPathAllowed(context.robots, context.crawlerToken, routeTarget.path)
    ) {
      findings.push({
        code: "robots-disallow",
        severity: "error",
        message: `route ${routeTarget.path} is disallowed by robots.txt for crawler ${context.crawlerToken}`,
      });
    }
  }

  if (context?.sitemapXml) {
    const declaredPaths = extractSitemapPaths(context.sitemapXml);
    const normalizedTarget = routeTarget.path.replace(/\/+$/, "") || "/";
    const inSitemap = declaredPaths.some(
      (p) => (p.replace(/\/+$/, "") || "/") === normalizedTarget,
    );
    if (!inSitemap) {
      findings.push({
        code: "cluster-sitemap-missing",
        severity: "error",
        message: `cluster route ${routeTarget.path} is missing from sitemap.xml`,
      });
    }
  }

  if (context?.llmsFullTxt) {
    const isAnswerOrExample =
      routeTarget.path.startsWith("/answers/") ||
      routeTarget.path.startsWith("/examples/");
    if (isAnswerOrExample && !context.llmsFullTxt.includes(routeTarget.path)) {
      findings.push({
        code: "cluster-llms-full-missing",
        severity: "error",
        message: `cluster route ${routeTarget.path} is missing from llms-full.txt`,
      });
    }
  }

  return findings;
}

/**
 * Extract outgoing cluster links from rendered HTML resolved against the current route URL.
 */
export function extractOutgoingClusterLinks(
  html: string,
  knownRoutes: string[],
  origin: string,
  currentRoute: string,
): string[] {
  const hrefMatches = [
    ...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi),
  ];
  const matched = new Set<string>();
  const normalizedCurrent = currentRoute.replace(/\/+$/, "") || "/";
  const knownSet = new Set(
    knownRoutes.map((r) => r.replace(/\/+$/, "") || "/"),
  );

  for (const match of hrefMatches) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:")) {
      continue;
    }
    try {
      const resolvedUrl = new URL(rawHref, `${origin}${normalizedCurrent}`);
      const pathname = resolvedUrl.pathname.replace(/\/+$/, "") || "/";
      if (knownSet.has(pathname)) {
        matched.add(pathname);
      }
    } catch {
      // ignore invalid URLs
    }
  }
  return [...matched];
}

export interface ClusterLinkFinding {
  route: string;
  findings: CrawlFinding[];
}

/**
 * Verify cluster contextual links from rendered HTML (#2861):
 * - answer → generator/workflow
 * - answer → example
 * - example → answer
 * - example → generator
 * - generator → answer/example
 */
export function evaluateClusterLinks(
  cluster: string,
  clusterRoutes: string[],
  htmlByRoute: Map<string, string>,
  origin = "https://codexcryptica.com",
): ClusterLinkFinding[] {
  const results: ClusterLinkFinding[] = [];

  const answers = clusterRoutes.filter((r) => r.startsWith("/answers/"));
  const examples = clusterRoutes.filter((r) => r.startsWith("/examples/"));
  const generators = clusterRoutes.filter((r) => r.startsWith("/generators/"));

  for (const route of clusterRoutes) {
    const html = htmlByRoute.get(route);
    if (!html) continue;

    const findings: CrawlFinding[] = [];
    const outgoing = extractOutgoingClusterLinks(
      html,
      clusterRoutes,
      origin,
      route,
    );

    if (route.startsWith("/answers/")) {
      if (generators.length > 0) {
        const hasGeneratorLink = outgoing.some((l) => generators.includes(l));
        if (!hasGeneratorLink) {
          findings.push({
            code: "cluster-answer-missing-generator-link",
            severity: "warning",
            message: `answer ${route} does not link to a generator in cluster "${cluster}"`,
          });
        }
      }

      if (examples.length > 0) {
        const hasDirectExampleLink = outgoing.some((l) => examples.includes(l));
        if (!hasDirectExampleLink) {
          findings.push({
            code: "cluster-direct-link-pending",
            severity: "warning",
            message: `answer ${route} has no direct link to a cluster example in "${cluster}" (pending deployment of cluster CTAs)`,
          });
        }
      }
    } else if (route.startsWith("/examples/")) {
      if (answers.length > 0) {
        const hasAnswerLink = outgoing.some((l) => answers.includes(l));
        if (!hasAnswerLink) {
          findings.push({
            code: "cluster-example-missing-answer-link",
            severity: "error",
            message: `example ${route} does not link to any answer in cluster "${cluster}"`,
          });
        }
      }

      if (generators.length > 0) {
        const hasGeneratorLink = outgoing.some((l) => generators.includes(l));
        if (!hasGeneratorLink) {
          findings.push({
            code: "cluster-example-missing-generator-link",
            severity: "error",
            message: `example ${route} does not link to generator in cluster "${cluster}"`,
          });
        }
      }
    } else if (route.startsWith("/generators/")) {
      if (answers.length > 0) {
        const hasAnswerLink = outgoing.some((l) => answers.includes(l));
        if (!hasAnswerLink) {
          findings.push({
            code: "cluster-generator-missing-answer-link",
            severity: "error",
            message: `generator ${route} does not link to any answer in cluster "${cluster}"`,
          });
        }
      }
      if (examples.length > 0) {
        const hasExampleLink = outgoing.some((l) => examples.includes(l));
        if (!hasExampleLink) {
          findings.push({
            code: "cluster-generator-missing-example-link",
            severity: "error",
            message: `generator ${route} does not link to any example in cluster "${cluster}"`,
          });
        }
      }
    }

    if (findings.length > 0) {
      results.push({ route, findings });
    }
  }

  return results;
}

export interface ClusterCheckSummary {
  crawler: string;
  cluster: string;
  routes: number;
  errors: number;
  warnings: number;
}

/**
 * Format markdown summary table grouped by Crawler and Cluster (#2861):
 * | Crawler | Cluster | Routes | Errors | Warnings |
 */
export function formatClusterSummaryTable(
  summaries: ClusterCheckSummary[],
): string {
  const lines: string[] = [
    "| Crawler | Cluster | Routes | Errors | Warnings |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const s of summaries) {
    lines.push(
      `| ${s.crawler} | ${s.cluster} | ${s.routes} | ${s.errors} | ${s.warnings} |`,
    );
  }
  return lines.join("\n");
}

export interface ClusterFailureDetail {
  crawler: string;
  clusters: string[];
  route: string;
  assertion: string;
  observed: string;
}

/**
 * Format human-readable failure message naming crawler, cluster(s), route,
 * failed assertion, and observed value (#2861).
 */
export function formatClusterFailureDetail(
  detail: ClusterFailureDetail,
): string {
  return `[${detail.crawler}] [${detail.clusters.join(", ")}] ${detail.route}: failed assertion "${detail.assertion}" — observed: ${detail.observed}`;
}
