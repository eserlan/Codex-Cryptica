/**
 * Search Index Notification Service via IndexNow (#3164).
 *
 * Automatically notifies supported search engines (Bing, Yandex, etc.) about
 * changed public discovery, content, and catalogue routes after production deploys.
 *
 * Implements:
 *   - Git-diff driven route mapping from content/registry sources
 *   - Cluster-based route resolution for manual replay
 *   - Strict filtering excluding private app routes, redirect stubs, and non-canonical URLs
 *   - Batching and resilient submission to the IndexNow API
 *   - Markdown summary generation for GitHub Actions step summaries
 */
import {
  getClusterRoutes,
  getDiscoveryEntries,
} from "../content/discovery/registry";
import { listGovernedPaths } from "../content/discovery/governed-routes";
import { solutions } from "../config/seo-pages";
import { featuresConfig } from "../config/seo-features";
import { importsConfig } from "../config/seo-imports";
import { comparisons } from "../config/seo-comparisons";
import { getAllLandingPageSlugs } from "../content/for/registry";
import { getAllAnswerSlugs } from "../content/answers/registry";
import { getAllExampleSlugs } from "../content/examples/registry";
import { HUB_THEME_SLUGS } from "../content/hub-themes";
import { GENERATOR_SLUGS } from "../../params/generator_slug";
import { isDisallowedSitemapPath } from "./crawler-access";

export const DEFAULT_INDEXNOW_HOST = "codexcryptica.com";
export const DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const DEFAULT_INDEXNOW_KEY = "851cae8bbfd20e8381ba0b4e0260326c";
export const INDEXNOW_KEY_FILENAME = "851cae8bbfd20e8381ba0b4e0260326c.txt";

export const MAX_URLS_PER_BATCH = 10_000;
export const DEFAULT_BATCH_SIZE = 1_000;

/**
 * Known 301 redirect stubs that must never be submitted to IndexNow.
 * These exist for backwards compatibility but redirect to canonical generator routes.
 */
export const REDIRECT_STUBS = new Set([
  "/tools/dnd-npc-generator",
  "/tools/faction-generator",
  "/blog/presentation-templates",
]);

/**
 * High-level catalogue surfaces that must be notified whenever underlying
 * tools, generators, answers, or examples are added, updated, or removed.
 */
export const CATALOGUE_HUBS = [
  "/tools",
  "/generators",
  "/llms.txt",
  "/llms-full.txt",
  "/sitemap.xml",
] as const;

/** Additional static public text routes that are valid canonical targets. */
const STATIC_PUBLIC_ROUTES = new Set([
  "/",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/terms",
  "/privacy",
]);

export interface RouteMappingResult {
  candidateRoutes: string[];
  catalogueChanged: boolean;
}

/**
 * Maps a list of changed file paths (from a git diff or build manifest)
 * to canonical public discovery and content routes.
 */
