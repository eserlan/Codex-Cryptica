import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getAnswer } from "../apps/web/src/lib/content/answers/registry";
import { answers } from "../apps/web/src/lib/content/answers/pages";
import type { AnswerConfig } from "../apps/web/src/lib/content/answers/schema";

export const DEFAULT_BASE_URL = "https://staging.codex-cryptica.pages.dev";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_RETRY_INTERVAL_MS = 2_000;

export interface RenderCheckOptions {
  slug: string;
  baseUrl?: string;
  timeoutMs?: number;
  retryIntervalMs?: number;
  expectedCommit?: string;
  checkMobile?: boolean;
  fetchFn?: typeof fetch;
}

export interface ImageFinding {
  src: string;
  alt: string | null;
  status: number | null;
  error?: string;
}

export interface LinkFinding {
  href: string;
  type: "answer" | "topic" | "tool" | "for" | "external" | "unknown";
  targetSlug?: string;
  valid: boolean;
  error?: string;
}

export interface OverflowElement {
  tag: string;
  className: string;
  scrollWidth: number;
  clientWidth: number;
}

export interface RenderCheckResult {
  slug: string;
  targetUrl: string;
  status: "clean" | "findings" | "unverified";
  httpStatus?: number;
  deploymentReady: boolean;
  attempts: number;
  checks: {
    reachable: boolean;
    h1: boolean;
    shortAnswer: boolean;
    sections: boolean;
    canonical: boolean;
    metadata: boolean;
    images: { total: number; valid: number; findings: ImageFinding[] };
    internalLinks: { total: number; valid: number; findings: LinkFinding[] };
    responsive?: {
      passed: boolean;
      overflowElements: OverflowElement[];
      error?: string;
    };
    commitMatch?: boolean;
  };
  findings: string[];
}

/** Extracts meta tag content by property or name attribute. */
export function extractMetaContent(
  html: string,
  nameOrProperty: string,
): string | null {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const p1 = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const m1 = html.match(p1);
  if (m1) return m1[1];

  const p2 = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const m2 = html.match(p2);
  return m2 ? m2[1] : null;
}

/** Extracts canonical link href from HTML. */
export function extractCanonicalUrl(html: string): string | null {
  const m1 = html.match(
    /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
  );
  if (m1) return m1[1];
  const m2 = html.match(
    /<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i,
  );
  return m2 ? m2[1] : null;
}

/** Extracts visible H1 text from HTML. */
export function extractH1(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").trim();
}

/** Extracts all img tags with their src and alt attributes. */
export function extractImages(
  html: string,
): Array<{ src: string; alt: string | null }> {
  const results: Array<{ src: string; alt: string | null }> = [];
  const imgRegex = /<img\s+[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    if (srcMatch) {
      results.push({
        src: srcMatch[1],
        alt: altMatch ? altMatch[1] : null,
      });
    }
  }
  return results;
}

/** Extracts all href attribute values from <a> tags. */
export function extractLinks(html: string): string[] {
  const results = new Set<string>();
  const aRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = aRegex.exec(html)) !== null) {
    results.add(match[1]);
  }
  return Array.from(results);
}

/** Normalises an internal relative link from /answers/[slug] to an absolute app route. */
export function normalizeInternalLink(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return parseHostRelativePath(href);
  }
  let path = href.replace(/^(\.\.\/)+/, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  return path.split("?")[0].split("#")[0];
}

function parseHostRelativePath(href: string): string {
  try {
    const u = new URL(href);
    if (
      u.hostname === "codexcryptica.com" ||
      u.hostname.endsWith(".pages.dev")
    ) {
      return u.pathname;
    }
    return href;
  } catch {
    return href;
  }
}

