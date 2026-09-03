/**
 * Search-discovery crawler access checks (#2567).
 *
 * `robots.txt` saying `Allow` is only half the story: a request also has to
 * survive the CDN/WAF stack and come back as the intended public HTML. This
 * module holds the decidable parts of that verification so they can be unit
 * tested, with `scripts/crawler-access-check.mjs` as the thin network layer.
 *
 * Scope is deliberately *search discovery*. Training-crawler policy is a
 * separate decision and must not be changed as a side effect of anything here
 * — see `docs/seo/crawler-access.md`.
 */

/** User agent OpenAI publishes for its search-discovery crawler. */
export const OAI_SEARCHBOT_USER_AGENT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot";

/** The product token OAI-SearchBot matches against in `robots.txt`. */
export const OAI_SEARCHBOT_TOKEN = "oai-searchbot";

export interface RobotsGroup {
  agents: string[];
  allow: string[];
  disallow: string[];
}

export interface RobotsTxt {
  groups: RobotsGroup[];
  sitemaps: string[];
}

/**
 * Parse `robots.txt` into agent groups. Consecutive `User-agent` lines share
 * one group (the form our own robots.txt uses to invite several AI crawlers at
 * once), and a rule line closes the agent list for that group.
 */
export function parseRobotsTxt(text: string): RobotsTxt {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let acceptingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || !acceptingAgents) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
        acceptingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (field === "sitemap") {
      sitemaps.push(value);
      continue;
    }

    if (!current) continue;
    acceptingAgents = false;

    if (field === "allow") current.allow.push(value);
    else if (field === "disallow") current.disallow.push(value);
  }

  return { groups, sitemaps };
}

/**
 * The group a crawler obeys: the most specific matching `User-agent`, falling
 * back to `*`. A crawler that matches a named group ignores the wildcard group
 * entirely, which is why a named group must repeat any rules it still needs.
 */
export function selectRobotsGroup(
  robots: RobotsTxt,
  token: string,
): RobotsGroup | null {
  const needle = token.toLowerCase();
  const named = robots.groups.filter((group) =>
    group.agents.some((agent) => agent === needle),
  );
  if (named.length > 0) return mergeGroups(named);

  const wildcard = robots.groups.filter((group) => group.agents.includes("*"));
  return wildcard.length > 0 ? mergeGroups(wildcard) : null;
}

const mergeGroups = (groups: RobotsGroup[]): RobotsGroup => ({
  agents: groups.flatMap((group) => group.agents),
  allow: groups.flatMap((group) => group.allow),
  disallow: groups.flatMap((group) => group.disallow),
});

/**
 * Match a robots path pattern, supporting the `*` and `$` extensions every
 * major crawler (OpenAI's included) implements. Returns the matched prefix
 * length so callers can apply the longest-match rule, or -1 for no match.
 */
function matchLength(pattern: string, path: string): number {
  if (pattern === "") return -1;

  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source =
    "^" +
    body
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*") +
    (anchored ? "$" : "");

  return new RegExp(source).test(path) ? body.length : -1;
}

/**
 * Google's and OpenAI's shared precedence rule: the longest matching pattern
 * wins, and `Allow` wins an exact-length tie. No matching rule means allowed.
 */
export function isPathAllowed(
  robots: RobotsTxt,
  token: string,
  path: string,
): boolean {
  const group = selectRobotsGroup(robots, token);
  if (!group) return true;

  let bestAllow = -1;
  let bestDisallow = -1;
  for (const pattern of group.allow) {
    bestAllow = Math.max(bestAllow, matchLength(pattern, path));
  }
  for (const pattern of group.disallow) {
    bestDisallow = Math.max(bestDisallow, matchLength(pattern, path));
  }

  if (bestDisallow === -1) return true;
  return bestAllow >= bestDisallow;
}

export type CheckSeverity = "error" | "warning";

export interface CrawlFinding {
  code: string;
  severity: CheckSeverity;
  message: string;
}

