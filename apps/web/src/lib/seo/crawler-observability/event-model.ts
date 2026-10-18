/**
 * Event Model & Privacy Sanitisation for Crawler Observability (#2864).
 *
 * Enforces strict low-cardinality values and guarantees zero PII logging:
 * - Query strings are discarded
 * - Client IP addresses are never recorded
 * - Headers, auth cookies, prompts, and vault content are completely excluded
 */

import type { AgentType, AiProvider } from "./agent-taxonomy";
import { normalizePath } from "./cluster-mapping";
import type { VerificationMethod } from "./verification";

export interface AiCrawlerEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  provider: AiProvider;
  agent: string;
  agentType: AgentType;
  verified: boolean;
  verificationMethod: VerificationMethod;
  /** Sanitised root-relative path without query string or hash */
  path: string;
  /** HTTP response status code */
  responseStatus: number;
  /** Edge cache outcome (HIT, MISS, DYNAMIC, BYPASS, etc.) */
  cacheStatus: string;
  primaryContentCluster: string | null;
  contentClusters: string[];
  /** 2-letter ISO country code, coarse and privacy-safe */
  country: string | null;
}

export interface RawCrawlerRequestData {
  url: string;
  userAgent?: string | null;
  clientIp?: string | null;
  responseStatus: number;
  cacheStatus?: string | null;
  country?: string | null;
  timestamp?: string;
}

/**
 * Sanitise and normalize cache status string from CF-Cache-Status header.
 */
export function sanitizeCacheStatus(rawHeader?: string | null): string {
  if (!rawHeader) return "UNKNOWN";
  const clean = rawHeader.trim().toUpperCase();
  const allowed = [
    "HIT",
    "MISS",
    "BYPASS",
    "EXPIRED",
    "STALE",
    "UPDATING",
    "REVALIDATED",
    "DYNAMIC",
  ];
  return allowed.includes(clean) ? clean : "UNKNOWN";
}

/**
 * Sanitise country code to coarse 2-letter ISO code or null.
 */
export function sanitizeCountryCode(rawCountry?: string | null): string | null {
  if (!rawCountry || typeof rawCountry !== "string") return null;
  const clean = rawCountry.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Cloudflare Workers Analytics Engine data point shape.
 */
export interface AnalyticsEngineDataPoint {
  indexes?: string[];
  blobs?: (string | null | undefined)[];
  doubles?: (number | null | undefined)[];
}

/**
 * Convert an AiCrawlerEvent into a Cloudflare Workers Analytics Engine data point.
 *
 * Layout:
 * - indexes: [provider]
 * - blobs: [provider, agentType, primaryCluster ?? "none", path, cacheStatus, country ?? "XX", agent, verificationMethod]
 * - doubles: [responseStatus, verified ? 1 : 0]
 */
export function toAnalyticsEngineDataPoint(
  event: AiCrawlerEvent,
): AnalyticsEngineDataPoint {
  return {
    indexes: [event.provider],
    blobs: [
      event.provider,
      event.agentType,
      event.primaryContentCluster ?? "none",
      normalizePath(event.path),
      event.cacheStatus,
      event.country ?? "XX",
      event.agent,
      event.verificationMethod,
    ],
    doubles: [event.responseStatus, event.verified ? 1 : 0],
  };
}
