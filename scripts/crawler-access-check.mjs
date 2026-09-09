/**
 * Search-crawler production access smoke check (#2567, #2844).
 *
 * `robots.txt` saying `Allow` does not prove a crawler can actually reach the
 * page: Cloudflare bot management, a WAF rule, a rate limit or a stray
 * `noindex` can all break discovery without changing a single robots line.
 * This script walks the live site as one selected discovery crawler and fails
 * when any of that happens, so a security or header change that breaks a
 * crawler is caught.
 *
 * It only ever touches intentionally public discovery routes taken from the
 * production sitemap — private/app/vault routes are out of scope and stay
 * protected.
 *
 * Usage:
 *   bun scripts/crawler-access-check.mjs                  check production
 *   bun scripts/crawler-access-check.mjs --report         report only, exit 0
 *   bun scripts/crawler-access-check.mjs --base=https://… check a preview
 *   bun scripts/crawler-access-check.mjs --crawler=googlebot
 */
import fs from "node:fs";
import {
  CLUSTER_TARGETS,
  CRAWLER_READINESS_DISCLAIMER,
  discoverClusterTargetRoutes,
  downgradeKnownGaps,
  errorsOnly,
  evaluateClusterLinks,
  evaluateClusterRouteResponse,
  evaluateCrawlResponse,
  expectationFor,
  findSearchCrawler,
  findDisallowedSitemapPaths,
  formatClusterFailureDetail,
  formatClusterSummaryTable,
  isPathAllowed,
  parseRobotsTxt,
  pickRepresentativeRoutes,
  PRIVATE_ROUTE_SAMPLES,
  SEARCH_CRAWLERS,
  warningsOnly,
} from "../apps/web/src/lib/seo/crawler-access.ts";

const DEFAULT_BASE = "https://codexcryptica.com";
const REQUEST_TIMEOUT_MS = 20_000;

/** Text routes that must stay reachable regardless of what the sitemap lists. */
const REQUIRED_TEXT_ROUTES = ["/llms.txt", "/llms-full.txt", "/sitemap.xml"];

/**
 * Discovery families the issue calls out. A family that is absent from the
 * sitemap is a warning, not an error — some families ship later.
 */
const EXPECTED_FAMILIES = [
  "/for",
  "/generators",
  "/solutions",
  "/vs",
  "/blog",
  "/answers",
  "/examples",
];

/** Sample this many URLs per family — the index page plus one deep page. */
const SAMPLES_PER_FAMILY = 2;

/**
 * Gaps we have already looked at and decided not to fix under this issue. They
 * still print on every run; they just do not fail the check. Remove an entry
 * the moment the underlying gap is fixed.
 */
const KNOWN_GAPS = [
  {
    path: "/",
    code: "no-title",
    reason:
      "the site root is the client-rendered app shell (ssr=false); marketing copy lives on the prerendered /worldbuilding-tool, /ai-rpg-campaign-manager and /free-rpg-campaign-manager pages instead. See docs/seo/crawler-access.md.",
  },
  {
    path: "/",
    code: "no-heading",
    reason: "same client-rendered app shell as above",
  },
];

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const asJson = args.includes("--json");
const baseArg = args.find((arg) => arg.startsWith("--base="));
const crawlerArg = args.find((arg) => arg.startsWith("--crawler="));
const crawlerId = crawlerArg
  ? crawlerArg.slice("--crawler=".length)
  : "oai-searchbot";
const crawler = findSearchCrawler(crawlerId);
if (!crawler) {
  console.error(
    `Unknown crawler "${crawlerId}". Supported crawlers: ${SEARCH_CRAWLERS.map((candidate) => candidate.id).join(", ")}`,
  );
  process.exit(2);
}
const base = (baseArg ? baseArg.slice("--base=".length) : DEFAULT_BASE).replace(
  /\/+$/,
  "",
);

const results = [];
const crawledResponses = new Map();

const record = (path, findings) => {
  results.push({ path, findings });
  return findings;
};

