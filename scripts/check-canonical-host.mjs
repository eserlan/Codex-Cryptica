#!/usr/bin/env node

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

async function checkRedirect(startUrl) {
  const context = `redirect ${startUrl}`;
  let current = new URL(startUrl);
  let redirected = false;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request(current.href);
    if ([301, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) return fail(context, "permanent redirect missing Location");
      current = new URL(location, current);
      redirected = true;
      continue;
    }
    if (res.status >= 300 && res.status < 400) {
      return fail(context, `non-permanent ${res.status} redirect to ${res.headers.get("location")}`);
    }
    if (res.status !== 200) {
      return fail(context, `expected 200 after redirect, got ${res.status}`);
    }
    if (!redirected) return fail(context, "no permanent redirect");
    const wanted = new URL(startUrl);
    const expected = `${APEX}${wanted.pathname}${wanted.search}`;
    if (current.href !== expected) {
      fail(context, `ended at ${current.href}, expected ${expected}`);
    }
    checks++;
    return;
  }
  fail(context, "more than five redirects");
}

function htmlAttribute(tag, attr) {
  const rx = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(rx)?.[1] ?? null;
}

function headValue(html, tagName, identifyingName, identifyingValue, valueAttr) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  const matches = tags.filter(
    (tag) => htmlAttribute(tag, identifyingName)?.toLowerCase() === identifyingValue,
  );
  if (matches.length !== 1) {
    return { error: `expected one ${identifyingValue} tag, found ${matches.length}` };
  }
  return { value: htmlAttribute(matches[0], valueAttr) };
}

async function checkPage(path) {
  const url = `${APEX}${path}`;
  const response = await request(url);
  if (response.status !== 200) {
    fail(path, `expected HTTP 200 on apex, got ${response.status}`);
    return;
  }
  const html = await response.text();
  const canonical = headValue(html, "link", "rel", "canonical", "href");
  if (canonical.error) {
    fail(path, canonical.error);
  } else {
    let target;
    try {
      target = new URL(canonical.value);
    } catch {
      fail(path, `invalid canonical URL ${canonical.value}`);
      return;
    }
    if (target.origin !== APEX) {
      fail(path, `canonical points to ${target.origin}, not ${APEX}`);
    }
    // Path aliases may legitimately canonicalise to the owning generator.
    if (target.pathname === "/" && path !== "/") {
      fail(path, "canonical points to homepage unexpectedly");
    }
  }

  const og = headValue(html, "meta", "property", "og:url", "content");
  if (og.error) {
    fail(path, og.error);
  } else if (!og.value?.startsWith(APEX + "/") && og.value !== APEX) {
    fail(path, `og:url not on preferred host: ${og.value}`);
  }

  const robotsHeader = response.headers.get("x-robots-tag") ?? "";
  if (/noindex/i.test(robotsHeader)) {
    fail(path, "public page sent X-Robots-Tag: noindex");
  }
  checks++;
}

async function checkDiscoveryFiles() {
  const sitemap = await request(`${APEX}/sitemap.xml`);
  if (sitemap.status !== 200) {
    fail("sitemap", `HTTP ${sitemap.status}`);
  } else {
    const xml = await sitemap.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    if (locs.length === 0) fail("sitemap", "no <loc> elements");
    const offHost = locs.filter((url) => !url.startsWith(APEX + "/"));
    if (offHost.length) {
      fail("sitemap", `${offHost.length} URLs outside ${APEX}; first: ${offHost[0]}`);
    }
    checks++;
  }

  const robots = await request(`${APEX}/robots.txt`);
  if (robots.status !== 200) {
    fail("robots", `HTTP ${robots.status}`);
  } else {
    const txt = await robots.text();
    if (!txt.includes(`Sitemap: ${APEX}/sitemap.xml`)) {
      fail("robots", "canonical Sitemap declaration missing");
    }
    checks++;
  }
}

for (const path of pages) {
  try {
    await checkPage(path);
    for (const prefix of ["https://www.", "http://"]) {
      const source = `${prefix}${HOST}${path}?cc_host_probe=1`;
      await checkRedirect(source);
    }
  } catch (err) {
    fail(path, err instanceof Error ? err.message : String(err));
  }
}

try {
  await checkDiscoveryFiles();
} catch (err) {
  fail("discovery files", err instanceof Error ? err.message : String(err));
}

if (problems.length) {
  console.error(`Canonical host audit: ${problems.length} problem(s), ${checks} checks passed.`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Canonical host audit passed: ${checks} checks on ${APEX}.`);
}