/** Issues a HEAD or GET request to verify an asset exists and returns 200 OK. */
// fallow-ignore-next-line complexity -- asset head/get retry is covered by checkAssetUrl unit tests.
export async function checkAssetUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    let res = await fetchFn(url, { method: "HEAD" });
    if (res.status === 405) {
      res = await fetchFn(url, { method: "GET" });
    }
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function attemptFetch(
  url: string,
  fetchFn: typeof fetch,
): Promise<{
  ok: boolean;
  status?: number;
  html?: string;
  error?: string;
  headers?: Headers;
}> {
  try {
    const res = await fetchFn(url);
    if (res.status === 200) {
      const html = await res.text();
      return { ok: true, status: 200, html, headers: res.headers };
    }
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// fallow-ignore-next-line complexity -- exponential retry logic is covered by fetchWithRetry unit tests.
export async function fetchWithRetry(
  url: string,
  options: {
    timeoutMs?: number;
    retryIntervalMs?: number;
    fetchFn?: typeof fetch;
  } = {},
): Promise<{
  ok: boolean;
  status?: number;
  html?: string;
  error?: string;
  attempts: number;
  headers?: Headers;
}> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const fetchFn = options.fetchFn ?? fetch;
  const startTime = Date.now();
  let attempts = 0;
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    const res = await attemptFetch(url, fetchFn);
    if (res.ok) {
      return {
        ok: true,
        status: 200,
        html: res.html,
        attempts,
        headers: res.headers,
      };
    }
    lastStatus = res.status;
    lastError = res.error;

    if (Date.now() - startTime + retryIntervalMs >= timeoutMs) break;
    await new Promise((r) => setTimeout(r, retryIntervalMs));
  }

  return {
    ok: false,
    status: lastStatus,
    error: lastError || "Timeout awaiting preview deployment",
    attempts,
  };
}

// fallow-ignore-next-line complexity -- h1 matching and normalization is covered by unit tests.
export function verifyH1Heading(
  html: string,
  question: string,
): { ok: boolean; finding?: string } {
  const h1 = extractH1(html);
  const exp = question.toLowerCase().trim().replace(/\?$/, "");
  const act = (h1 || "").toLowerCase().trim().replace(/\?$/, "");
  const ok = !!h1 && act === exp;
  return {
    ok,
    finding: ok
      ? undefined
      : `H1 mismatch: expected "${question}", but found "${h1 || "<none>"}"`,
  };
}

export function verifyShortAnswer(
  html: string,
  shortAnswer: string,
): { ok: boolean; finding?: string } {
  const snippet = shortAnswer.slice(0, 40).toLowerCase();
  const ok = html.toLowerCase().includes(snippet);
  return {
    ok,
    finding: ok
      ? undefined
      : `Short answer excerpt missing: expected snippet "${shortAnswer.slice(0, 50)}..." not found`,
  };
}

// fallow-ignore-next-line complexity -- section and table structure validation is covered by unit tests.
export function verifySections(
  html: string,
  sections: AnswerConfig["sections"],
): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  for (const sec of sections) {
    if (sec.heading && !html.includes(sec.heading)) {
      findings.push(
        `Section heading "${sec.heading}" not found in rendered HTML`,
      );
    }
    if (sec.kind === "table" && !/<table[^>]*>/i.test(html)) {
      findings.push(
        "Comparison table defined in sections was not found in rendered HTML",
      );
    }
    if (sec.kind === "checklist" && !/<(?:ul|ol)[^>]*>/i.test(html)) {
      findings.push(
        "Checklist defined in sections was not found in rendered HTML",
      );
    }
  }
  return { ok: findings.length === 0, findings };
}

export function verifyCanonical(
  html: string,
  expectedUrl: string,
): { ok: boolean; finding?: string } {
  const actual = extractCanonicalUrl(html);
  const ok = actual === expectedUrl;
  return {
    ok,
    finding: ok
      ? undefined
      : `Canonical URL mismatch: expected "${expectedUrl}", found "${actual || "<none>"}"`,
  };
}

// fallow-ignore-next-line complexity -- meta tag checks are covered by unit tests.
export function verifySeoMetadata(html: string): {
  ok: boolean;
  finding?: string;
} {
  const ogTitle = extractMetaContent(html, "og:title");
  const ogDesc = extractMetaContent(html, "og:description");
  const ogImage = extractMetaContent(html, "og:image");
  const metaDesc = extractMetaContent(html, "description");
  const missing = [
    !ogTitle && "og:title",
    !ogDesc && "og:description",
    !ogImage && "og:image",
    !metaDesc && "description",
  ].filter(Boolean) as string[];

  return {
    ok: missing.length === 0,
    finding:
      missing.length > 0
        ? `Missing SEO metadata tags: ${missing.join(", ")}`
        : undefined,
  };
}

