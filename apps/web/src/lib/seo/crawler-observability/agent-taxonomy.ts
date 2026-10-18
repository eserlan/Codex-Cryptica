/**
 * AI Crawler & Fetcher Agent Taxonomy (#2864).
 *
 * Controlled vocabulary for classifying server-side crawler and fetcher requests.
 * Distinguishes search discovery, user-triggered prompt fetches, and training crawlers.
 */

export const AI_PROVIDERS = [
  "openai",
  "perplexity",
  "microsoft",
  "google",
  "anthropic",
  "other",
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AGENT_TYPES = [
  "search_crawler",
  "user_fetch",
  "training_crawler",
  "unknown",
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export interface AgentClassification {
  provider: AiProvider;
  agentName: string;
  agentType: AgentType;
}

export interface AgentDefinition {
  agentName: string;
  provider: AiProvider;
  agentType: AgentType;
  /** Substring or regex to test against user-agent header */
  matcher: RegExp | string;
}

/**
 * Controlled taxonomy of recognised AI crawlers and fetchers.
 * Ordering matters: more specific agents (e.g. user fetchers) are checked before generic crawlers.
 */
export const RECOGNISED_AGENTS: readonly AgentDefinition[] = [
  // OpenAI
  {
    agentName: "ChatGPT-User",
    provider: "openai",
    agentType: "user_fetch",
    matcher: /ChatGPT-User/i,
  },
  {
    agentName: "OAI-SearchBot",
    provider: "openai",
    agentType: "search_crawler",
    matcher: /OAI-SearchBot/i,
  },
  {
    agentName: "GPTBot",
    provider: "openai",
    agentType: "training_crawler",
    matcher: /GPTBot/i,
  },

  // Perplexity
  {
    agentName: "Perplexity-User",
    provider: "perplexity",
    agentType: "user_fetch",
    matcher: /Perplexity-User/i,
  },
  {
    agentName: "PerplexityBot",
    provider: "perplexity",
    agentType: "search_crawler",
    matcher: /PerplexityBot/i,
  },

  // Microsoft / Bing
  {
    agentName: "Copilot-User",
    provider: "microsoft",
    agentType: "user_fetch",
    matcher: /Copilot-User|Microsoft-User/i,
  },
  {
    agentName: "bingbot",
    provider: "microsoft",
    agentType: "search_crawler",
    matcher: /bingbot/i,
  },

  // Google
  {
    agentName: "Google-Cloud-VertexBot",
    provider: "google",
    agentType: "user_fetch",
    matcher: /Google-Cloud-VertexBot/i,
  },
  {
    agentName: "Google-Extended",
    provider: "google",
    agentType: "training_crawler",
    matcher: /Google-Extended/i,
  },
  {
    agentName: "Googlebot",
    provider: "google",
    agentType: "search_crawler",
    matcher: /Googlebot/i,
  },

  // Anthropic
  {
    agentName: "Claude-Web",
    provider: "anthropic",
    agentType: "user_fetch",
    matcher: /Claude-Web|Claude-User/i,
  },
  {
    agentName: "ClaudeBot",
    provider: "anthropic",
    agentType: "training_crawler",
    matcher: /ClaudeBot|Anthropic-AI/i,
  },
] as const;

/**
 * Fast pre-check to determine if a User-Agent might be an AI agent.
 * Avoids heavier regex evaluation on typical human browser traffic.
 */
export function isPotentialAiAgent(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent || typeof userAgent !== "string") return false;
  return /bot|crawler|spider|oai|chatgpt|perplexity|bing|google|claude|anthropic|vertex/i.test(
    userAgent,
  );
}

/**
 * Classify a User-Agent string against the controlled taxonomy.
 * Returns null if the user agent is not a recognised AI agent.
 */
export function classifyUserAgent(
  userAgent: string | null | undefined,
): AgentClassification | null {
  if (!userAgent || typeof userAgent !== "string") return null;

  for (const def of RECOGNISED_AGENTS) {
    const matches =
      typeof def.matcher === "string"
        ? userAgent.toLowerCase().includes(def.matcher.toLowerCase())
        : def.matcher.test(userAgent);

    if (matches) {
      return {
        provider: def.provider,
        agentName: def.agentName,
        agentType: def.agentType,
      };
    }
  }

  return null;
}
