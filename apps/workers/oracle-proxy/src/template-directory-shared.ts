export interface TemplateDirectoryEnv {
  BUCKET?: any;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
  TEMPLATE_ADMIN_TOKEN?: string;
}

export const PREFIX = "templates/listings/";
export const CACHE_CONTROL = "public, max-age=15";

export function getTemplateListingKey(listingId: string): string {
  return `${PREFIX}${listingId}/listing.json`;
}

export function getTemplatePackageKey(listingId: string): string {
  return `${PREFIX}${listingId}/package.json`;
}

export function cors(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

export function json(
  request: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json", ...extra },
  });
}

export async function readJson(object: any): Promise<unknown> {
  const text =
    typeof object?.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object?.body);
  return JSON.parse(text);
}

export function ownerToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ")
    ? value.slice(7).trim()
    : value?.trim() || null;
}

export async function hashOwnerToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function authorize(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
) {
  const token = ownerToken(request);
  if (!token)
    return json(request, { error: { message: "Owner token required" } }, 401);
  const head = await env.BUCKET?.head(getTemplateListingKey(listingId));
  if (!head)
    return json(
      request,
      { error: { message: "Template listing not found" } },
      404,
    );
  if (head.customMetadata?.ownerTokenHash !== (await hashOwnerToken(token))) {
    return json(request, { error: { message: "Invalid owner token" } }, 401);
  }
  return null;
}

/** A plain-language error response in the directory's error envelope. */
export function fail(
  request: Request,
  message: string,
  status: number,
  code?: string,
): Response {
  return json(
    request,
    { error: { message, ...(code ? { code } : {}) } },
    status,
  );
}

export const bucketMissing = (request: Request) =>
  fail(request, "R2 bucket is not configured", 500);

/** `null` when the caller holds the operator token, otherwise the 401 to send. */
export function operatorAuthError(
  request: Request,
  env: TemplateDirectoryEnv,
): Response | null {
  const expected = env.TEMPLATE_ADMIN_TOKEN;
  const supplied = ownerToken(request);
  return expected && supplied && supplied === expected
    ? null
    : fail(request, "Operator authorization required", 401);
}
