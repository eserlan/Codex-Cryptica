import type { Env } from "./env";
import { getCorsHeaders } from "./cors";

export async function enforcePublishRateLimit(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (request.method === "GET" || request.method === "OPTIONS") return null;

  const limiter = getPublishLimiter(request, env, pathname);
  if (!limiter) return null;

  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const key = getPublishRateLimitKey(pathname, request.method, ip);
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

function getPublishLimiter(request: Request, env: Env, pathname: string) {
  const isTemplateCreate =
    pathname === "/api/template-directory/listings" &&
    request.method === "POST";
  const isShareCreate =
    pathname === "/api/generator-shares" && request.method === "POST";
  const limiter =
    pathname === "/api/publish-vault" || isTemplateCreate
      ? env.PUBLISH_CREATE_RATE_LIMITER
      : isShareCreate
        ? env.SHARE_CREATE_RATE_LIMITER
        : env.PUBLISH_WRITE_RATE_LIMITER;
  return limiter;
}

function getPublishRateLimitKey(
  pathname: string,
  method: string,
  ip: string,
): string {
  if (pathname === "/api/publish-vault") return ip;
  if (
    method === "POST" &&
    (pathname === "/api/template-directory/listings" ||
      pathname === "/api/generator-shares")
  ) {
    return ip;
  }

  const segments = pathname.split("/");
  const publishIdIndex = pathname.startsWith(
    "/api/template-directory/listings/",
  )
    ? 4
    : 3;
  return `${ip}:${segments[publishIdIndex] || "new"}`;
}

/**
 * Simple rate limiting using the Cache API.
 * Operates per Cloudflare edge location (colo) without DB dependency.
 */
export async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean }> {
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