export interface CrawlResponse {
  /** URL requested, before redirects. */
  requestedUrl: string;
  /** URL the response actually came from. */
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface RouteExpectation {
  /** `html` routes get the full indexability audit; `text` routes only status. */
  kind: "html" | "text" | "private";
  /** Public discovery routes must be indexable; workspace routes must not. */
  indexability?: "indexable" | "noindex";
  /** Minimum body length before the response counts as substantive. */
  minBytes?: number;
}

/**
 * Route families served as plain text/XML rather than HTML. They appear in the
 * sitemap alongside real pages, so the HTML-only checks must not run on them.
 */
export function expectationFor(path: string): RouteExpectation {
  return /\.(txt|xml|json)$/i.test(path)
    ? { kind: "text", minBytes: 100 }
    : { kind: "html", indexability: "indexable" };
}

/** Markers Cloudflare's managed challenge/interstitial pages ship with. */
const CHALLENGE_MARKERS = [
  "cf-mitigated",
  "just a moment",
  "/cdn-cgi/challenge-platform",
  "cf_chl_opt",
  "enable javascript and cookies to continue",
  "checking your browser before accessing",
  "attention required! | cloudflare",
];

const AUTH_PATH = /\/(login|signin|sign-in|auth|account)(\/|$|\?)/i;

const readHeader = (headers: Record<string, string>, name: string) => {
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name,
  );
  return key ? headers[key] : undefined;
};

const extractTag = (body: string, pattern: RegExp) =>
  body.match(pattern)?.[1]?.trim();

/**
 * Audit a single crawler response for the failure modes in #2567: challenges,
 * auth redirects, `noindex`, off-target canonicals, and empty shells.
 */
export function evaluateCrawlResponse(
  response: CrawlResponse,
  expectation: RouteExpectation,
): CrawlFinding[] {
  const findings: CrawlFinding[] = [];
  const lowerBody = response.body.toLowerCase();

  if (response.status !== 200) {
    findings.push({
      code: "status",
      severity: "error",
      message: `expected 200, received ${response.status}`,
    });
  }

  if (readHeader(response.headers, "cf-mitigated")) {
    findings.push({
      code: "challenge",
      severity: "error",
      message: "Cloudflare returned a cf-mitigated challenge response",
    });
  } else if (
    response.status === 403 ||
    response.status === 429 ||
    response.status === 503
  ) {
    findings.push({
      code: "challenge",
      severity: "error",
      message: `status ${response.status} looks like bot mitigation or rate limiting`,
    });
  } else if (
    expectation.kind === "html" &&
    CHALLENGE_MARKERS.some((marker) => lowerBody.includes(marker))
  ) {
    findings.push({
      code: "challenge",
      severity: "error",
      message: "response body matches a bot/JS challenge interstitial",
    });
  }

  if (
    response.finalUrl !== response.requestedUrl &&
    AUTH_PATH.test(response.finalUrl)
  ) {
    findings.push({
      code: "auth-redirect",
      severity: "error",
      message: `redirected to an authentication route: ${response.finalUrl}`,
    });
  }

  const minBytes =
    expectation.minBytes ?? (expectation.kind === "html" ? 1000 : 1);
  if (response.body.length < minBytes) {
    findings.push({
      code: "thin-content",
      severity: "error",
      message: `body is ${response.body.length} bytes, expected at least ${minBytes}`,
    });
  }

  const expectsNoindex = expectation.indexability === "noindex";
  const xRobots = readHeader(response.headers, "x-robots-tag");
  const hasXRobotsNoindex = Boolean(xRobots && /noindex/i.test(xRobots));
  if (!expectsNoindex && hasXRobotsNoindex) {
    findings.push({
      code: "noindex",
      severity: "error",
      message: `X-Robots-Tag header carries noindex: ${xRobots}`,
    });
  }

  if (expectation.kind === "text") return findings;

  const robotsMeta = extractTag(
    response.body,
    /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i,
  );
  const hasMetaNoindex = Boolean(robotsMeta && /noindex/i.test(robotsMeta));

  if (expectsNoindex) {
    if (!hasXRobotsNoindex && !hasMetaNoindex) {
      findings.push({
        code: "noindex-missing",
        severity: "error",
        message:
          "private route is missing an X-Robots-Tag or robots meta noindex directive",
      });
    }
    return findings;
  }

  if (expectation.kind !== "html") return findings;

  // A JS-only shell is large but carries no crawlable content, which is the
  // failure a byte-count check alone cannot see.
  const title = extractTag(response.body, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) {
    findings.push({
      code: "no-title",
      severity: "error",
      message:
        "no <title> in the crawler-visible HTML (client-rendered shell?)",
    });
  }
  if (!/<h1[\s>]/i.test(response.body)) {
    findings.push({
      code: "no-heading",
      severity: "error",
      message: "no <h1> in the crawler-visible HTML (client-rendered shell?)",
    });
  }
  if (
    !extractTag(
      response.body,
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
    )
  ) {
    findings.push({
      code: "description-missing",
      severity: "warning",
      message: "no meta description",
    });
  }

  if (hasMetaNoindex) {
    findings.push({
      code: "noindex",
      severity: "error",
      message: `<meta name="robots"> carries noindex: ${robotsMeta}`,
    });
  } else if (!robotsMeta) {
    findings.push({
      code: "robots-meta-missing",
      severity: "warning",
      message: 'no <meta name="robots"> tag found',
    });
  }

  const canonical = extractTag(
    response.body,
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
  );
  if (!canonical) {
    findings.push({
      code: "canonical-missing",
      severity: "warning",
      message: "no canonical link found",
    });
  } else if (!sameOrigin(canonical, response.requestedUrl)) {
    findings.push({
      code: "canonical-off-origin",
      severity: "error",
      message: `canonical points off-origin: ${canonical}`,
    });
  } else if (normalizeUrl(canonical) !== normalizeUrl(response.requestedUrl)) {
    findings.push({
      code: "canonical-mismatch",
      severity: "warning",
      message: `canonical ${canonical} differs from the crawled URL`,
    });
  }

  return findings;
}

