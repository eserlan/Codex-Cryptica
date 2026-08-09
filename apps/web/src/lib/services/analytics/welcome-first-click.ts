/**
 * Which control a first-time visitor chooses on the welcome screen.
 *
 * ## Why this exists at all
 *
 * The welcome screen is the only marketing surface that lives at an app route
 * (`/`), and the analytics boundary this codebase draws is by route group:
 * `zaraz-analytics.ts` is wired from `(marketing)` only, and the marketing
 * layout tears its bridge down on the way into the app. That is deliberate,
 * and it means the onboarding funnel's six steps never leave the browser.
 *
 * So the welcome screen fell into a gap: it is a landing page by every measure
 * that matters (80% of visits arrive directly, it is 38% of all page views),
 * but it was instrumented like app internals, which is to say not at all. We
 * could not answer the simplest question about it: of the five things a
 * visitor can do here, which do they pick?
 *
 * ## What this deliberately does not do
 *
 * It records one event, naming one of five controls, once per visitor, and
 * then stops. It carries no vault name, no entity, no content, no count of
 * anything the user has written, because at this moment none of that exists
 * yet. It does not initialise the analytics bridge inside the app, so the
 * onboarding funnel stays local-only exactly as before. Everything after the
 * click remains untracked.
 *
 * If that ever stops being true, this file is the wrong place to put it.
 */

import { trackEvent } from "./zaraz-analytics";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

/** The five things a visitor can do on the welcome screen. */
export const WELCOME_ACTIONS = [
  "graph_preview",
  "quick_start",
  "demo",
  "open_vault",
  "themed_demo",
] as const;

export type WelcomeAction = (typeof WELCOME_ACTIONS)[number];

const STORAGE_KEY = "codex-cryptica-welcome-first-click";

interface Deps {
  storage?: Pick<StorageLike, "getItem" | "setItem">;
  track?: typeof trackEvent;
}
/**
 * Records the visitor's *first* choice on the welcome screen and nothing after.
 *
 * "First click" is the measure, so a second click never overwrites the first:
 * a visitor who tries the demo, comes back, and then runs Quick Start chose
 * the demo, and averaging that away would answer a different question.
 *
 * Returns whether an event was emitted, which is what the tests assert on.
 */
export function trackWelcomeFirstClick(
  action: WelcomeAction,
  deps: Deps = {},
): boolean {
  const storage = deps.storage ?? browserStorage;
  const track = deps.track ?? trackEvent;

  try {
    if (storage?.getItem(STORAGE_KEY)) return false;
    storage?.setItem(STORAGE_KEY, action);
  } catch {
    // A failed write means we may double-count this visitor later. That is a
    // better failure than dropping the event, so carry on and emit.
  }

  try {
    track("welcome_first_click", { action });
    return true;
  } catch {
    // Analytics must never break the button the visitor just pressed.
    return false;
  }
}

/** Test seam: forget that this visitor has already chosen. */
export function resetWelcomeFirstClick(
  storage: Pick<StorageLike, "removeItem"> = browserStorage,
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
