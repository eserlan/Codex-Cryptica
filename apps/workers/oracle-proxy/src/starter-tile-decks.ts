import { withCorsHeaders, type CorsEnv } from "./cors";

interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  etag: string;
}

interface StarterDeckEnv extends CorsEnv {
  BUCKET?: { get(key: string): Promise<R2Object | null> };
}

const PREFIX = "starter-tile-decks/";

export async function handleGetStarterTileDeck(
  env: StarterDeckEnv,
  deckId: string,
  assetPath?: string,
): Promise<Response> {
  if (!env.BUCKET)
    return new Response("Starter deck storage is unavailable", { status: 503 });
  if (!isSafeSegment(deckId) || (assetPath && !isSafeAssetPath(assetPath))) {
    return new Response("Not found", { status: 404 });
  }

  const key = assetPath
    ? `${PREFIX}${deckId}/assets/${assetPath}`
    : `${PREFIX}${deckId}/manifest.json`;
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": assetPath
        ? object.httpMetadata?.contentType || "image/png"
        : "application/json; charset=utf-8",
      "Cache-Control": assetPath
        ? "public, max-age=86400, immutable"
        : "public, max-age=3600",
      ETag: object.etag,
    },
  });
}

function isSafeSegment(value: string) {
  return /^[a-z0-9-]+$/.test(value);
}

function isSafeAssetPath(value: string) {
  return (
    value.endsWith(".png") &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    value
      .split("/")
      .every(
        (segment) =>
          /^[a-z0-9_-]+\.png$/.test(segment) || /^[a-z0-9_-]+$/.test(segment),
      )
  );
}

export async function handleStarterTileDecksRoute(
  request: Request,
  env: StarterDeckEnv,
  pathname: string,
): Promise<Response> {
  const withCors = (res: Response) => withCorsHeaders(request, env, res);
  if (request.method !== "GET")
    return withCors(new Response("Method not allowed", { status: 405 }));
  const parts = pathname.split("/");
  const deckId = parts[3] ? safelyDecodePathSegment(parts[3]) : undefined;
  if (!deckId) return withCors(new Response("Not found", { status: 404 }));
  if (parts.length === 4)
    return withCors(await handleGetStarterTileDeck(env, deckId));
  if (parts.length === 6 && parts[4] === "assets") {
    const assetPath = safelyDecodePathSegment(parts[5]);
    if (!assetPath) return withCors(new Response("Not found", { status: 404 }));
    return withCors(await handleGetStarterTileDeck(env, deckId, assetPath));
  }
  return withCors(new Response("Not found", { status: 404 }));
}

function safelyDecodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
