/**
 * Oracle Proxy Worker
 *
 * Forwards requests from Codex Cryptica clients to upstream LLM providers
 * and exposes edge APIs for publishing, asset galleries, and directory listings.
 */

import { handleStarterTileDecksRoute } from "./starter-tile-decks";
import { handleListPublicListings } from "./directory";
import { handleCopyrightReport } from "./reports";
import { forwardToGemini } from "./llm/adaptors/gemini-adaptor";
import {
  isLlmOperationRequest,
  handleLlmOperationRequest,
  isLlmOperationStreamRequest,
  handleLlmOperationStreamRequest,
} from "./llm/handle-operation-request";
import { handleInteraction } from "./llm/interaction-handler";
import { handleSessionRequest, enforceLlmSession } from "./session-guard";
import { handleHelpAsk } from "./help";
import { handleTemplateDirectoryRoutes } from "./template-directory-routes";
import { handleCloudBackupRoutes } from "./cloud-backup-routes";
import { handlePublishedRoutes } from "./publish-routes";
import { handleGeneratorSharesRoute } from "./generator-shares";
import { handleAssetGallery } from "./asset-gallery";
import { enforcePublishRateLimit } from "./rate-limiting";
import {
  handleBySlugs as handleAnswerBySlugs,
  handleTop as handleAnswerTop,
  handleVote as handleAnswerVote,
} from "./answer-aggregates";
import { isKnownAnswerSlug } from "./answer-slugs";
import {
  getCorsHeaders,
  handleCorsPreflight,
  isOriginAllowed,
  withCorsHeaders,
} from "./cors";
import { handleImageGeneration } from "./image-generation";
import type { Env } from "./env";

export { isOriginAllowed } from "./cors";
export { usesMultipartInput, supportsNegativePrompt } from "./image-generation";
export type { Env } from "./env";

