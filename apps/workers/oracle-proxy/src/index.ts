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
  "https://staging.codex-cryptica.com",
  "https://codex-cryptica.pages.dev",
];

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
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
      const body = await request.json();
      
      // Validate required fields
      if (!body.contents || !body.generationConfig) {
        return new Response(JSON.stringify({
          error: {
            message: "Invalid request format. Required: contents, generationConfig",
          },
        }), {
          status: 400,
          headers: { ...getCorsHeaders(request.headers, env), "Content-Type": "application/json" },
        });
      }

      // Forward to Google Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${body.model || "gemini-1.5-pro"}:generateContent?key=${env.GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: body.contents,
          generationConfig: body.generationConfig,
          safetySettings: body.safetySettings,
        }),
      });

      // Read the response from Google
      const responseData = await geminiResponse.json();

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
      return new Response(JSON.stringify({
        error: {
          message: "Proxy error: Failed to forward request to Gemini API",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }), {
        status: 500,
        headers: { ...getCorsHeaders(request.headers, env), "Content-Type": "application/json" },
      });
    }
  }
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
function getCorsHeaders(requestHeaders: Headers, env: Env): Record<string, string> {
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
function isOriginAllowed(origin: string, env: Env): boolean {
  if (!origin) return false;
  
  // Check environment variable first
  if (env.ALLOWED_ORIGINS) {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      return true;
    }
  }
  
  // Check default origins
  return DEFAULT_ALLOWED_ORIGINS.includes(origin);
}
