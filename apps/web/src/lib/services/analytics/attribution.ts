/**
 * First/latest-touch UTM attribution persistence (#1796).
 *
 * Marketing links tag visitors with utm_source/utm_medium/utm_campaign. This
 * captures that into localStorage the moment a tagged URL is seen, so it
 * survives navigation away from the landing URL and can be attached to later
 * funnel events (see zaraz-analytics.ts, generator-save-tracking.ts).
 *
 * First-touch is write-once: the first attributed visit this browser ever
 * had is preserved forever. Latest-touch always reflects the most recent
 * attributed visit. Both are stored separately so "what originally brought
 * this visitor here" and "what brought them back today" can both be asked.
 *
 * Scope: this module is only ever wired from the (marketing) route group
 * (see (marketing)/+layout.svelte) — it has no callers inside the actual app.
 */

import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_path: string;
  at: number;
}

const FIRST_TOUCH_KEY = "codex-cryptica-attribution-first";
const LATEST_TOUCH_KEY = "codex-cryptica-attribution-latest";

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign"] as const;

function readAttribution(
  storage: StorageLike,
  key: string,
): Attribution | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.at === "number") {
      return parsed as Attribution;
    }
  } catch {
    // corrupt/unavailable storage — treat as no attribution
  }
  return null;
}

function writeAttribution(
  storage: StorageLike,
  key: string,
  attribution: Attribution,
) {
  try {
    storage.setItem(key, JSON.stringify(attribution));
  } catch {
    // storage unavailable (private mode / quota) — best-effort only
  }
}

export class AttributionStore {
  private storage: StorageLike;
  private now: () => number;

  constructor(deps: { storage?: StorageLike; now?: () => number } = {}) {
    this.storage = deps.storage ?? browserStorage;
    this.now = deps.now ?? Date.now;
  }

  /**
   * Reads utm_* params off `url` and persists them as latest-touch (and, if
   * none exists yet, as first-touch too). No-ops entirely — including no
   * write to latest-touch — if the URL carries no utm_* param at all, so an
   * un-attributed page view never overwrites a real attributed one.
   *
   * Returns true if this call actually captured (new) attribution.
   */
  captureIfAttributed(url: URL): boolean {
    const hasAnyUtm = UTM_PARAMS.some((p) => url.searchParams.has(p));
    if (!hasAnyUtm) return false;

    const attribution: Attribution = {
      landing_path: url.pathname,
      at: this.now(),
    };
    for (const param of UTM_PARAMS) {
      const value = url.searchParams.get(param);
      if (value) attribution[param] = value;
    }

    writeAttribution(this.storage, LATEST_TOUCH_KEY, attribution);
    if (!readAttribution(this.storage, FIRST_TOUCH_KEY)) {
      writeAttribution(this.storage, FIRST_TOUCH_KEY, attribution);
    }
    return true;
  }

  getFirstTouch(): Attribution | null {
    return readAttribution(this.storage, FIRST_TOUCH_KEY);
  }

  getLatestTouch(): Attribution | null {
    return readAttribution(this.storage, LATEST_TOUCH_KEY);
  }

  /** Clears both stored attributions. Primarily for tests. */
  reset() {
    try {
      this.storage.removeItem(FIRST_TOUCH_KEY);
      this.storage.removeItem(LATEST_TOUCH_KEY);
    } catch {
      // ignore
    }
  }
}

/** Shared singleton used by the app; tests can construct their own instance. */
export const attributionStore = new AttributionStore();
