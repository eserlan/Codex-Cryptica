import {
  GENERATOR_SHARE_LIMITS,
  GeneratorShareCreateSchema,
  GeneratorShareSchema,
  type GeneratorShare,
} from "../../../../packages/schema/src/generator-share";

interface GeneratorShareEnv {
  BUCKET?: any;
}

const PREFIX = "generator-shares/";
// Revocation must take effect for the next request. A public response cache
// could otherwise continue serving a deleted snapshot after the R2 object is
// gone.
const CACHE_CONTROL = "no-store";

export function getGeneratorShareKey(shareId: string): string {
  return `${PREFIX}${shareId}.json`;
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Content-Type": "application/json",
    },
  });
}

function tokenFromRequest(request: Request): string | null {
  const value = request.headers.get("Authorization");
  if (!value) return null;
  return value.startsWith("Bearer ") ? value.slice(7).trim() : value.trim();
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateShareId(
  generatorId: string,
  title: string,
  randomSuffix: string,
): string {
  const generatorSlug = generatorId.replace("/", "-");
  const titleSlug = slugify(title);
  return `${generatorSlug}-${titleSlug}-${randomSuffix}`;
}

function randomSuffix(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function readJson(object: any): Promise<unknown> {
  const text =
    typeof object?.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object?.body);
  return JSON.parse(text);
}

async function readShare(
  env: GeneratorShareEnv,
  shareId: string,
): Promise<{ share: GeneratorShare; managementTokenHash: string } | null> {
  const object = await env.BUCKET?.get(getGeneratorShareKey(shareId));
  if (!object) return null;
  try {
    const share = GeneratorShareSchema.parse(await readJson(object));
    const managementTokenHash = object.customMetadata?.managementTokenHash;
    if (typeof managementTokenHash !== "string") return null;
    return { share, managementTokenHash };
  } catch {
    return null;
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/** POST /api/generator-shares — creates an explicit, immutable share. */
export async function handleCreateGeneratorShare(
  request: Request,
  env: GeneratorShareEnv,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(
      request,
      { error: { message: "Share storage is not configured" } },
      500,
    );
  }

  try {
    const payload = GeneratorShareCreateSchema.parse(await request.json());
    const shareId = generateShareId(
      payload.generatorId,
      payload.title,
      randomSuffix(),
    );
    const managementToken = randomToken();
    const share = GeneratorShareSchema.parse({
      shareId,
      ...payload,
      createdAt: new Date().toISOString(),
    });
    const serialised = JSON.stringify(share);
    const bytes = new TextEncoder().encode(serialised).byteLength;
    if (bytes > GENERATOR_SHARE_LIMITS.maxPayloadBytes) {
      return json(
        request,
        { error: { message: "This result is too large to share." } },
        413,
      );
    }

    await env.BUCKET.put(getGeneratorShareKey(shareId), serialised, {
      httpMetadata: {
        contentType: "application/json",
        cacheControl: CACHE_CONTROL,
      },
      customMetadata: { managementTokenHash: await hashToken(managementToken) },
    });

    return json(request, { share, managementToken }, 201);
  } catch {
    return json(request, { error: { message: "Invalid share payload" } }, 400);
  }
}

/** GET /api/generator-shares/:shareId — public read-only snapshot. */
export async function handleGetGeneratorShare(
  request: Request,
  env: GeneratorShareEnv,
  shareId: string,
): Promise<Response> {
  const result = await readShare(env, shareId);
  if (!result)
    return json(request, { error: { message: "Share not found" } }, 404);
  return new Response(JSON.stringify(result.share), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

/** DELETE /api/generator-shares/:shareId — revokes a share with its private token. */
export async function handleDeleteGeneratorShare(
  request: Request,
  env: GeneratorShareEnv,
  shareId: string,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "Share storage is not configured" } },
      500,
    );
  const result = await readShare(env, shareId);
  if (!result)
    return json(request, { error: { message: "Share not found" } }, 404);
  const token = tokenFromRequest(request);
  if (
    !token ||
    !constantTimeEqual(result.managementTokenHash, await hashToken(token))
  ) {
    return json(
      request,
      { error: { message: "Invalid management token" } },
      401,
    );
  }
  await env.BUCKET.delete(getGeneratorShareKey(shareId));
  return json(request, { revoked: true });
}
