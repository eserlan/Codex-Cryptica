import { expect } from "vitest";

const REMOTE_MEDIA_TAG =
  /<\s*(?:img|video|audio|iframe|object|embed|source)\b/i;
const REMOTE_CSS_IMPORT = /@import\b/i;
const REMOTE_RESOURCE_ATTR =
  /\b(?:src|srcset|poster)\s*=\s*["']?\s*(?:https?:|\/\/|data:|blob:)/i;
const CSS_URL_FETCH = /\burl\s*\(\s*["']?\s*(?:https?:|\/\/|data:|blob:)/i;
const ACTIVE_ANCHOR = /<\s*a\b[^>]*\bhref\s*=/i;

/**
 * Asserts that rendered HTML from untrusted, imported, or model-generated
 * Markdown cannot trigger remote resource fetches (Constitution IV: no tracking
 * pixels, SSRF, or IP leakage).
 */
export function assertNoRemoteResourceFetches(html: string): void {
  expect(html, "must not render remote media/embed tags").not.toMatch(
    REMOTE_MEDIA_TAG,
  );
  expect(html, "must not contain CSS @import rules").not.toMatch(
    REMOTE_CSS_IMPORT,
  );
  expect(html, "must not contain remote src/srcset/poster URLs").not.toMatch(
    REMOTE_RESOURCE_ATTR,
  );
  expect(html, "must not contain CSS url() remote fetches").not.toMatch(
    CSS_URL_FETCH,
  );
}

/**
 * Asserts that rendered HTML from literal imported prose does not contain
 * clickable anchor tags (e.g. from bare https:// or www. autolinking).
 */
export function assertNoActiveLinks(html: string): void {
  expect(html, "must not render active <a href=...> links").not.toMatch(
    ACTIVE_ANCHOR,
  );
}

/**
 * Runs a synchronous worst-case / scale workload and asserts it finishes within
 * `maxMs` (default 250 ms), returning the computed result for further checks.
 */
export function assertBoundedPerformance<T>(
  label: string,
  fn: () => T,
  maxMs = 250,
): T {
  const start = performance.now();
  const result = fn();
  const elapsedMs = performance.now() - start;
  expect(
    elapsedMs,
    `${label} exceeded ${maxMs}ms budget (took ${elapsedMs.toFixed(1)}ms)`,
  ).toBeLessThan(maxMs);
  return result;
}
