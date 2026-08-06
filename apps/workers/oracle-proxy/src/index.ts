/**
 * Oracle Proxy Worker
 *
 * Forwards requests from Codex Cryptica clients to Google's Gemini API.
 * The system API key is kept secret within this worker environment.
 *
 * Environment variables required:
 * - GEMINI_API_KEY: The system Gemini API key
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins for CORS
 * - ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: Optional opt-in for Pages previews
 */

import { DEFAULT_CF_IMAGE_MODEL } from "../../../../packages/oracle-engine/src/image-defaults";
import {
  handlePublishVault,
  handleGetBundle,
  handleGetManifest,
  handleUploadAsset,
  handleGetAsset,
  handleDeleteVault,
  handleDeleteAsset,
} from "./publish";
import {
  handleDeletePublicListing,
  handleGetPublicListing,
  handleListPublicListings,
  handlePutPublicListing,
} from "./directory";
import { handleGetPublishedNotice, handlePutPublishedNotice } from "./notice";
import { handleCopyrightReport } from "./reports";
import {
  forwardToGemini,
  forwardInteractionToGemini,
} from "./llm/adaptors/gemini-adaptor";
import {
  forwardInteractionToOpenAi,
  extractOpenAiResponseText,
} from "./llm/adaptors/openai-adaptor";
import { getModel } from "./llm/registry";
import {
  isLlmOperationRequest,
  handleLlmOperationRequest,
} from "./llm/handle-operation-request";
import {
  handleCreateTemplateListing,
  handleDeleteTemplateListing,
  handleGetTemplateListing,
  handleGetTemplatePackage,
  handleListTemplateListings,
  handleReportTemplateListing,
  handleUpdateTemplateListing,
  handleAdminSuspendTemplateListing,
} from "./template-directory";

interface Env {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  AI?: any;
  BUCKET?: any; // R2Bucket
  TURNSTILE_SECRET_KEY?: string;
  PUBLISH_CREATE_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  PUBLISH_WRITE_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  TEMPLATE_ADMIN_TOKEN?: string;
}

// Allowed origins for CORS
const DEFAULT_ALLOWED_ORIGINS = [
  "https://codex-cryptica.com",
  "https://codexcryptica.com",
  "https://staging.codex-cryptica.com",
  "https://staging.codexcryptica.com",
  "https://codex-cryptica.pages.dev",
  "http://localhost",
  "http://127.0.0.1",
];

/**
 * FLUX.2 models are served through the multipart image-generation endpoint.
 * Matched by family rather than by an exhaustive list so a new klein or dev
 * variant keeps working without a proxy deploy.
 */
export function usesMultipartInput(model: string): boolean {
  return /flux-2/i.test(model);
}

/**
 * Whether a model's schema declares `negative_prompt`.
 *
 * The AI binding validates input against that schema and answers "8001:
 * Invalid input" for a field the model does not declare — Lucid Origin, for
 * one. The REST endpoint is more forgiving and ignores it, which is how this
 * was missed: the same request succeeded over REST and failed through the
 * binding. An allow-list, because a rejection breaks generation outright while
 * an omitted negative merely goes unused.
 */
export function supportsNegativePrompt(model: string): boolean {
  if (usesMultipartInput(model)) return true;
  return /stable-diffusion|dreamshaper|phoenix/i.test(model);
}

