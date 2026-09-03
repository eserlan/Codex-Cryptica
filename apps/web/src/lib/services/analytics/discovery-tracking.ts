/**
 * Discovery-page engagement tracking (#2687) — extends the existing Zaraz
 * pipeline (#1796) to the public search/discovery surfaces (/answers,
 * /examples, /for, comparison pages, ...) so we can see which of them
 * actually move a visitor toward a generator or the app, not just how many
 * page views Cloudflare Web Analytics reports.
 *
 * This module never talks to `window.zaraz` directly — every event goes
 * through `trackEvent()` in zaraz-analytics.ts, so it inherits that
 * function's fail-silent behaviour and attribution merge for free. See
 * docs/devops/ZARAZ_ANALYTICS.md for the full event contract and the
 * privacy boundary this must stay inside (no prompts, generated output,
 * entity titles, vault names, or other user-authored content — only public
 * page identifiers, destination categories/paths, and placement metadata).
 */

import { trackEvent } from "./zaraz-analytics";

export type DiscoverySourceKind =
  | "answer"
  | "example"
  | "for"
  | "comparison"
  | "alternative"
  | "importer"
  | "blog"
  | "tools"
  | "other";

export type DiscoveryTargetKind =
  | "generator"
  | "app"
  | "answer"
  | "example"
  | "for"
  | "comparison"
  | "importer"
  | "external";

export interface DiscoveryPageViewedInput {
  sourceKind: DiscoverySourceKind;
  /** Stable slug or other non-sensitive page identifier — never free text. */
  sourceId: string;
  path: string;
}

export interface DiscoveryClickInput {
  sourceKind: DiscoverySourceKind;
  sourceId: string;
  targetKind: DiscoveryTargetKind;
  targetId: string;
  /** Where on the page the link lives, e.g. "related_tool", "codex_connection". */
  placement: string;
}

/** Emits `discovery_page_viewed` for a supported discovery page. */
export function trackDiscoveryPageViewed(
  input: DiscoveryPageViewedInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent(
    "discovery_page_viewed",
    {
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      path: input.path,
    },
    win,
  );
}

/** Emits `discovery_click` for a meaningful discovery-page link/CTA. */
export function trackDiscoveryClick(
  input: DiscoveryClickInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent(
    "discovery_click",
    {
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      target_kind: input.targetKind,
      target_id: input.targetId,
      placement: input.placement,
    },
    win,
  );
}

const TARGET_KIND_BY_SEGMENT: Record<string, DiscoveryTargetKind> = {
  generators: "generator",
  answers: "answer",
  examples: "example",
  for: "for",
  vs: "comparison",
  alternatives: "comparison",
  import: "importer",
  migrations: "importer",
};

/**
 * Classifies a root-relative link href into a `{ targetKind, targetId }`
 * pair for `discovery_click`, for the free-form links content authors write
 * (e.g. `codexConnection.href`, prose-section CTAs) where the destination
 * isn't already known from which content-collection list the link came
 * from. Anything that isn't one of the discovery-page families above (e.g.
 * `/solutions/...`, `/features/...`) is treated as `"app"` — a deeper
 * product page rather than another discovery page. An absolute URL (a
 * third-party CTA such as an affiliate/community link) is `"external"`.
 */
export function classifyDiscoveryTarget(href: string): {
  targetKind: DiscoveryTargetKind;
  targetId: string;
} {
  if (/^https?:\/\//i.test(href)) {
    return { targetKind: "external", targetId: href };
  }

  const path = href.split("?")[0]?.split("#")[0] ?? href;
  const segments = path.split("/").filter(Boolean);
  const [first, second] = segments;
  const targetKind = (first && TARGET_KIND_BY_SEGMENT[first]) || "app";
  const targetId = second ?? (path || "/");

  return { targetKind, targetId };
}

/**
 * Dedupe guard for `discovery_page_viewed`. SvelteKit reuses the same page
 * component instance across client-side navigations between two pages of
 * the same dynamic route (e.g. /answers/a -> /answers/b) — only the route's
 * `load` data changes, nothing remounts — so a plain onMount()-style guard
 * would only ever fire once, for the first slug visited. Each returned
 * guard tracks the last id it reported for, so a `$effect` keyed off page
 * data can fire exactly once per distinct page (including across that kind
 * of in-place navigation) without double-firing on unrelated reactive
 * churn, e.g. hydration re-running the same effect for the same slug.
 */
export function createDiscoveryViewGuard(): (id: string) => boolean {
  let lastId: string | undefined;
  return (id: string) => {
    if (id === lastId) return false;
    lastId = id;
    return true;
  };
}
