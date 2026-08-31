/**
 * OAI-SearchBot production access smoke check (#2567).
 *
 * `robots.txt` saying `Allow` does not prove a crawler can actually reach the
 * page: Cloudflare bot management, a WAF rule, a rate limit or a stray
 * `noindex` can all break discovery without changing a single robots line.
 * This script walks the live site as OAI-SearchBot and fails when any of that
 * happens, so a security or header change that breaks discovery is caught.
 *
 * It only ever touches intentionally public discovery routes taken from the
 * production sitemap — private/app/vault routes are out of scope and stay
 * protected.
 *
 * Usage:
 *   bun scripts/crawler-access-check.mjs                  check production
 *   bun scripts/crawler-access-check.mjs --report         report only, exit 0
 *   bun scripts/crawler-access-check.mjs --base=https://… check a preview
 */
import {
  OAI_SEARCHBOT_TOKEN,
  OAI_SEARCHBOT_USER_AGENT,
  downgradeKnownGaps,
  errorsOnly,
  evaluateCrawlResponse,
  expectationFor,
  isPathAllowed,
  parseRobotsTxt,
  pickRepresentativeRoutes,
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
const base = (baseArg ? baseArg.slice("--base=".length) : DEFAULT_BASE).replace(
  /\/+$/,
  "",
);

const results = [];

const record = (path, findings) => {
  results.push({ path, findings });
  return findings;
};

async function crawl(path, userAgent = OAI_SEARCHBOT_USER_AGENT) {
  const requestedUrl = `${base}${path}`;
  const response = await fetch(requestedUrl, {
    headers: { "user-agent": userAgent, accept: "*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.text();
  return {
    requestedUrl,
    finalUrl: response.url || requestedUrl,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

async function checkRoute(path, expectation = expectationFor(path)) {
  try {
    const response = await crawl(path);
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
    group.agents.includes(OAI_SEARCHBOT_TOKEN),
  );
  if (!named) {
    findings.push({
      code: "robots-agent-missing",
      severity: "error",
      message: "robots.txt has no explicit OAI-SearchBot group",
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
        message: `OAI-SearchBot got ${asBot.status} where a browser got ${asBrowser.status}`,
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
try {
  const sitemap = await crawl("/sitemap.xml");
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
  if (robotsText && !isPathAllowed(robots, OAI_SEARCHBOT_TOKEN, path)) {
    record(path, [
      {
        code: "robots-disallow",
        severity: "error",
        message: "sitemap lists a path robots.txt disallows for OAI-SearchBot",
      },
    ]);
    continue;
  }
  await checkRoute(path);
}

await checkUserAgentParity("/");

const allFindings = results.flatMap((result) => result.findings);
const errors = errorsOnly(allFindings);
const warnings = warningsOnly(allFindings);

if (asJson) {
  console.log(JSON.stringify({ base, results }, null, 2));
} else {
  console.log(`OAI-SearchBot access check — ${base}\n`);
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
  console.log(
    `\n${results.length} checks · ${errors.length} error(s) · ${warnings.length} warning(s)`,
  );
}

if (errors.length > 0 && !reportOnly) process.exit(1);