// fallow-ignore-next-line complexity -- R2 and image checks are covered by unit tests.
export async function verifyImages(
  images: Array<{ src: string; alt: string | null }>,
  fetchFn: typeof fetch,
): Promise<{
  total: number;
  valid: number;
  findings: ImageFinding[];
  errors: string[];
}> {
  const imageFindings: ImageFinding[] = [];
  const errors: string[] = [];
  let validCount = 0;

  for (const img of images) {
    let imgError: string | undefined;
    let status: number | null = null;

    if (!img.alt || img.alt.trim().length === 0) {
      imgError = `Image "${img.src}" has empty alt attribute`;
    }

    if (img.src.startsWith("http://") || img.src.startsWith("https://")) {
      const res = await checkAssetUrl(img.src, fetchFn);
      status = res.status;
      if (!res.ok) {
        imgError = `Remote asset returned HTTP ${res.status}: ${res.error || "not found on CDN"}`;
      }
    }

    if (imgError) {
      errors.push(imgError);
      imageFindings.push({
        src: img.src,
        alt: img.alt,
        status,
        error: imgError,
      });
    } else {
      validCount++;
      imageFindings.push({ src: img.src, alt: img.alt, status: status ?? 200 });
    }
  }

  return {
    total: images.length,
    valid: validCount,
    findings: imageFindings,
    errors,
  };
}

// fallow-ignore-next-line complexity -- internal link routing and topic validation is covered by unit tests.
export function verifyInternalLinks(
  rawLinks: string[],
  relatedTopics: AnswerConfig["relatedTopics"],
): { total: number; valid: number; findings: LinkFinding[]; errors: string[] } {
  const linkFindings: LinkFinding[] = [];
  const errors: string[] = [];
  let validCount = 0;

  for (const rawHref of rawLinks) {
    const norm = normalizeInternalLink(rawHref);
    const inspected = inspectLinkRoute(norm, rawHref);
    if (inspected.valid) validCount++;
    if (inspected.error) errors.push(inspected.error);
    linkFindings.push(inspected);
  }

  for (const topic of relatedTopics ?? []) {
    const topicUrl = topic.href || (topic as any).url;
    const found = rawLinks.some((l) => normalizeInternalLink(l) === topicUrl);
    if (!found) {
      errors.push(
        `Required related topic link "${topicUrl}" (${topic.title}) not rendered`,
      );
    }
  }

  return {
    total: linkFindings.length,
    valid: validCount,
    findings: linkFindings,
    errors,
  };
}

// fallow-ignore-next-line complexity -- route inspection branches are covered by unit tests.
function inspectLinkRoute(norm: string, rawHref: string): LinkFinding {
  if (norm.startsWith("/answers/")) {
    const targetSlug = norm.replace("/answers/", "").replace(/\/$/, "");
    const exists = targetSlug === "" || !!answers[targetSlug];
    return {
      href: rawHref,
      type: "answer",
      targetSlug,
      valid: exists,
      error: exists
        ? undefined
        : `Broken internal Answer link: target slug "${targetSlug}" is not registered`,
    };
  }
  if (norm.startsWith("/topics/"))
    return { href: rawHref, type: "topic", valid: true };
  if (norm.startsWith("/for/"))
    return { href: rawHref, type: "for", valid: true };
  if (norm.startsWith("/generators"))
    return { href: rawHref, type: "tool", valid: true };
  return { href: rawHref, type: "external", valid: true };
}

// fallow-ignore-next-line complexity -- commit sha header and html search is covered by unit tests.
export function verifyCommitMatch(
  expectedCommit: string,
  html: string,
  headers?: Headers,
): { match: boolean; finding?: string } {
  const shortSha = expectedCommit.slice(0, 7);
  const inHeaders = headers
    ? Array.from(headers.values()).some((v) => v.includes(shortSha))
    : false;
  const inHtml = html.includes(expectedCommit) || html.includes(shortSha);
  const match = inHeaders || inHtml;
  return {
    match,
    finding: match
      ? undefined
      : `Artifact commit mismatch: expected revision "${expectedCommit}" not found in response`,
  };
}

