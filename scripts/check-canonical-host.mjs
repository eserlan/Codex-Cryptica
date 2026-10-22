#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Live, read-only canonical-host smoke test (#4303).
 *
 * Run against production from a machine with DNS and HTTPS access:
 *   node scripts/check-canonical-host.mjs
 *
 * Cloudflare Pages' _redirects file handles paths, not hostname-level
 * canonicalisation. Verify the www -> apex redirect at Cloudflare's zone
 * configuration instead of assuming that a sitemap proves a redirect.
 */

const HOST = "codexcryptica.com";
const APEX = `https://${HOST}`;
const TIMEOUT_MS = 15_000;

const pages = [
  "/",
  "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
  "/generators/fantasy-names",
  "/tools/quest-hook-generator",
  "/for/fantasy-worldbuilding",
];

const problems = [];
let checks = 0;

async function request(url) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": "CodexCrypticaCanonicalAudit/1.0",
      accept: "text/html,application/xml,text/plain",
    },
  });
  return response;
}

function fail(context, detail) {
  problems.push(`${context}: ${detail}`);
}

function permanentRedirectStep(response, current) {
  const location = response.headers.get("location");
  if (!location) return { error: "permanent redirect missing Location" };
  return { next: new URL(location, current) };
}

function ordinaryResponseStep(response) {
  if (response.status === 200) return { done: true };
  if (response.status >= 300 && response.status < 400) {
    return {
      error: `non-permanent ${response.status} redirect to ${response.headers.get("location")}`,
    };
  }
  return { error: `expected 200 after redirect, got ${response.status}` };
}

export function redirectStep(response, current) {
  return [301, 308].includes(response.status)
    ? permanentRedirectStep(response, current)
    : ordinaryResponseStep(response);
}

export function redirectTargetProblem(startUrl, current, redirected) {
  if (!redirected) return "no permanent redirect";
  const wanted = new URL(startUrl);
  const expected = `${APEX}${wanted.pathname}${wanted.search}`;
  return current.href === expected
    ? null
    : `ended at ${current.href}, expected ${expected}`;
}

async function followRedirects(startUrl) {
  let current = new URL(startUrl);
  let redirected = false;

  for (let attempt = 0; attempt < 6; attempt++) {
    const step = redirectStep(await request(current.href), current);
    if (step.error) return { error: step.error };
    if (step.done) return { current, redirected };
    current = step.next;
    redirected = true;
  }
  return { error: "more than five redirects" };
}

async function checkRedirect(startUrl) {
  const context = `redirect ${startUrl}`;
  const result = await followRedirects(startUrl);
  if (result.error) return fail(context, result.error);
  const problem = redirectTargetProblem(
    startUrl,
    result.current,
    result.redirected,
  );
  if (problem) return fail(context, problem);
  checks++;
}

function htmlAttribute(tag, attr) {
  const rx = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(rx)?.[1] ?? null;
}

function headValue(
  html,
  tagName,
  identifyingName,
  identifyingValue,
  valueAttr,
) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  const matches = tags.filter(
    (tag) =>
      htmlAttribute(tag, identifyingName)?.toLowerCase() === identifyingValue,
  );
  if (matches.length !== 1) {
    return {
      error: `expected one ${identifyingValue} tag, found ${matches.length}`,
    };
  }
  return { value: htmlAttribute(matches[0], valueAttr) };
}

function canonicalValueProblem(html) {
  const canonical = headValue(html, "link", "rel", "canonical", "href");
  return canonical.error
    ? { error: canonical.error }
    : { value: canonical.value };
}

function parseCanonicalTarget(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    return { error: `invalid canonical URL ${value}` };
  }
  return { target };
}

function canonicalHostProblem(target) {
  return target.origin === APEX
    ? null
    : `canonical points to ${target.origin}, not ${APEX}`;
}

function canonicalPathProblem(path, target) {
  // Path aliases may legitimately canonicalise to the owning generator.
  if (target.pathname === "/" && path !== "/")
    return "canonical points to homepage unexpectedly";
  return null;
}