export function mapChangedFilesToRoutes(
  changedFiles: string[],
): RouteMappingResult {
  const routes = new Set<string>();
  let catalogueChanged = false;

  for (const rawFile of changedFiles) {
    const file = rawFile.replace(/\\/g, "/").trim();
    if (!file) continue;

    // 1. Answers: apps/web/src/lib/content/answers/pages/<slug>.ts
    const answerMatch = file.match(
      /apps\/web\/src\/lib\/content\/answers\/pages\/([^/]+)\.ts$/,
    );
    if (answerMatch && answerMatch[1] !== "index") {
      routes.add(`/answers/${answerMatch[1]}`);
      routes.add("/answers");
      catalogueChanged = true;
      continue;
    }

    // 2. Examples: apps/web/src/lib/content/examples/pages/<slug>.ts
    const exampleMatch = file.match(
      /apps\/web\/src\/lib\/content\/examples\/pages\/([^/]+)\.ts$/,
    );
    if (exampleMatch && exampleMatch[1] !== "index") {
      routes.add(`/examples/${exampleMatch[1]}`);
      routes.add("/examples");
      catalogueChanged = true;
      continue;
    }

    // 3. For/Packs: apps/web/src/lib/content/for/packs/<slug>.ts
    const forMatch = file.match(
      /apps\/web\/src\/lib\/content\/for\/packs\/([^/]+)\.ts$/,
    );
    if (forMatch && forMatch[1] !== "index") {
      routes.add(`/for/${forMatch[1]}`);
      routes.add("/for");
      catalogueChanged = true;
      continue;
    }

    // 4. Topic Hubs: apps/web/src/lib/content/topics/<slug>.ts
    const topicMatch = file.match(
      /apps\/web\/src\/lib\/content\/topics\/([^/]+)\.ts$/,
    );
    if (topicMatch) {
      routes.add(`/topics/${topicMatch[1]}`);
      catalogueChanged = true;
      continue;
    }

    // 5. Tools & Generators: apps/web/src/routes/(marketing)/generators/[slug]/ or tools/[slug]/
    const genRouteMatch = file.match(
      /apps\/web\/src\/routes\/\(marketing\)\/generators\/([^/]+)\//,
    );
    if (genRouteMatch) {
      routes.add(`/generators/${genRouteMatch[1]}`);
      catalogueChanged = true;
      continue;
    }

    const toolRouteMatch = file.match(
      /apps\/web\/src\/routes\/\(marketing\)\/tools\/([^/]+)\//,
    );
    if (toolRouteMatch) {
      routes.add(`/tools/${toolRouteMatch[1]}`);
      catalogueChanged = true;
      continue;
    }

    // Generator engine packages: packages/generator-engine/src/<name>
    const genPkgMatch = file.match(
      /packages\/generator-engine\/src\/(?:public-)?([^/.-]+)/,
    );
    if (genPkgMatch) {
      routes.add(`/generators/${genPkgMatch[1]}`);
      catalogueChanged = true;
      continue;
    }

    // 6. Hub themes: apps/web/src/lib/content/hub-themes.ts
    if (file.includes("apps/web/src/lib/content/hub-themes.ts")) {
      routes.add("/generators");
      for (const slug of HUB_THEME_SLUGS) {
        routes.add(`/generators/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 7. Generator slugs parameter: apps/web/src/params/generator_slug.ts
    if (file.includes("apps/web/src/params/generator_slug.ts")) {
      routes.add("/generators");
      for (const slug of GENERATOR_SLUGS) {
        routes.add(`/generators/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 8. Answers registry: apps/web/src/lib/content/answers/registry.ts
    if (file.includes("apps/web/src/lib/content/answers/registry.ts")) {
      routes.add("/answers");
      for (const slug of getAllAnswerSlugs()) {
        routes.add(`/answers/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 9. Examples registry: apps/web/src/lib/content/examples/registry.ts
    if (file.includes("apps/web/src/lib/content/examples/registry.ts")) {
      routes.add("/examples");
      for (const slug of getAllExampleSlugs()) {
        routes.add(`/examples/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 10. For packs registry: apps/web/src/lib/content/for/registry.ts
    if (file.includes("apps/web/src/lib/content/for/registry.ts")) {
      routes.add("/for");
      for (const slug of getAllLandingPageSlugs()) {
        routes.add(`/for/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 11. Blog: apps/web/src/lib/content/blog/<slug>.md
    const blogMatch = file.match(
      /apps\/web\/src\/lib\/content\/blog\/([^/]+)\.md$/,
    );
    if (blogMatch) {
      routes.add(`/blog/${blogMatch[1]}`);
      routes.add("/blog");
      continue;
    }

    // 12. SEO Configs: solutions, features, comparisons, imports
    if (file.includes("apps/web/src/lib/config/seo-pages.ts")) {
      routes.add("/solutions");
      for (const slug of Object.keys(solutions)) {
        routes.add(`/solutions/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }
    if (file.includes("apps/web/src/lib/config/seo-features.ts")) {
      routes.add("/features");
      for (const slug of Object.keys(featuresConfig)) {
        routes.add(`/features/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }
    if (file.includes("apps/web/src/lib/config/seo-comparisons.ts")) {
      routes.add("/alternatives");
      for (const slug of Object.keys(comparisons)) {
        routes.add(`/vs/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }
    if (file.includes("apps/web/src/lib/config/seo-imports.ts")) {
      routes.add("/migrations");
      for (const slug of Object.keys(importsConfig)) {
        routes.add(`/import/${slug}`);
      }
      catalogueChanged = true;
      continue;
    }

    // 13. Discovery Governance & Registry: governed-routes.ts, registry.ts
    if (
      file.includes("apps/web/src/lib/content/discovery/governed-routes.ts") ||
      file.includes("apps/web/src/lib/content/discovery/registry.ts")
    ) {
      for (const path of listGovernedPaths()) {
        routes.add(path);
      }
      catalogueChanged = true;
      continue;
    }

    // 9. Static documentation and sitemap files
    if (file.endsWith("apps/web/static/llms.txt")) {
      routes.add("/llms.txt");
      continue;
    }
    if (
      file.endsWith("apps/web/static/llms-full.txt") ||
      file.includes("scripts/generate-llms-full.mjs")
    ) {
      routes.add("/llms-full.txt");
      continue;
    }
    if (
      file.endsWith("apps/web/static/sitemap.xml") ||
      file.includes("scripts/generate-sitemap.mjs")
    ) {
      routes.add("/sitemap.xml");
      continue;
    }

    // 10. General catalogue pages
    if (
      file.includes("apps/web/src/routes/(marketing)/tools/") ||
      file.includes("apps/web/src/routes/(marketing)/generators/")
    ) {
      catalogueChanged = true;
    }
    if (file.includes("apps/web/src/routes/(app)/explore/")) {
      routes.add("/explore");
    }
  }

  // If underlying catalogue changed, cascade high-level discovery hubs
  if (catalogueChanged) {
    for (const hub of CATALOGUE_HUBS) {
      routes.add(hub);
    }
  }

  return {
    candidateRoutes: [...routes].sort(),
    catalogueChanged,
  };
}

/**
 * Resolves all public canonical routes belonging to a given content cluster,
 * appending high-level catalogue surfaces for end-to-end replay (#3164).
 */
export function resolveClusterRoutes(clusterSlug: string): string[] {
  const clusterRoutes = getClusterRoutes(clusterSlug);
  const combined = new Set<string>([...clusterRoutes, ...CATALOGUE_HUBS]);
  return [...combined].sort();
}

export interface SkippedUrl {
  url: string;
  reason: string;
}

export interface FilterResult {
  validUrls: string[];
  skipped: SkippedUrl[];
}

/**
 * Validates and filters candidate routes or URLs:
 *   - Normalizes path separators and removes query/hash/trailing slashes
 *   - Rejects private/in-app paths (via isDisallowedSitemapPath)
 *   - Rejects 301 redirect stubs
 *   - Rejects non-production or staging host URLs
 *   - Deduplicates and returns canonical absolute URLs on the production host
 */
export function filterIndexableUrls(
  pathsOrUrls: string[],
  host = DEFAULT_INDEXNOW_HOST,
): FilterResult {
  const validSet = new Set<string>();
  const skipped: SkippedUrl[] = [];
  const governedSet = new Set(listGovernedPaths());

  for (const item of pathsOrUrls) {
    const raw = item.trim();
    if (!raw) continue;

    let pathname: string;

    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const parsed = new URL(raw);

        // Reject off-origin, preview, or staging URLs
        if (parsed.hostname !== host) {
          skipped.push({
            url: raw,
            reason: `Host "${parsed.hostname}" is not canonical production host "${host}"`,
          });
          continue;
        }
        pathname = parsed.pathname;
      } else {
        pathname = raw.startsWith("/") ? raw : `/${raw}`;
      }
    } catch {
      skipped.push({ url: raw, reason: "Malformed URL or pathname" });
      continue;
    }

    // Normalize path (no trailing slash except root)
    const normalizedPath =
      pathname === "/" ? "/" : pathname.replace(/\/+$/, "");

    // Check private app routes
    if (isDisallowedSitemapPath(normalizedPath)) {
      skipped.push({
        url: normalizedPath,
        reason: "Private in-app route (disallowed from search indexing)",
      });
      continue;
    }

    // Check redirect stubs
    if (REDIRECT_STUBS.has(normalizedPath)) {
      skipped.push({
        url: normalizedPath,
        reason: "301 redirect stub (not canonical content)",
      });
      continue;
    }

    // Check governed / static route validity
    const isGoverned = governedSet.has(normalizedPath);
    const isStatic = STATIC_PUBLIC_ROUTES.has(normalizedPath);
    if (!isGoverned && !isStatic) {
      // Check if it exists in discovery entries
      const inRegistry = getDiscoveryEntries().some(
        (e) => e.canonicalPath === normalizedPath && e.indexable,
      );
      if (!inRegistry) {
        skipped.push({
          url: normalizedPath,
          reason: "Unknown or non-indexable route (not in discovery registry)",
        });
        continue;
      }
    }

    validSet.add(`https://${host}${normalizedPath}`);
  }

  return {
    validUrls: [...validSet].sort(),
    skipped,
  };
}

export interface IndexNowSubmitOptions {
  host?: string;
  key?: string;
  keyLocation?: string;
  endpoint?: string;
  batchSize?: number;
  dryRun?: boolean;
  fetchFn?: typeof fetch;
}

export interface IndexNowBatchResult {
  batchNumber: number;
  urlCount: number;
  status: number;
  statusText: string;
  success: boolean;
  message?: string;
}

export interface IndexNowResult {
  host: string;
  key: string;
  keyLocation: string;
  dryRun: boolean;
  submittedUrls: string[];
  skippedUrls: SkippedUrl[];
  batches: IndexNowBatchResult[];
  overallSuccess: boolean;
}

/**
 * Submits canonical URLs to the IndexNow API in batches.
 */
export async function submitToIndexNow(
  urls: string[],
  options: IndexNowSubmitOptions = {},
): Promise<IndexNowResult> {
  const host = options.host || DEFAULT_INDEXNOW_HOST;
  const key = options.key || process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  const keyLocation =
    options.keyLocation || `https://${host}/${INDEXNOW_KEY_FILENAME}`;
  const endpoint = options.endpoint || DEFAULT_INDEXNOW_ENDPOINT;
  const rawBatchSize = options.batchSize;
  const batchSize = Math.max(
    1,
    Math.min(
      typeof rawBatchSize === "number" &&
        Number.isFinite(rawBatchSize) &&
        rawBatchSize > 0
        ? Math.floor(rawBatchSize)
        : DEFAULT_BATCH_SIZE,
      MAX_URLS_PER_BATCH,
    ),
  );
  const dryRun = Boolean(options.dryRun);
  const fetchFn = options.fetchFn || fetch;

  const { validUrls, skipped } = filterIndexableUrls(urls, host);

  if (validUrls.length === 0 || dryRun) {
    return {
      host,
      key,
      keyLocation,
      dryRun,
      submittedUrls: validUrls,
      skippedUrls: skipped,
      batches:
        validUrls.length > 0
          ? [
              {
                batchNumber: 1,
                urlCount: validUrls.length,
                status: 200,
                statusText: "Dry Run",
                success: true,
                message: "Dry run completed without sending HTTP requests.",
              },
            ]
          : [],
      overallSuccess: true,
    };
  }

  const batches: IndexNowBatchResult[] = [];
  let overallSuccess = true;

  for (let i = 0; i < validUrls.length; i += batchSize) {
    const chunk = validUrls.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    const payload = {
      host,
      key,
      keyLocation,
      urlList: chunk,
    };

    try {
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const success = res.status === 200 || res.status === 202;
      if (!success) {
        overallSuccess = false;
      }

      let errorDetail = "";
      if (!success) {
        try {
          const bodyText = await res.text();
          errorDetail = bodyText ? ` - ${bodyText}` : "";
        } catch {
          // Ignore body read failure on error response
        }
      }

      batches.push({
        batchNumber,
        urlCount: chunk.length,
        status: res.status,
        statusText: res.statusText,
        success,
        message: success
          ? `Submitted ${chunk.length} URL(s) successfully.`
          : `IndexNow API returned status ${res.status} (${res.statusText})${errorDetail}`,
      });
    } catch (err: unknown) {
      overallSuccess = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      batches.push({
        batchNumber,
        urlCount: chunk.length,
        status: 0,
        statusText: "Network Error",
        success: false,
        message: `Network error connecting to IndexNow endpoint: ${errorMsg}`,
      });
    }
  }

  return {
    host,
    key,
    keyLocation,
    dryRun: false,
    submittedUrls: validUrls,
    skippedUrls: skipped,
    batches,
    overallSuccess,
  };
}

/**
 * Generates a clean Markdown summary of the IndexNow submission
 * formatted for GitHub Actions step summaries.
 */
export function formatIndexNowStepSummary(result: IndexNowResult): string {
  const lines: string[] = [];

  const statusBadge = result.dryRun
    ? "🟡 **DRY RUN** (No requests sent)"
    : result.overallSuccess
      ? "🟢 **SUCCESS** (Submitted to IndexNow)"
      : "🔴 **FAILURE / WARNING** (IndexNow reported error)";

  lines.push(`## IndexNow Discovery Notification`);
  lines.push("");
  lines.push(`**Status**: ${statusBadge}`);
  lines.push(`- **Host**: \`${result.host}\``);
  lines.push(
    `- **Key Location**: [${result.keyLocation}](${result.keyLocation})`,
  );
  lines.push(`- **Candidate URLs Submitted**: ${result.submittedUrls.length}`);
  lines.push(`- **Non-indexable URLs Skipped**: ${result.skippedUrls.length}`);
  lines.push("");

  if (result.batches.length > 0) {
    lines.push("### Submission Batches");
    lines.push("");
    lines.push("| Batch | Count | HTTP Status | Outcome |");
    lines.push("|:-----:|:-----:|:-----------:|:--------|");
    for (const b of result.batches) {
      const outcome = b.success ? "✅ Accepted" : `❌ ${b.message || "Failed"}`;
      lines.push(
        `| #${b.batchNumber} | ${b.urlCount} | ${b.status || "N/A"} (${b.statusText}) | ${outcome} |`,
      );
    }
    lines.push("");
  }

  if (result.submittedUrls.length > 0) {
    lines.push("<details>");
    lines.push(
      `<summary><strong>Submitted Canonical URLs (${result.submittedUrls.length})</strong></summary>`,
    );
    lines.push("");
    for (const url of result.submittedUrls) {
      lines.push(`- [${url}](${url})`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  if (result.skippedUrls.length > 0) {
    lines.push("<details>");
    lines.push(
      `<summary><strong>Skipped URLs (${result.skippedUrls.length})</strong></summary>`,
    );
    lines.push("");
    lines.push("| URL | Reason |");
    lines.push("|:---|:---|");
    for (const s of result.skippedUrls) {
      lines.push(`| \`${s.url}\` | ${s.reason} |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}