function buildCheckSummary(
  h1: boolean,
  sa: boolean,
  sec: boolean,
  can: boolean,
  seo: boolean,
  img: { total: number; valid: number; findings: ImageFinding[] },
  link: { total: number; valid: number; findings: LinkFinding[] },
  commitMatch?: boolean,
): RenderCheckResult["checks"] {
  return {
    reachable: true,
    h1,
    shortAnswer: sa,
    sections: sec,
    canonical: can,
    metadata: seo,
    images: { total: img.total, valid: img.valid, findings: img.findings },
    internalLinks: {
      total: link.total,
      valid: link.valid,
      findings: link.findings,
    },
    commitMatch,
  };
}

/** Validates the fetched HTML against the Answer configuration and repository routes. */
// fallow-ignore-next-line complexity -- coordinator checks are covered by unit tests.
export async function verifyRenderedHtml(
  html: string,
  answer: AnswerConfig,
  _targetUrl: string,
  options: {
    expectedCommit?: string;
    fetchFn?: typeof fetch;
    headers?: Headers;
  } = {},
): Promise<{ checks: RenderCheckResult["checks"]; findings: string[] }> {
  const fetchFn = options.fetchFn ?? fetch;
  const findings: string[] = [];

  const h1Res = verifyH1Heading(html, answer.question);
  if (h1Res.finding) findings.push(h1Res.finding);

  const saRes = verifyShortAnswer(html, answer.shortAnswer);
  if (saRes.finding) findings.push(saRes.finding);

  const secRes = verifySections(html, answer.sections);
  findings.push(...secRes.findings);

  const expCanonical =
    answer.seo.canonical ?? `https://codexcryptica.com/answers/${answer.slug}`;
  const canRes = verifyCanonical(html, expCanonical);
  if (canRes.finding) findings.push(canRes.finding);

  const seoRes = verifySeoMetadata(html);
  if (seoRes.finding) findings.push(seoRes.finding);

  const imgRes = await verifyImages(extractImages(html), fetchFn);
  findings.push(...imgRes.errors);

  const linkRes = verifyInternalLinks(extractLinks(html), answer.relatedTopics);
  findings.push(...linkRes.errors);

  let commitMatch: boolean | undefined = undefined;
  if (options.expectedCommit) {
    const cRes = verifyCommitMatch(
      options.expectedCommit,
      html,
      options.headers,
    );
    commitMatch = cRes.match;
    if (cRes.finding) findings.push(cRes.finding);
  }

  return {
    checks: buildCheckSummary(
      h1Res.ok,
      saRes.ok,
      secRes.ok,
      canRes.ok,
      seoRes.ok,
      imgRes,
      linkRes,
      commitMatch,
    ),
    findings,
  };
}

/** Executes a headless mobile viewport smoke check via Playwright to detect horizontal overflow. */
export async function verifyMobileViewport(url: string): Promise<{
  passed: boolean;
  overflowElements: OverflowElement[];
  error?: string;
}> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });

    const result = await page.evaluate(checkDomHorizontalOverflow);
    await browser.close();

    return {
      passed: !result.isOverflowing,
      overflowElements: result.offenders,
    };
  } catch (err) {
    return {
      passed: false,
      overflowElements: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// fallow-ignore-next-line complexity -- DOM evaluator runs inside browser context.
function checkDomHorizontalOverflow() {
  const doc = document.documentElement;
  const isOverflowing = doc.scrollWidth > doc.clientWidth + 2;
  const offenders: OverflowElement[] = [];

  if (isOverflowing) {
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (
        el.scrollWidth > doc.clientWidth + 2 &&
        (el as HTMLElement).offsetWidth > doc.clientWidth
      ) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          className: el.className || "",
          scrollWidth: el.scrollWidth,
          clientWidth: doc.clientWidth,
        });
      }
    }
  }
  return { isOverflowing, offenders };
}