const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return value;
  }
};

const sameOrigin = (a: string, b: string) => {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
};

export interface RouteResult {
  path: string;
  findings: CrawlFinding[];
}

/**
 * A discovery gap we have seen, understand, and tracked elsewhere. Downgrading
 * it to a warning keeps the smoke check green for known state while still
 * printing the gap on every run — the alternative, deleting the check, is how
 * a known gap quietly becomes a forgotten one.
 */
export interface KnownGap {
  path: string;
  code: string;
  reason: string;
}

export function downgradeKnownGaps(
  path: string,
  findings: CrawlFinding[],
  gaps: KnownGap[],
): CrawlFinding[] {
  return findings.map((finding) => {
    const gap = gaps.find(
      (candidate) => candidate.path === path && candidate.code === finding.code,
    );
    if (!gap || finding.severity !== "error") return finding;
    return {
      ...finding,
      severity: "warning" as const,
      message: `${finding.message} — known gap: ${gap.reason}`,
    };
  });
}

export const errorsOnly = (findings: CrawlFinding[]) =>
  findings.filter((finding) => finding.severity === "error");

export const warningsOnly = (findings: CrawlFinding[]) =>
  findings.filter((finding) => finding.severity === "warning");

/**
 * Pick one representative URL per discovery route family from a sitemap, so
 * the smoke check keeps covering new families as they ship without hard-coding
 * a list that silently rots.
 */
export function pickRepresentativeRoutes(
  sitemapXml: string,
  perFamily = 1,
): string[] {
  const locs = [...sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
    (match) => match[1],
  );

  const seen = new Map<string, string[]>();
  for (const loc of locs) {
    let path: string;
    try {
      path = new URL(loc).pathname;
    } catch {
      continue;
    }
    const family = path === "/" ? "/" : `/${path.split("/")[1]}`;
    const bucket = seen.get(family) ?? [];
    if (bucket.length < perFamily) {
      bucket.push(path);
      seen.set(family, bucket);
    }
  }

  return [...seen.values()].flat().sort();
}
