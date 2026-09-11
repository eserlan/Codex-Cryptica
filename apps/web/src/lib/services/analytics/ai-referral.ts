/**
 * Classifies only explicit AI-assistant acquisition signals.
 *
 * Generic Google/Bing search referrals are intentionally excluded: a browser
 * referrer cannot distinguish an AI answer from an ordinary search result.
 * Referrer paths, query strings and fragments never leave this classifier.
 */

export type AiReferralProvider =
  "openai" | "perplexity" | "microsoft" | "anthropic" | "google";

export type AiReferralSource =
  "chatgpt" | "perplexity" | "copilot" | "claude" | "gemini";

export interface AiReferral {
  channel: "ai_referral";
  provider: AiReferralProvider;
  source: AiReferralSource;
}

interface ReferralRule extends AiReferral {
  utmValues: readonly string[];
  hostnames: readonly string[];
}

const REFERRAL_RULES: readonly ReferralRule[] = [
  {
    channel: "ai_referral",
    provider: "openai",
    source: "chatgpt",
    utmValues: ["chatgpt", "chatgpt.com"],
    hostnames: ["chatgpt.com", "chat.openai.com"],
  },
  {
    channel: "ai_referral",
    provider: "perplexity",
    source: "perplexity",
    utmValues: ["perplexity", "perplexity.ai"],
    hostnames: ["perplexity.ai"],
  },
  {
    channel: "ai_referral",
    provider: "microsoft",
    source: "copilot",
    utmValues: ["copilot", "copilot.microsoft.com", "bing-ai"],
    hostnames: ["copilot.microsoft.com"],
  },
  {
    channel: "ai_referral",
    provider: "anthropic",
    source: "claude",
    utmValues: ["claude", "claude.ai"],
    hostnames: ["claude.ai"],
  },
  {
    channel: "ai_referral",
    provider: "google",
    source: "gemini",
    utmValues: ["gemini", "gemini.google.com"],
    hostnames: ["gemini.google.com"],
  },
];

function normaliseSource(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function matchesHostname(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

function ruleForUtmSource(value: string | null): ReferralRule | undefined {
  if (!value) return undefined;
  const source = normaliseSource(value);
  return REFERRAL_RULES.find((rule) => rule.utmValues.includes(source));
}

function ruleForReferrer(
  referrer: string | undefined,
  landingUrl: URL,
): ReferralRule | undefined {
  if (!referrer) return undefined;

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.origin === landingUrl.origin) return undefined;
    return REFERRAL_RULES.find((rule) =>
      rule.hostnames.some((hostname) =>
        matchesHostname(referrerUrl.hostname.toLowerCase(), hostname),
      ),
    );
  } catch {
    return undefined;
  }
}

function toReferral(rule: ReferralRule): AiReferral {
  return {
    channel: rule.channel,
    provider: rule.provider,
    source: rule.source,
  };
}

/** Classifies an explicit AI UTM source before falling back to the referrer. */
export function classifyAiReferral(
  landingUrl: URL,
  referrer?: string,
): AiReferral | null {
  const rule =
    ruleForUtmSource(landingUrl.searchParams.get("utm_source")) ??
    ruleForReferrer(referrer, landingUrl);
  return rule ? toReferral(rule) : null;
}