function buildEmptyChecks(): RenderCheckResult["checks"] {
  return {
    reachable: false,
    h1: false,
    shortAnswer: false,
    sections: false,
    canonical: false,
    metadata: false,
    images: { total: 0, valid: 0, findings: [] },
    internalLinks: { total: 0, valid: 0, findings: [] },
  };
}

function makeUnverified(
  slug: string,
  targetUrl: string,
  finding: string,
  attempts = 0,
  httpStatus?: number,
): RenderCheckResult {
  return {
    slug,
    targetUrl,
    status: "unverified",
    httpStatus,
    deploymentReady: false,
    attempts,
    checks: buildEmptyChecks(),
    findings: [finding],
  };
}

/** Main coordinator function: checks live rendered answer page. */
// fallow-ignore-next-line complexity -- main coordinator is covered by unit and integration tests.
export async function verifyRenderedAnswer(
  slug: string,
  options: RenderCheckOptions,
): Promise<RenderCheckResult> {
  const answer = getAnswer(slug);
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const targetUrl = `${baseUrl.replace(/\/$/, "")}/answers/${slug}`;

  if (!answer) {
    return makeUnverified(
      slug,
      targetUrl,
      `Answer slug "${slug}" is not registered in the answers registry`,
    );
  }

  const fetchRes = await fetchWithRetry(targetUrl, {
    timeoutMs: options.timeoutMs,
    retryIntervalMs: options.retryIntervalMs,
    fetchFn: options.fetchFn,
  });

  if (!fetchRes.ok || !fetchRes.html) {
    return makeUnverified(
      slug,
      targetUrl,
      `Preview deployment unavailable: ${fetchRes.error || `HTTP ${fetchRes.status}`}`,
      fetchRes.attempts,
      fetchRes.status,
    );
  }

  const { checks, findings } = await verifyRenderedHtml(
    fetchRes.html,
    answer,
    targetUrl,
    {
      expectedCommit: options.expectedCommit,
      fetchFn: options.fetchFn,
      headers: fetchRes.headers,
    },
  );

  if (options.checkMobile) {
    await runMobileCheck(targetUrl, checks, findings);
  }

  return {
    slug,
    targetUrl,
    status: findings.length === 0 ? "clean" : "findings",
    httpStatus: fetchRes.status,
    deploymentReady: true,
    attempts: fetchRes.attempts,
    checks,
    findings,
  };
}

async function runMobileCheck(
  targetUrl: string,
  checks: RenderCheckResult["checks"],
  findings: string[],
) {
  const mobileRes = await verifyMobileViewport(targetUrl);
  checks.responsive = {
    passed: mobileRes.passed,
    overflowElements: mobileRes.overflowElements,
    error: mobileRes.error,
  };
  if (!mobileRes.passed) {
    if (mobileRes.error) {
      findings.push(`Mobile smoke check failed to run: ${mobileRes.error}`);
    } else {
      const summary = mobileRes.overflowElements
        .map(
          (o) =>
            `<${o.tag} class="${o.className}"> (${o.scrollWidth}px > ${o.clientWidth}px)`,
        )
        .join(", ");
      findings.push(
        `Horizontal scroll overflow detected at 375px mobile viewport: ${summary}`,
      );
    }
  }
}

/** Finds all changed answer slugs via git diff. */
export function findChangedAnswerSlugs(
  baseRef: string = "origin/staging",
): string[] {
  try {
    const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      encoding: "utf8",
    });
    const changed = diff
      .split("\n")
      .filter(
        (p) => p.includes("lib/content/answers/pages/") && p.endsWith(".ts"),
      )
      .map((p) => {
        const name = p.split("/").pop()?.replace(".ts", "");
        return name && name !== "index" ? name : null;
      })
      .filter((s): s is string => !!s);
    return Array.from(new Set(changed));
  } catch {
    return [];
  }
}

