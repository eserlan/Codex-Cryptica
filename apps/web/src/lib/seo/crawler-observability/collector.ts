/**
 * Server-Side AI Crawler Observability Collector (#2864).
 *
 * Coordinates taxonomy classification, anti-spoofing verification, content cluster
 * resolution, privacy sanitisation, and telemetry emission.
 *
 * Guarantees fail-silent operation: errors never block or disrupt page delivery.
 */

import {
  classifyUserAgent,
  isPotentialAiAgent,
  type AgentClassification,
} from "./agent-taxonomy";
import {
  resolvePathCluster,
  type PathClusterMetadata,
} from "./cluster-mapping";
import {
  sanitizeCacheStatus,
  sanitizeCountryCode,
  toAnalyticsEngineDataPoint,
  type AiCrawlerEvent,
  type AnalyticsEngineDataPoint,
} from "./event-model";
import {
  verifyAiCrawler,
  type CloudflareCfProperties,
  type VerificationResult,
} from "./verification";

export interface TelemetrySink {
  recordEvent(event: AiCrawlerEvent): Promise<void> | void;
}

export interface AnalyticsEngineBinding {
  writeDataPoint(point: AnalyticsEngineDataPoint): void;
}

export interface CollectorContext {
  clientIp?: string | null;
  cf?: CloudflareCfProperties | null;
  analyticsEngine?: AnalyticsEngineBinding | null;
  sinks?: TelemetrySink[];
  now?: () => string;
}

/**
 * Process an incoming request and its response to determine if it is a relevant
 * AI crawler or user-triggered fetch. If relevant, constructs an AiCrawlerEvent
 * and emits it to configured telemetry sinks.
 *
 * Returns the generated AiCrawlerEvent, or null if the request is not from an AI agent.
 */
export async function collectCrawlerTelemetry(
  requestUrl: string,
  userAgent: string | null | undefined,
  responseStatus: number,
  responseHeaders?: Headers | Record<string, string> | null,
  context?: CollectorContext,
): Promise<AiCrawlerEvent | null> {
  try {
    // 1. Fast pre-check: skip human traffic quickly
    if (!isPotentialAiAgent(userAgent)) {
      return null;
    }

    // 2. Controlled taxonomy classification
    const agentMatch: AgentClassification | null = classifyUserAgent(userAgent);
    if (!agentMatch) {
      return null;
    }

    // 3. Anti-spoofing verification
    const verification: VerificationResult = verifyAiCrawler(
      agentMatch.agentName,
      context?.clientIp,
      context?.cf,
    );

    // 4. Content cluster resolution
    const clusterMeta: PathClusterMetadata = resolvePathCluster(requestUrl);

    // 5. Extract edge metadata
    let rawCacheStatus: string | null = null;
    if (responseHeaders) {
      if (typeof (responseHeaders as Headers).get === "function") {
        rawCacheStatus = (responseHeaders as Headers).get("cf-cache-status");
      } else {
        const h = responseHeaders as Record<string, string>;
        rawCacheStatus = h["cf-cache-status"] || h["CF-Cache-Status"] || null;
      }
    }

    const timestamp = context?.now ? context.now() : new Date().toISOString();
    const cleanCountry = sanitizeCountryCode(context?.cf?.country);
    const cleanCache = sanitizeCacheStatus(rawCacheStatus);

    // 6. Build the sanitized event (zero PII, no IP stored, no query string)
    const event: AiCrawlerEvent = {
      timestamp,
      provider: agentMatch.provider,
      agent: agentMatch.agentName,
      agentType: agentMatch.agentType,
      verified: verification.verified,
      verificationMethod: verification.method,
      path: resolveCleanPathname(requestUrl),
      responseStatus,
      cacheStatus: cleanCache,
      primaryContentCluster: clusterMeta.primaryContentCluster,
      contentClusters: clusterMeta.contentClusters,
      country: cleanCountry,
    };

    // 7. Emit to sinks (fail-silent)
    await emitTelemetry(event, context);

    return event;
  } catch (err) {
    // Deliberate fail-silent: never allow telemetry to break public page delivery.
    // `process` is undefined in the Cloudflare Workers/Pages runtime, so guard access.
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV === "development"
    ) {
      console.warn("[CrawlerObservability] Fail-silent collection error:", err);
    }
    return null;
  }
}

/**
 * Extract clean pathname without query string or hash.
 */
function resolveCleanPathname(rawUrl: string): string {
  try {
    if (rawUrl.includes("://")) {
      return new URL(rawUrl).pathname || "/";
    }
    const [path] = rawUrl.split(/[?#]/);
    return path || "/";
  } catch {
    return rawUrl.split(/[?#]/)[0] || "/";
  }
}

/**
 * Emit event to Analytics Engine and configured sinks.
 */
async function emitTelemetry(
  event: AiCrawlerEvent,
  context?: CollectorContext,
): Promise<void> {
  // Workers Analytics Engine binding
  if (context?.analyticsEngine?.writeDataPoint) {
    try {
      const dataPoint = toAnalyticsEngineDataPoint(event);
      context.analyticsEngine.writeDataPoint(dataPoint);
    } catch {
      // ignore
    }
  }

  // Custom sinks (e.g., test sinks, file sinks, or structured loggers)
  if (context?.sinks && context.sinks.length > 0) {
    await Promise.allSettled(
      context.sinks.map(async (sink) => {
        try {
          await sink.recordEvent(event);
        } catch {
          // ignore
        }
      }),
    );
  }
}