function canonicalTargetProblem(path, value) {
  const parsed = parseCanonicalTarget(value);
  if (parsed.error) return parsed.error;
  return (
    canonicalHostProblem(parsed.target) ??
    canonicalPathProblem(path, parsed.target)
  );
}

export function canonicalProblem(path, html) {
  const result = canonicalValueProblem(html);
  if (result.error) return result.error;
  return canonicalTargetProblem(path, result.value);
}

export function openGraphProblem(html) {
  const og = headValue(html, "meta", "property", "og:url", "content");
  if (og.error) return og.error;
  if (!og.value?.startsWith(APEX + "/") && og.value !== APEX) {
    return `og:url not on preferred host: ${og.value}`;
  }
  return null;
}

export function robotsMetaProblem(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const hasNoindex = tags.some(
    (tag) =>
      htmlAttribute(tag, "name")?.toLowerCase() === "robots" &&
      /\bnoindex\b/i.test(htmlAttribute(tag, "content") ?? ""),
  );
  return hasNoindex
    ? 'public page sent <meta name="robots" content="noindex">'
    : null;
}

function checkRobotsHeader(path, response) {
  const robotsHeader = response.headers.get("x-robots-tag") ?? "";
  if (/noindex/i.test(robotsHeader)) {
    fail(path, "public page sent X-Robots-Tag: noindex");
  }
}

export function redirectProbeUrls(path) {
  const query = "?cc_host_probe=1";
  return [
    `https://www.${HOST}${path}${query}`,
    `http://${HOST}${path}${query}`,
    `http://www.${HOST}${path}${query}`,
  ];
}

async function checkPage(path) {
  const response = await request(`${APEX}${path}`);
  if (response.status !== 200)
    return fail(path, `expected HTTP 200 on apex, got ${response.status}`);
  const html = await response.text();
  for (const problem of [
    canonicalProblem(path, html),
    openGraphProblem(html),
    robotsMetaProblem(html),
  ]) {
    if (problem) fail(path, problem);
  }
  checkRobotsHeader(path, response);
  checks++;
}

async function checkSitemap() {
  const sitemap = await request(`${APEX}/sitemap.xml`);
  if (sitemap.status !== 200) return fail("sitemap", `HTTP ${sitemap.status}`);
  const xml = await sitemap.text();
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
  if (locs.length === 0) fail("sitemap", "no <loc> elements");
  const offHost = locs.filter((url) => !url.startsWith(APEX + "/"));
  if (offHost.length)
    fail(
      "sitemap",
      `${offHost.length} URLs outside ${APEX}; first: ${offHost[0]}`,
    );
  checks++;
}

async function checkRobotsFile() {
  const robots = await request(`${APEX}/robots.txt`);
  if (robots.status !== 200) return fail("robots", `HTTP ${robots.status}`);
  const txt = await robots.text();
  if (!txt.includes(`Sitemap: ${APEX}/sitemap.xml`))
    fail("robots", "canonical Sitemap declaration missing");
  checks++;
}

async function checkDiscoveryFiles() {
  await checkSitemap();
  await checkRobotsFile();
}

async function checkPageAndRedirects(path) {
  try {
    await checkPage(path);
    for (const url of redirectProbeUrls(path)) await checkRedirect(url);
  } catch (err) {
    fail(path, err instanceof Error ? err.message : String(err));
  }
}

async function checkDiscoveryFilesSafely() {
  try {
    await checkDiscoveryFiles();
  } catch (err) {
    fail("discovery files", err instanceof Error ? err.message : String(err));
  }
}

async function runAudit() {
  for (const path of pages) await checkPageAndRedirects(path);
  await checkDiscoveryFilesSafely();

  if (problems.length) {
    console.error(
      `Canonical host audit: ${problems.length} problem(s), ${checks} checks passed.`,
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`Canonical host audit passed: ${checks} checks on ${APEX}.`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await runAudit();