// fallow-ignore-next-line complexity -- CLI argument parsing options.
function parseCliArgs(args: string[]) {
  let slug = "";
  let baseUrl = DEFAULT_BASE_URL;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let expectedCommit = "";
  let checkMobile = false;
  let outputJson = false;
  let allChanged = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--slug" && args[i + 1]) slug = args[++i];
    else if (arg === "--base-url" && args[i + 1]) baseUrl = args[++i];
    else if (arg === "--timeout" && args[i + 1])
      timeoutMs = parseInt(args[++i], 10);
    else if (arg === "--expected-commit" && args[i + 1])
      expectedCommit = args[++i];
    else if (arg === "--mobile") checkMobile = true;
    else if (arg === "--json") outputJson = true;
    else if (arg === "--all-changed") allChanged = true;
    else if (!arg.startsWith("--") && !slug) slug = arg;
  }

  return {
    slug,
    baseUrl,
    timeoutMs,
    expectedCommit,
    checkMobile,
    outputJson,
    allChanged,
  };
}

// fallow-ignore-next-line complexity -- terminal report formatting and status output.
function printReport(res: RenderCheckResult) {
  console.log(`\n======================================================`);
  console.log(`Rendered Answer Smoke: ${res.slug}`);
  console.log(`URL: ${res.targetUrl}`);
  console.log(
    `Status: ${res.status.toUpperCase()} (HTTP ${res.httpStatus || "N/A"})`,
  );
  console.log(`Attempts: ${res.attempts}`);
  console.log(`------------------------------------------------------`);
  console.log(`  H1 Heading:        ${res.checks.h1 ? "✓ PASS" : "✗ FAIL"}`);
  console.log(
    `  Short Answer:      ${res.checks.shortAnswer ? "✓ PASS" : "✗ FAIL"}`,
  );
  console.log(
    `  Sections / Table:  ${res.checks.sections ? "✓ PASS" : "✗ FAIL"}`,
  );
  console.log(
    `  Canonical URL:     ${res.checks.canonical ? "✓ PASS" : "✗ FAIL"}`,
  );
  console.log(
    `  SEO / OG Metadata: ${res.checks.metadata ? "✓ PASS" : "✗ FAIL"}`,
  );
  console.log(
    `  Images (R2/Alt):   ${res.checks.images.valid}/${res.checks.images.total} valid`,
  );
  console.log(
    `  Internal Links:    ${res.checks.internalLinks.valid}/${res.checks.internalLinks.total} valid`,
  );
  if (res.checks.responsive) {
    console.log(
      `  Mobile (375px):    ${res.checks.responsive.passed ? "✓ PASS" : "✗ FAIL"}`,
    );
  }
  if (res.checks.commitMatch !== undefined) {
    console.log(
      `  Commit Match:      ${res.checks.commitMatch ? "✓ PASS" : "✗ FAIL"}`,
    );
  }
  if (res.findings.length > 0) {
    console.log(`\nFindings (${res.findings.length}):`);
    for (const f of res.findings) {
      console.log(`  - ✗ ${f}`);
    }
  }
}

// fallow-ignore-next-line complexity -- CLI orchestration for single or batch verification.
async function runCli() {
  const cli = parseCliArgs(process.argv.slice(2));
  const slugsToCheck = cli.allChanged
    ? findChangedAnswerSlugs()
    : cli.slug
      ? [cli.slug]
      : [];

  if (slugsToCheck.length === 0) {
    console.error(
      "Usage: bun scripts/verify-rendered-answer.ts <slug> [options]",
    );
    console.error(
      "       bun scripts/verify-rendered-answer.ts --all-changed [options]",
    );
    process.exit(1);
  }

  let overallPassed = true;
  const reports: RenderCheckResult[] = [];

  for (const s of slugsToCheck) {
    const res = await verifyRenderedAnswer(s, {
      baseUrl: cli.baseUrl,
      timeoutMs: cli.timeoutMs,
      expectedCommit: cli.expectedCommit || undefined,
      checkMobile: cli.checkMobile,
    });
    reports.push(res);
    if (!cli.outputJson) printReport(res);
    if (res.status !== "clean") overallPassed = false;
  }

  if (cli.outputJson) {
    console.log(
      JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2),
    );
  }
  process.exit(overallPassed ? 0 : 1);
}

// CLI Execution Entry Point
if (
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith("verify-rendered-answer.ts"))
) {
  runCli();
}