async function handleCachedAssetGallery(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const cacheUrl = new URL("/gallery", request.url);
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const response = await handleAssetGallery(request, env);
  if (response.ok) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

/**
 * Edge-cached public aggregate reads (spec 164). Responses already carry
 * `Cache-Control: public, max-age=300`; the Cache API put-through covers
 * edge locations where the CDN would otherwise pass through to D1.
 * Falls back to a direct read when the Cache API is unavailable (tests).
 */
async function handleCachedAggregateRead(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  handler: (request: Request, env: Env) => Promise<Response>,
): Promise<Response> {
  try {
    if (typeof caches === "undefined") throw new Error("no cache");
    const cacheKey = new Request(request.url, { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    const response = await handler(request, env);
    if (response.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return handler(request, env);
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleCorsPreflight(request, env);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/gallery") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleCachedAssetGallery(request, env, ctx);
    }

    if (pathname.startsWith("/api/starter-tile-decks/")) {
      return handleStarterTileDecksRoute(request, env, pathname);
    }

    if (pathname === "/api/session") {
      const hasAutomationKey =
        request.headers.has("X-Codex-Automation-Key") ||
        request.headers.has("x-codex-automation-key");
      const sessionOrigin = request.headers.get("Origin") || "";
      if (!hasAutomationKey && !isOriginAllowed(sessionOrigin, env)) {
        return new Response("Forbidden", {
          status: 403,
          headers: getCorsHeaders(request.headers, env),
        });
      }
      return handleSessionRequest(
        request,
        env,
        getCorsHeaders(request.headers, env),
      );
    }

    const generatorSharesResponse = await handleGeneratorSharesRoute(
      request,
      env,
      pathname,
    );
    if (generatorSharesResponse) return generatorSharesResponse;

    if (
      pathname === "/api/answer-aggregates/vote" ||
      pathname === "/api/answer-aggregates/top" ||
      pathname === "/api/answer-aggregates/by-slugs"
    ) {
      if (pathname === "/api/answer-aggregates/vote") {
        const origin = request.headers.get("Origin") || "";
        if (!isOriginAllowed(origin, env)) {
          return new Response("Forbidden", {
            status: 403,
            headers: getCorsHeaders(request.headers, env),
          });
        }
        if (request.method !== "POST")
          return withCorsHeaders(
            request,
            env,
            new Response("Method not allowed", { status: 405 }),
          );
        const limiter = env.ANSWER_FEEDBACK_RATE_LIMITER;
        if (limiter) {
          const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
          const { success } = await limiter.limit({ key: ip });
          if (!success) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: {
                ...getCorsHeaders(request.headers, env),
                "Content-Type": "application/json",
                "Retry-After": "60",
              },
            });
          }
        }
        return handleAnswerVote(request, env, {
          isKnownSlug: isKnownAnswerSlug,
        });
      }
      if (request.method !== "GET")
        return withCorsHeaders(
          request,
          env,
          new Response("Method not allowed", { status: 405 }),
        );
      const handler =
        pathname === "/api/answer-aggregates/top"
          ? handleAnswerTop
          : handleAnswerBySlugs;
      return handleCachedAggregateRead(request, env, ctx, handler);
    }

    const cloudBackupResponse = await handleCloudBackupRoutes(
      request,
      env,
      pathname,
    );
    if (cloudBackupResponse) return cloudBackupResponse;

    if (pathname === "/api/directory/listings") {
      if (request.method === "GET") {
        return handleListPublicListings(request, env);
      }
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    if (pathname.startsWith("/api/template-directory/")) {
      const origin = request.headers.get("Origin") || "";
      if (origin && !isOriginAllowed(origin, env)) {
        return new Response("Forbidden", {
          status: 403,
          headers: getCorsHeaders(request.headers, env),
        });
      }
      const rateLimitResponse = await enforcePublishRateLimit(
        request,
        env,
        pathname,
      );
      if (rateLimitResponse) return rateLimitResponse;
    }

    const templateDirectoryResponse = await handleTemplateDirectoryRoutes(
      request,
      env,
      pathname,
    );
    if (templateDirectoryResponse) return templateDirectoryResponse;

    if (pathname === "/api/reports/copyright") {
      const origin = request.headers.get("Origin") || "";
      if (origin && !isOriginAllowed(origin, env)) {
        return new Response("Forbidden", {
          status: 403,
          headers: getCorsHeaders(request.headers, env),
        });
      }
      if (request.method === "POST") {
        return handleCopyrightReport(request, env);
      }
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    const publishedResponse = await handlePublishedRoutes(
      request,
      env,
      pathname,
    );
    if (publishedResponse) return publishedResponse;

    // Only allow POST requests for the fallback Oracle API
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    const origin = request.headers.get("Origin") || "";
    const isAllowedOrigin = isOriginAllowed(origin, env);

    if (url.pathname === "/v1/images/generations") {
      return handleImageGeneration(request, env, isAllowedOrigin);
    }

    // Contextual help (#3427) runs the same session guard itself so it can
    // count rate-limited requests; see help.ts.
    if (url.pathname === "/api/help/ask") {
      return handleHelpAsk(
        request,
        env,
        getCorsHeaders(request.headers, env),
        isAllowedOrigin,
      );
    }

    // Capability-token guard for the text LLM endpoints. Covers all three
    // paths below (operation pipeline, interactions, legacy passthrough),
    // which together are every text generation request the app makes.
    const sessionResponse = await enforceLlmSession(
      request,
      env,
      getCorsHeaders(request.headers, env),
      isAllowedOrigin,
    );
    if (sessionResponse) return sessionResponse;

    try {
      // Parse the incoming request body
      const body = (await request.json()) as any;

      // Provider-neutral operation pipeline: selected when the client sends
      // a recognized `operation` field.
      if (isLlmOperationStreamRequest(body)) {
        return await handleLlmOperationStreamRequest(
          body,
          getCorsHeaders(request.headers, env),
          env,
          request.signal,
        );
      }

      if (isLlmOperationRequest(body)) {
        return await handleLlmOperationRequest(
          body,
          getCorsHeaders(request.headers, env),
          env,
        );
      }

      // Interactions API path: server-side conversation state.
      if (body.input !== undefined) {
        return await handleInteraction(body, request, env);
      }

      // Validate required fields
      if (!body.contents || !Array.isArray(body.contents)) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Invalid request format. Required: contents (array)",
            },
          }),
          {
            status: 400,
            headers: {
              ...getCorsHeaders(request.headers, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const { status, data, parseError } = await forwardToGemini(body, env);

      if (parseError) {
        console.error("[Oracle Proxy] Non-JSON from Gemini. Status:", status);
        return new Response(
          JSON.stringify({
            error: {
              message: "Proxy error: Received invalid response from upstream",
              code: "UPSTREAM_PARSE_ERROR",
            },
          }),
          {
            status: 502,
            headers: {
              ...getCorsHeaders(request.headers, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Return the response to the client
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error(
        "[Oracle Proxy] Internal error:",
        error instanceof Error ? error.message : "unknown",
      );
      return new Response(
        JSON.stringify({
          error: {
            message: "Proxy error: Failed to forward request to Gemini API",
            code: "PROXY_INTERNAL_ERROR",
          },
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(request.headers, env),
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