async function crawl(path, userAgent = crawler.userAgent) {
  const requestedUrl = `${base}${path}`;
  const response = await fetch(requestedUrl, {
    headers: { "user-agent": userAgent, accept: "*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.text();
  const crawlResult = {
    requestedUrl,
    finalUrl: response.url || requestedUrl,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
  if (userAgent === crawler.userAgent) {
    crawledResponses.set(path, crawlResult);
  }
  return crawlResult;
}

async function checkRoute(path, expectation = expectationFor(path)) {
  try {
    const response = crawledResponses.get(path) ?? (await crawl(path));
    return record(
      path,
      downgradeKnownGaps(
        path,
        evaluateCrawlResponse(response, expectation),
        KNOWN_GAPS,
      ),
    );
  } catch (error) {
    return record(path, [
      {
        code: "unreachable",
        severity: "error",
        message: `request failed: ${error instanceof Error ? error.message : error}`,
      },
    ]);
  }
}

async function checkRobots() {
  const findings = [];
  let response;
  try {
    response = await crawl("/robots.txt");
  } catch (error) {
    record("/robots.txt", [
      {
        code: "unreachable",
        severity: "error",
        message: `request failed: ${error instanceof Error ? error.message : error}`,
      },
    ]);
    return "";
  }

  findings.push(...evaluateCrawlResponse(response, { kind: "text" }));

  const robots = parseRobotsTxt(response.body);
  const named = robots.groups.some((group) =>
    group.agents.includes(crawler.robotsToken),
  );
  if (crawler.requiresExplicitRobotsGroup && !named) {
    findings.push({
      code: "robots-agent-missing",
      severity: "error",
      message: `robots.txt has no explicit ${crawler.name} group`,
    });
  }
  if (robots.sitemaps.length === 0) {
    findings.push({
      code: "robots-sitemap-missing",
      severity: "error",
      message: "robots.txt declares no Sitemap",
    });
  }

  record("/robots.txt", findings);
  return response.body;
}

/**
 * A route that answers a browser but not the crawler is the exact failure this
 * issue is about, and it is invisible in a crawler-only pass.
 */
async function checkUserAgentParity(path) {
  const browserUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
  try {
    const [asBot, asBrowser] = await Promise.all([
      crawl(path),
      crawl(path, browserUa),
    ]);
    if (asBot.status === asBrowser.status)
      return record(`${path} (parity)`, []);
    return record(`${path} (parity)`, [
      {
        code: "ua-parity",
        severity: "error",
        message: `${crawler.name} got ${asBot.status} where a browser got ${asBrowser.status}`,
      },
    ]);
  } catch (error) {
    return record(`${path} (parity)`, [
      {
        code: "unreachable",
        severity: "warning",
        message: `parity check failed: ${error instanceof Error ? error.message : error}`,
      },
    ]);
  }
}

const robotsText = await checkRobots();
const robots = parseRobotsTxt(robotsText);

let routes = [];
let sitemapBody = "";
try {
  const sitemap = await crawl("/sitemap.xml");
  sitemapBody = sitemap.body;
  routes = pickRepresentativeRoutes(sitemap.body, SAMPLES_PER_FAMILY);
} catch (error) {
  record("/sitemap.xml", [
    {
      code: "unreachable",
      severity: "error",
      message: `could not read the sitemap: ${error instanceof Error ? error.message : error}`,
    },
  ]);
}

const families = new Set(
  routes.map((path) => (path === "/" ? "/" : `/${path.split("/")[1]}`)),
);
for (const family of EXPECTED_FAMILIES) {
  if (!families.has(family)) {
    record(family, [
      {
        code: "family-missing",
        severity: "warning",
        message: `no ${family} URL in the sitemap to sample`,
      },
    ]);
  }
}

for (const path of REQUIRED_TEXT_ROUTES) {
  await checkRoute(path, { kind: "text", minBytes: 100 });
}

for (const path of routes) {
  if (REQUIRED_TEXT_ROUTES.includes(path)) continue;
  if (robotsText && !isPathAllowed(robots, crawler.robotsToken, path)) {
    record(path, [
      {
        code: "robots-disallow",
        severity: "error",
        message: `sitemap lists a path robots.txt disallows for ${crawler.name}`,
      },
    ]);
    continue;
  }
  await checkRoute(path);
}

for (const path of findDisallowedSitemapPaths(sitemapBody)) {
  record(`${path} (sitemap)`, [
    {
      code: "private-route-in-sitemap",
      severity: "error",
      message: "private/stateful route appears in the public sitemap",
    },
  ]);
}

for (const path of PRIVATE_ROUTE_SAMPLES) {
  await checkRoute(path, { kind: "private", indexability: "noindex" });
}

await checkUserAgentParity("/");

// Cluster readiness checks (#2861)
const clusterTargetMap = discoverClusterTargetRoutes();
const htmlByRoute = new Map();
const clusterRouteFindings = new Map();

const llmsTxtBody = crawledResponses.get("/llms.txt")?.body ?? "";
const llmsFullTxtBody = crawledResponses.get("/llms-full.txt")?.body ?? "";

for (const target of clusterTargetMap.values()) {
  let response = crawledResponses.get(target.path);
  if (!response) {
    try {
      response = await crawl(target.path);
    } catch (error) {
      const finding = {
        code: "unreachable",
        severity: "error",
        message: `request failed: ${error instanceof Error ? error.message : error}`,
      };
      clusterRouteFindings.set(target.path, [finding]);
      record(`${target.path} [cluster]`, [finding]);
      continue;
    }
  }
  htmlByRoute.set(target.path, response.body);
  const routeFindings = evaluateClusterRouteResponse(response, target, {
    robots,
    crawlerToken: crawler.robotsToken,
    sitemapXml: sitemapBody,
    llmsTxt: llmsTxtBody,
    llmsFullTxt: llmsFullTxtBody,
  });
  clusterRouteFindings.set(target.path, routeFindings);
  record(`${target.path} [cluster]`, routeFindings);
}

// Cluster contextual links verification
const clusterLinkFindingsByCluster = new Map();
for (const cluster of CLUSTER_TARGETS) {
  const routesForCluster = [...clusterTargetMap.values()]
    .filter((t) => t.clusters.includes(cluster))
    .map((t) => t.path);
  const linkResults = evaluateClusterLinks(
    cluster,
    routesForCluster,
    htmlByRoute,
    base,
  );
  clusterLinkFindingsByCluster.set(cluster, linkResults);
  for (const { route, findings } of linkResults) {
    record(`${route} [${cluster} links]`, findings);
  }
}

// Summarize by Crawler and Cluster
const clusterSummaries = [];
const clusterFailureDetails = [];

for (const cluster of CLUSTER_TARGETS) {
  const clusterTargets = [...clusterTargetMap.values()].filter((t) =>
    t.clusters.includes(cluster),
  );
  const clusterRoutes = clusterTargets.map((t) => t.path);

  let clusterErrors = 0;
  let clusterWarnings = 0;

  for (const target of clusterTargets) {
    const findings = clusterRouteFindings.get(target.path) ?? [];
    for (const f of findings) {
      if (f.severity === "error") {
        clusterErrors++;
        clusterFailureDetails.push({
          crawler: crawler.name,
          clusters: target.clusters,
          route: target.path,
          assertion: f.code,
          observed: f.message,
        });
      } else if (f.severity === "warning") {
        clusterWarnings++;
      }
    }
  }

  const linkResults = clusterLinkFindingsByCluster.get(cluster) ?? [];
  for (const { route, findings } of linkResults) {
    const target = clusterTargetMap.get(route);
    for (const f of findings) {
      if (f.severity === "error") {
        clusterErrors++;
        clusterFailureDetails.push({
          crawler: crawler.name,
          clusters: target ? target.clusters : [cluster],
          route,
          assertion: f.code,
          observed: f.message,
        });
      } else if (f.severity === "warning") {
        clusterWarnings++;
      }
    }
  }

  clusterSummaries.push({
    crawler: crawler.name,
    cluster,
    routes: clusterRoutes.length,
    errors: clusterErrors,
    warnings: clusterWarnings,
  });
}

const clusterSummaryTable = formatClusterSummaryTable(clusterSummaries);

if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Cluster Crawler Readiness: ${crawler.name}\n\n${clusterSummaryTable}\n\n> **Notice**: ${CRAWLER_READINESS_DISCLAIMER}\n`,
    );
  } catch (err) {
    console.warn(`Failed writing to GITHUB_STEP_SUMMARY: ${err}`);
  }
}

const allFindings = results.flatMap((result) => result.findings);
const errors = errorsOnly(allFindings);
const warnings = warningsOnly(allFindings);

if (asJson) {
  console.log(
    JSON.stringify(
      { base, crawler, clusterSummaries, results },
      null,
      2,
    ),
  );
} else {
  console.log(`${crawler.name} access check — ${base}\n`);
  for (const result of results) {
    const failed = errorsOnly(result.findings);
    const warned = warningsOnly(result.findings);
    const icon = failed.length > 0 ? "✗" : warned.length > 0 ? "!" : "✓";
    console.log(`${icon} ${result.path}`);
    for (const finding of result.findings) {
      console.log(
        `    ${finding.severity === "error" ? "error" : "warn "} [${finding.code}] ${finding.message}`,
      );
    }
  }

  console.log(`\n### Cluster Crawler Readiness Summary (${crawler.name})\n`);
  console.log(clusterSummaryTable);
  console.log(`\n> **Notice**: ${CRAWLER_READINESS_DISCLAIMER}\n`);

  if (clusterFailureDetails.length > 0) {
    console.log("Cluster failure details:");
    for (const detail of clusterFailureDetails) {
      console.log(`  ${formatClusterFailureDetail(detail)}`);
    }
    console.log("");
  }

  console.log(
    `\n${results.length} checks · ${errors.length} error(s) · ${warnings.length} warning(s)`,
  );
}

if (errors.length > 0 && !reportOnly) process.exit(1);
