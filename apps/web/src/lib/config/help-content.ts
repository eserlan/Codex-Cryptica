/**
 * Static content for the Help and Guide System.
 * Bundled with the application to ensure 100% offline availability.
 */

import { loadHelpArticles, type HelpArticle } from "#lib/content/loader.js";

export type { HelpArticle };

export { ONBOARDING_TOUR, type GuideStep } from "./help-onboarding-tour";
export { COACH_MARKS, type CoachMark } from "./help-coach-marks";
export { FEATURE_HELP_ARTICLES } from "./help-feature-links";
export {
  FEATURE_HINTS,
  HINT_KEYS,
  type FeatureHint,
} from "./help-feature-hints";

let _cachedHelpArticles: HelpArticle[] | null = null;

export function getHelpArticles(): HelpArticle[] {
  if (!_cachedHelpArticles) {
    try {
      _cachedHelpArticles = loadHelpArticles();
    } catch (e) {
      console.error("Failed to load help articles:", e);
      _cachedHelpArticles = [];
    }
  }
  return _cachedHelpArticles;
}

export const HELP_ARTICLES: HelpArticle[] = new Proxy([] as HelpArticle[], {
  get(_target, prop, receiver) {
    const articles = getHelpArticles();
    const val = Reflect.get(articles, prop, receiver);
    return typeof val === "function" ? val.bind(articles) : val;
  },
  has(_target, prop) {
    return Reflect.has(getHelpArticles(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getHelpArticles());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getHelpArticles(), prop);
  },
});
