/**
 * Oracle Proxy Worker
 *
 * Forwards requests from Codex Cryptica clients to Google's Gemini API.
 * The system API key is kept secret within this worker environment.
 *
 * Environment variables required:
 * - GEMINI_API_KEY: The system Gemini API key
 * - ALLOWED_ORIGINS: Comma-separated list of allowed origins for CORS
 */

interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS?: string;
}

// Allowed origins for CORS
const DEFAULT_ALLOWED_ORIGINS = [
  "https://codex-cryptica.com",
  "https://codexcryptica.com",
  "https://staging.codex-cryptica.com",
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

    // Only allow POST requests
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

    try {
      // Parse the incoming request body
      const body = (await request.json()) as any;

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
      const targetModel = body.model || "gemini-3-flash-preview";

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
          "[Oracle Proxy] Failed to parse Gemini response:",
          responseText,
        );
        return new Response(
          JSON.stringify({
            error: {
              message: "Proxy error: Received invalid JSON from Gemini API",
              details: responseText,
            },
          }),
          {
            status: 502, // Bad Gateway
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
      console.error("[Oracle Proxy] Error:", error);
      return new Response(
        JSON.stringify({
          error: {
            message: "Proxy error: Failed to forward request to Gemini API",
            details: error instanceof Error ? error.message : "Unknown error",
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
 * Handle CORS preflight requests
 */
function handleCorsPreflight(request: Request, env: Env): Response {
  const headers = new Headers();
  const allowedHeaders = "Content-Type, Authorization, X-Requested-With";
  const allowedMethods = "POST, OPTIONS";

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

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string, env: Env): boolean {
  if (!origin) return false;

  // Check environment variable first
  if (env.ALLOWED_ORIGINS) {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return true;
    }
  }

  // Check default origins
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Allow any local dev port so Vite / wrangler dev port changes do not break CORS.
  return isLoopbackOrigin(origin);
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
