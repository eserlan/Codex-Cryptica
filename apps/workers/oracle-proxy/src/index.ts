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

interface Env {
  GEMINI_API_KEY: string;
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

    if (pathname === "/api/directory/listings") {
      if (request.method === "GET") {
        return handleListPublicListings(request, env);
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
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("width", String(body.width || 1024));
        form.append("height", String(body.height || 1024));

        const formResponse = new Response(form);
        const formBody = formResponse.body || form;
        const formContentType =
          formResponse.headers.get("content-type") || "multipart/form-data";

        const output = await env.AI.run(targetModel, {
          multipart: {
            body: formBody,
            contentType: formContentType,
          },
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
        return new Response(
          JSON.stringify({
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Image generation failed",
              code: "IMAGE_GEN_FAILED",
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
    }

    try {
      // Parse the incoming request body
      const body = (await request.json()) as any;

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

      // 1. Determine Model
      const targetModel = body.model || "gemini-3.5-flash-lite";

      // 2. Map and clean up configuration for Google REST API (which expects snake_case)
      const rawConfig = {
        ...(body.generation_config || body.generationConfig || {}),
      } as any;
      const generation_config: any = {};

      const safety_settings = body.safety_settings || body.safetySettings;
      let system_instruction =
        body.system_instruction || body.systemInstruction;

      // Map supported fields explicitly to prevent prototype pollution and ensure snake_case
      const mapping: Record<string, string> = {
        stopSequences: "stop_sequences",
        stop_sequences: "stop_sequences",
        maxOutputTokens: "max_output_tokens",
        max_output_tokens: "max_output_tokens",
        responseMimeType: "response_mime_type",
        response_mime_type: "response_mime_type",
        responseModalities: "response_modalities",
        response_modalities: "response_modalities",
        candidateCount: "candidate_count",
        candidate_count: "candidate_count",
        temperature: "temperature",
        topP: "top_p",
        top_p: "top_p",
        topK: "top_k",
        top_k: "top_k",
      };

      for (const [inputKey, snakeKey] of Object.entries(mapping)) {
        if (rawConfig[inputKey] !== undefined) {
          generation_config[snakeKey] = rawConfig[inputKey];
        }
      }

      // Map speechConfig → speech_config (required for TTS voice selection)
      // The Google REST API uses deeply-nested snake_case names that differ from
      // the camelCase SDK, so we have to translate each level explicitly.
      // Only written to generation_config when a valid voice_name is present —
      // sending an empty speech_config object causes a 400 from Google.
      const rawSpeechConfig = rawConfig.speechConfig ?? rawConfig.speech_config;
      if (rawSpeechConfig) {
        const rawVoiceConfig =
          rawSpeechConfig.voiceConfig ?? rawSpeechConfig.voice_config;
        if (rawVoiceConfig) {
          const rawPrebuilt =
            rawVoiceConfig.prebuiltVoiceConfig ??
            rawVoiceConfig.prebuilt_voice_config;
          const voiceName = rawPrebuilt?.voiceName ?? rawPrebuilt?.voice_name;
          if (voiceName) {
            // Only assign when we have a concrete voice name — an empty or
            // absent name would cause a 400 INVALID_ARGUMENT from Google.
            generation_config.speech_config = {
              voice_config: {
                prebuilt_voice_config: { voice_name: voiceName },
              },
            };
          }
        }
      }

      // CRITICAL: Google REST API throws 400 if system_instruction is found inside generation_config
      const systemKeys = [
        "systemInstruction",
        "system_instruction",
        "system-instruction",
      ];
      for (const key of systemKeys) {
        if (rawConfig[key]) {
          system_instruction = system_instruction || rawConfig[key];
        }
      }

      // Format system_instruction if it's a simple string
      const formattedSystemInstruction =
        typeof system_instruction === "string"
          ? { parts: [{ text: system_instruction }] }
          : system_instruction;

      const outgoingPayload = {
        contents: body.contents,
        generation_config,
        system_instruction: formattedSystemInstruction,
        safety_settings,
      };

      console.log(`[Oracle Proxy] Forwarding to Google model: ${targetModel}`);

      // Forward to Google Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${env.GEMINI_API_KEY}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(outgoingPayload),
      });

      // Read the response from Google
      const responseText = await geminiResponse.text();
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error(
          "[Oracle Proxy] Non-JSON from Gemini. Status:",
          geminiResponse.status,
        );
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
      return new Response(JSON.stringify(responseData), {
        status: geminiResponse.status,
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
 * Handle a Gemini Interactions API request (server-side conversation state).
 *
 * Forwards to `/v1beta/interactions` with the system key, threading
 * `previous_interaction_id` so the model retains prior turns server-side. The
 * client therefore sends only the new `input` (query + new/changed lore).
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

  // Align with the stateless :generateContent default so a follow-up that omits
  // `model` cannot silently switch models mid-conversation.
  const targetModel = body.model || "gemini-3.5-flash-lite";

  // Interactions API expects system_instruction as a plain string, not the
  // { parts: [...] } object format used by generateContent.
  const systemInstruction: string | undefined =
    typeof body.system_instruction === "string"
      ? body.system_instruction
      : typeof body.systemInstruction === "string"
        ? body.systemInstruction
        : body.system_instruction?.parts?.[0]?.text;

  const payload: Record<string, unknown> = {
    model: targetModel,
    input: body.input,
    store: body.store ?? true,
  };
  if (body.previous_interaction_id) {
    payload.previous_interaction_id = body.previous_interaction_id;
  }
  if (systemInstruction) {
    payload.system_instruction = systemInstruction;
  }
  if (body.generation_config || body.generationConfig) {
    payload.generation_config = body.generation_config || body.generationConfig;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${env.GEMINI_API_KEY}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Oracle Proxy] Interactions fetch error:", err);
    return json(
      { error: { message: "Failed to reach Interactions API" } },
      502,
    );
  }

  const text = await upstream.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
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

  if (!upstream.ok) {
    const message: string =
      data?.error?.message || "Interaction request failed";
    // An expired or unknown previous_interaction_id (retention window elapsed)
    // is recoverable: the client should drop the id and replay full history.
    const isStaleId =
      body.previous_interaction_id &&
      (upstream.status === 404 ||
        upstream.status === 400 ||
        /previous_interaction_id|interaction.*not found/i.test(message));
    if (isStaleId) {
      return json({ error: { message, code: "INTERACTION_NOT_FOUND" } }, 409);
    }
    return json({ error: { message } }, upstream.status);
  }

  // Output text lives at steps[].content[].text (model_output steps).
  const steps: any[] = Array.isArray(data.steps) ? data.steps : [];
  const extractedText = steps
    .flatMap((s) => (Array.isArray(s?.content) ? s.content : []))
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

  const limiter =
    pathname === "/api/publish-vault"
      ? env.PUBLISH_CREATE_RATE_LIMITER
      : env.PUBLISH_WRITE_RATE_LIMITER;
  if (!limiter) return null;

  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const publishId = pathname.split("/")[3] || "new";
  const key = pathname === "/api/publish-vault" ? ip : `${ip}:${publishId}`;
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
