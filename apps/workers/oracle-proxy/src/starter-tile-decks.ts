interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  etag: string;
}

interface StarterDeckEnv {
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
      "Cache-Control": "public, max-age=86400, immutable",
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
