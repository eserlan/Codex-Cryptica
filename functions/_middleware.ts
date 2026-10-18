/**
 * Cloudflare Pages Middleware for AI Crawler & Fetcher Observability (#2864).
 *
 * Intercepts incoming requests at the Cloudflare edge to record verified crawler
 * activity and user-triggered prompt fetches by content cluster.
 *
 * Runs fail-silent: any error inside the middleware is caught and ignored so public
 * page delivery is never blocked or delayed.
 */

import {
  collectCrawlerTelemetry,
  isPotentialAiAgent,
} from "../apps/web/src/lib/seo/crawler-observability";

interface Env {
  AI_CRAWLER_ANALYTICS?: {
    writeDataPoint(point: unknown): void;
  };
}

type PagesFunction<TEnv = unknown> = (context: {
  request: Request;
  env: TEnv;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}) => Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Fast pre-check: if not potentially an AI agent, skip immediately
  const userAgent = request.headers.get("user-agent");
  if (!isPotentialAiAgent(userAgent)) {
    return await context.next();
  }

  // 2. Capture incoming request context
  const clientIp = request.headers.get("cf-connecting-ip");
  const cf = (request as unknown as { cf?: Record<string, unknown> }).cf;

  // 3. Process the origin response
  const response = await context.next();

  // 4. Record telemetry asynchronously without blocking response streaming
  try {
    const recordPromise = collectCrawlerTelemetry(
      request.url,
      userAgent,
      response.status,
      response.headers,
      {
        clientIp,
        cf,
        analyticsEngine: env.AI_CRAWLER_ANALYTICS,
      },
    );

    if (context.waitUntil && typeof context.waitUntil === "function") {
      context.waitUntil(recordPromise.catch(() => {}));
    } else {
      await recordPromise.catch(() => {});
    }
  } catch {
    // Fail-silent: never break response delivery
  }

  return response;
};
