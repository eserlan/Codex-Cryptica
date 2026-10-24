/**
 * Classifies ordinary web-search referrals (#4372).
 *
 * Only the search engine's name is retained. Referrer paths, query strings
 * and fragments never leave this classifier, so the search terms a visitor
 * used are not recorded. AI-assistant referrals (including
 * gemini.google.com) are classified by ai-referral.ts, which callers must
 * consult first; this module only recognises engines' own search hosts.
 */

export type SearchEngine =
  "google" | "bing" | "duckduckgo" | "yahoo" | "ecosia" | "brave";

export interface SearchReferral {
  channel: "organic_search";
  search_engine: SearchEngine;
}

const SEARCH_HOSTS: readonly { engine: SearchEngine; match: RegExp }[] = [
  // google.com, www.google.com, google.co.uk … but not mail.google.com,
  // docs.google.com or gemini.google.com.
  { engine: "google", match: /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/ },
  { engine: "bing", match: /^(www\.)?bing\.com$/ },
  { engine: "duckduckgo", match: /^(www\.)?duckduckgo\.com$/ },
  { engine: "yahoo", match: /^([a-z]{2}\.)?search\.yahoo\.com$/ },
  { engine: "ecosia", match: /^(www\.)?ecosia\.org$/ },
  { engine: "brave", match: /^search\.brave\.com$/ },
];

/**
 * Returns the search engine for an external search-results referrer, or null.
 * Same-origin, unparseable and non-http(s) referrers are not search referrals.
 * A tagged landing URL (any `utm_source`) is a deliberate campaign link and
 * is left to its UTM attribution.
 */
export function classifySearchReferral(
  landingUrl: URL,
  referrer?: string,
): SearchReferral | null {
  if (!referrer || landingUrl.searchParams.get("utm_source")) return null;

  try {
    const referrerUrl = new URL(referrer);
    if (!/^https?:$/.test(referrerUrl.protocol)) return null;
    if (referrerUrl.origin === landingUrl.origin) return null;
    const hostname = referrerUrl.hostname.toLowerCase();
    const rule = SEARCH_HOSTS.find((entry) => entry.match.test(hostname));
    return rule
      ? { channel: "organic_search", search_engine: rule.engine }
      : null;
  } catch {
    return null;
  }
}