function buildMultipartInput(
  prompt: string,
  width: number,
  height: number,
  negativePrompt?: string,
) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  if (negativePrompt) form.append("negative_prompt", negativePrompt);

  const formResponse = new Response(form);
  return {
    multipart: {
      body: formResponse.body || form,
      contentType:
        formResponse.headers.get("content-type") || "multipart/form-data",
    },
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleCorsPreflight(request, env);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

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

    if (pathname === "/api/directory/listings") {
      if (request.method === "GET") {
        return handleListPublicListings(request, env);
      }

      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    if (
      pathname === "/api/template-directory/admin/suspensions" &&
      request.method === "POST"
    ) {
      return handleAdminSuspendTemplateListing(request, env);
    }

    if (pathname === "/api/template-directory/listings") {
      if (request.method === "GET")
        return handleListTemplateListings(request, env);
      if (request.method === "POST")
        return handleCreateTemplateListing(request, env);
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    if (pathname.startsWith("/api/template-directory/listings/")) {
      const parts = pathname.split("/");
      const listingId = parts[4];
      if (!listingId) return new Response("Not found", { status: 404 });
      if (
        parts.length === 6 &&
        parts[5] === "package" &&
        request.method === "GET"
      ) {
        return handleGetTemplatePackage(request, env, listingId);
      }
      if (
        parts.length === 6 &&
        parts[5] === "report" &&
        request.method === "POST"
      ) {
        return handleReportTemplateListing(request, env, listingId);
      }
      if (parts.length === 5) {
        if (request.method === "GET")
          return handleGetTemplateListing(request, env, listingId);
        if (request.method === "PUT")
          return handleUpdateTemplateListing(request, env, listingId);
        if (request.method === "DELETE")
          return handleDeleteTemplateListing(request, env, listingId);
      }
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

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

    // Route R2 snapshot publishing endpoints
    if (
      pathname === "/api/publish-vault" ||
      pathname.startsWith("/api/published/")
    ) {
      const origin = request.headers.get("Origin") || "";
      const isReadOnlyPublishedRequest =
        pathname.startsWith("/api/published/") && request.method === "GET";
      if (!isReadOnlyPublishedRequest && !isOriginAllowed(origin, env)) {
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

      if (pathname === "/api/publish-vault") {
        if (request.method === "POST") {
          return handlePublishVault(request, env);
        }
        return new Response("Method not allowed", {
          status: 405,
          headers: getCorsHeaders(request.headers, env),
        });
      }

      const parts = pathname.split("/");
      if (parts.length === 4) {
        // /api/published/:publishId
        if (request.method === "DELETE") {
          return handleDeleteVault(request, env, parts[3]);
        }
        return new Response("Method not allowed", {
          status: 405,
          headers: getCorsHeaders(request.headers, env),
        });
      }

      if (parts.length === 5) {
        // /api/published/:publishId/bundle, manifest, listing, or notice
        if (parts[4] === "notice") {
          if (request.method === "GET") {
            return handleGetPublishedNotice(request, env, parts[3]);
          }
          if (request.method === "PUT") {
            return handlePutPublishedNotice(request, env, parts[3]);
          }
        }
        if (parts[4] === "listing") {
          if (request.method === "GET") {
            return handleGetPublicListing(request, env, parts[3]);
          }
          if (request.method === "PUT") {
            return handlePutPublicListing(request, env, parts[3]);
          }
          if (request.method === "DELETE") {
            return handleDeletePublicListing(request, env, parts[3]);
          }
        }
        if (request.method === "GET") {
          if (parts[4] === "bundle") {
            return handleGetBundle(request, env, parts[3]);
          }
          if (parts[4] === "manifest") {
            return handleGetManifest(request, env, parts[3]);
          }
        }
        return new Response("Method not allowed", {
          status: 405,
          headers: getCorsHeaders(request.headers, env),
        });
      }

      if (parts.length === 6 && parts[4] === "assets") {
        // /api/published/:publishId/assets/:assetId
        if (request.method === "POST") {
          return handleUploadAsset(request, env, parts[3], parts[5]);
        }
        if (request.method === "GET") {
          return handleGetAsset(request, env, parts[3], parts[5]);
        }
        if (request.method === "DELETE") {
          return handleDeleteAsset(request, env, parts[3], parts[5]);
        }
        return new Response("Method not allowed", {
          status: 405,
          headers: getCorsHeaders(request.headers, env),
        });
      }

      return new Response("Not found", {
        status: 404,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    // Only allow POST requests for the fallback Oracle API
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    // Validate origin
    const origin = request.headers.get("Origin") || "";
    if (!isOriginAllowed(origin, env)) {
      return new Response("Forbidden", {
        status: 403,
        headers: getCorsHeaders(request.headers, env),
      });
    }

    if (url.pathname === "/v1/images/generations") {
      const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
      const limitResult = await checkRateLimit(ip);
      if (!limitResult.allowed) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                "Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
              code: "RATE_LIMIT_EXCEEDED",
            },
          }),
          {
            status: 429,
            headers: {
              ...getCorsHeaders(request.headers, env),
              "Content-Type": "application/json",
            },
          },
        );
      }

      try {
        const body = (await request.json()) as any;
        const prompt = body.prompt;
        const targetModel = body.model || DEFAULT_CF_IMAGE_MODEL;

        if (!prompt) {
          return new Response(
            JSON.stringify({ error: { message: "Prompt is required" } }),
            {
              status: 400,
              headers: {
                ...getCorsHeaders(request.headers, env),
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (!env.AI) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Workers AI binding is not configured on the proxy",
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

        console.log(
          `[Oracle Proxy] Generating image using Workers AI model: ${targetModel}`,
        );
        const width = Number(body.width) || 1024;
        const height = Number(body.height) || 1024;
        // Forwarded rather than dropped: the client has always sent this and
        // the proxy has always discarded it, so every negative term composed
        // for a proxy image went nowhere.
        const negativePrompt = body.negative_prompt
          ? String(body.negative_prompt)
          : undefined;

        // Workers AI does not take one input shape. The FLUX.2 family expects
        // a multipart body, because that endpoint also accepts reference
        // images for editing; every other text-to-image model expects a plain
        // object and answers a multipart body with "field required: prompt".
        // Sending the wrong one is a 5012, not a soft failure, so the shape
        // follows the model.
        const output = usesMultipartInput(targetModel)
          ? await env.AI.run(
              targetModel,
              buildMultipartInput(prompt, width, height, negativePrompt),
            )
          : await env.AI.run(targetModel, {
              prompt,
              width,
              height,
              ...(negativePrompt && supportsNegativePrompt(targetModel)
                ? { negative_prompt: negativePrompt }
                : {}),
            });

        let buffer: ArrayBuffer;
        if (output instanceof ArrayBuffer) {
          buffer = output;
        } else if (output instanceof Uint8Array) {
          buffer = output.buffer;
        } else if (
          typeof output === "object" &&
          output !== null &&
          "image" in output
        ) {
          const img = (output as any).image;
          if (typeof img === "string") {
            // base64 format returned directly
            return new Response(
              JSON.stringify({
                success: true,
                result: { image: img },
              }),
              {
                status: 200,
                headers: {
                  ...getCorsHeaders(request.headers, env),
                  "Content-Type": "application/json",
                },
              },
            );
          } else {
            // If the inner image field is a stream or binary, convert it
            const res = new Response(img);
            buffer = await res.arrayBuffer();
          }
        } else if (
          output &&
          (output instanceof ReadableStream ||
            typeof (output as any).getReader === "function" ||
            typeof (output as any).arrayBuffer === "function")
        ) {
          const res = new Response(output as any);
          buffer = await res.arrayBuffer();
        } else {
          throw new Error("Invalid output format returned from Workers AI");
        }

        const b64 = arrayBufferToBase64(buffer);

        return new Response(
          JSON.stringify({
            success: true,
            result: {
              image: b64,
            },
          }),
          {
            status: 200,
            headers: {
              ...getCorsHeaders(request.headers, env),
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error(
          "[Oracle Proxy] Cloudflare Workers AI image error:",
          error,
        );
        const raw =
          error instanceof Error ? error.message : "Image generation failed";
        // 4006 is the shared account's daily neuron budget, not a fault in the
        // request. It reached users as a raw provider string about neurons,
        // which explains nothing and suggests nothing they can do.
        const outOfBudget = /\b4006\b|daily free allocation/i.test(raw);

        return new Response(
          JSON.stringify({
            error: {
              message: outOfBudget
                ? "The shared image allowance for today is used up. It resets daily — or configure your own Cloudflare Account ID and API Token in settings to generate without the shared limit."
                : raw,
              code: outOfBudget ? "IMAGE_BUDGET_EXCEEDED" : "IMAGE_GEN_FAILED",
            },
          }),
          {
            status: outOfBudget ? 429 : 500,
            headers: {
              ...getCorsHeaders(request.headers, env),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    try {
      // Parse the incoming request body
      const body = (await request.json()) as any;

      // Provider-neutral operation pipeline: selected when the client sends
      // a recognized `operation` field. Requests without it fall through to
      // the two legacy branches below completely unchanged (FR-007,
      // research.md R1).
      if (isLlmOperationRequest(body)) {
        return await handleLlmOperationRequest(
          body,
          getCorsHeaders(request.headers, env),
          env,
        );
      }

      // Interactions API path: server-side conversation state. Selected when the
      // client sends an `input` field (instead of full `contents`). Keeps the
      // stateless generateContent path below intact as the retention fallback.
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

/**
 * Handle an Interactions-style request (server-side conversation state).
 *
 * `body.model` is looked up against the model registry first: an OpenAI
 * registry key (e.g. "luna-fast") routes to OpenAI's Responses API,
 * threading `previous_response_id`; anything else (including raw Gemini
 * model ids not in the registry, for back-compat) forwards to Gemini's
 * `/v1beta/interactions`, threading `previous_interaction_id`. Either way the
 * client only ever sends/receives the provider-neutral `previous_interaction_id`
 * / `{ id, text }` shape — callers (chat/revision/generator sessions) don't
 * need to know which provider is serving a given model key.
 *
 * Returns `{ id, text }`; an expired/invalid previous id is mapped to a typed
 * 409 so the client can reset and replay full history.
 */
async function handleInteraction(
  body: any,
  request: Request,
  env: Env,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const rawModel = typeof body?.model === "string" ? body.model : undefined;
  const registryModel = rawModel ? getModel(rawModel) : undefined;
  const useOpenAi = registryModel?.provider === "openai";

  const outgoingBody = {
    ...body,
    model: rawModel,
  };

  if (registryModel && registryModel.provider === "gemini") {
    outgoingBody.model = registryModel.modelId;
  }

  const result = useOpenAi
    ? await forwardInteractionToOpenAi(
        outgoingBody,
        registryModel!.modelId,
        env,
      )
    : await forwardInteractionToGemini(outgoingBody, env);

  if (result.transportError) {
    return json(
      { error: { message: "Failed to reach Interactions API" } },
      502,
    );
  }
  if (result.parseError) {
    return json(
      {
        error: {
          message: "Proxy error: invalid response from Interactions API",
          code: "UPSTREAM_PARSE_ERROR",
        },
      },
      502,
    );
  }

  const data = result.data as any;

  if (!result.ok) {
    const message: string =
      data?.error?.message || "Interaction request failed";
    // An expired or unknown previous id (retention window elapsed, or an
    // OpenAI previous_response_id that's aged out) is recoverable: the
    // client should drop the id and replay full history.
    const isStaleId =
      body.previous_interaction_id &&
      (result.status === 404 ||
        result.status === 400 ||
        /previous_interaction_id|previous_response_id|interaction.*not found|response.*not found/i.test(
          message,
        ));
    if (isStaleId) {
      return json({ error: { message, code: "INTERACTION_NOT_FOUND" } }, 409);
    }
    return json({ error: { message } }, result.status);
  }

  // Gemini's Interactions API: output text lives at steps[].content[].text
  // (model_output steps). OpenAI's Responses API: output text lives at
  // output[].content[].text (message items, output_text blocks).
  const extractedText = useOpenAi
    ? extractOpenAiResponseText(data)
    : (Array.isArray(data.steps) ? data.steps : [])
        .flatMap((s: any) => (Array.isArray(s?.content) ? s.content : []))
        .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
        .filter(Boolean)
        .join("");

  return json({ id: data.id, text: extractedText }, 200);
}

/**
 * Handle CORS preflight requests
 */
function handleCorsPreflight(request: Request, env: Env): Response {
  const headers = new Headers();
  const allowedHeaders =
    "Content-Type, Authorization, X-Requested-With, X-Turnstile-Token, X-Filename";
  const allowedMethods = "GET, POST, PUT, DELETE, OPTIONS";

  // Set CORS headers
  const origin = request.headers.get("Origin") || "";
  if (isOriginAllowed(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set("Access-Control-Allow-Headers", allowedHeaders);
  headers.set("Access-Control-Allow-Methods", allowedMethods);
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Get CORS headers for a response
 */
function getCorsHeaders(
  requestHeaders: Headers,
  env: Env,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const origin = requestHeaders.get("Origin") || "";

  if (isOriginAllowed(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

async function enforcePublishRateLimit(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (request.method === "GET" || request.method === "OPTIONS") return null;

  const isTemplateCreate =
    pathname === "/api/template-directory/listings" &&
    request.method === "POST";
  const limiter =
    pathname === "/api/publish-vault" || isTemplateCreate
      ? env.PUBLISH_CREATE_RATE_LIMITER
      : env.PUBLISH_WRITE_RATE_LIMITER;
  if (!limiter) return null;

  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const publishId = pathname.startsWith("/api/template-directory/listings/")
    ? pathname.split("/")[4] || "new"
    : pathname.split("/")[3] || "new";
  const key =
    pathname === "/api/publish-vault" || isTemplateCreate
      ? ip
      : `${ip}:${publishId}`;
  const { success } = await limiter.limit({ key });
  if (success) return null;

  return new Response(
    JSON.stringify({
      error: {
        message: "Too many publishing requests. Please try again later.",
      },
    }),
    {
      status: 429,
      headers: {
        ...getCorsHeaders(request.headers, env),
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string, env: Env): boolean {
  if (!origin) return false;

  // 1. Check explicit allowlist if configured
  if (env.ALLOWED_ORIGINS?.trim()) {
    const explicitlyAllowedOrigins = env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (explicitlyAllowedOrigins.includes(origin)) return true;

    if (
      isEnabled(env.ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS) &&
      isCloudflarePagesPreviewOrigin(origin)
    ) {
      return true;
    }

    // When ALLOWED_ORIGINS is configured, treat it as authoritative.
    return false;
  }

  // 2. Check default internal origins
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // 3. Allow Cloudflare Pages preview subdomains
  if (isCloudflarePagesPreviewOrigin(origin)) {
    return true;
  }

  // 4. Allow any local dev port so Vite / wrangler dev port changes do not break CORS.
  return isLoopbackOrigin(origin);
}

function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === "true" || value === "1";
}

function isCloudflarePagesPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "codex-cryptica.pages.dev" ||
      hostname.endsWith(".codex-cryptica.pages.dev")
    );
  } catch {
    return false;
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Simple rate limiting using the Cache API.
 * Operates per Cloudflare edge location (colo) without DB dependency.
 */
async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  try {
    const cacheKey = new Request(`https://limit.local/ip-${ip}`);
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);

    let count = 0;
    if (cachedResponse) {
      const data = (await cachedResponse.json()) as any;
      count = data.count || 0;
    }

    const limit = 20; // 20 images per day per user/IP per edge location
    if (count >= limit) {
      return { allowed: false };
    }

    count++;
    const nextResponse = new Response(JSON.stringify({ count }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=86400", // Cache for 24 hours
      },
    });
    await cache.put(cacheKey, nextResponse);

    return { allowed: true };
  } catch (err) {
    console.error("[Oracle Proxy] Rate limiter error, default to allow:", err);
    return { allowed: true };
  }
}

/**
 * Safely convert ArrayBuffer to Base64 avoiding stack overflows.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, len)) as any,
    );
  }
  return btoa(binary);
}
