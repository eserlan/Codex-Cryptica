import type { BlueskyAsset } from "./release-comms-publish.ts";
import type { EvaluatorResult, WriterResult } from "./release-comms-types.ts";

const R2_SOCIAL_HOST = "assets.codexcryptica.com";

export interface InstagramQualificationResult {
  recommendedChannels: string[] | undefined;
}

/**
 * Instagram is deliberately coupled to Bluesky qualification. It does not
 * need its own writer output: each Instagram post uses the exact
 * resolved Bluesky caption and the same R2 social asset.
 */
export function deriveInstagramQualification(
  result: EvaluatorResult,
  drafts: WriterResult,
): InstagramQualificationResult {
  const hasBlueskyDrafts = drafts.bluesky.length > 0;
  const hasBlueskyWorthy = Boolean(
    result.features?.some((feature) => feature.bluesky_worthy),
  );
  const isInstagramRecommended = hasBlueskyDrafts || hasBlueskyWorthy;
  const channelsWithoutInstagram = (result.recommended_channels ?? []).filter(
    (channel) => channel !== "instagram",
  );

  return {
    recommendedChannels: isInstagramRecommended
      ? Array.from(new Set([...channelsWithoutInstagram, "instagram"]))
      : channelsWithoutInstagram,
  };
}

export interface InstagramPublication {
  id: string;
  url: string;
}

export interface PublishInstagramOptions {
  asset: BlueskyAsset;
  /** The final Bluesky caption, preserved byte-for-byte for Instagram. */
  caption: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseGraphApiUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("INSTAGRAM_GRAPH_API_URL must be an absolute HTTPS URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("INSTAGRAM_GRAPH_API_URL must be an HTTPS URL");
  }
  return url;
}

function requireR2SocialImage(imageUrl: string): void {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Instagram image must be an HTTPS R2 social asset URL");
  }
  if (url.protocol !== "https:" || url.hostname !== R2_SOCIAL_HOST) {
    throw new Error(
      "Instagram image must be hosted at assets.codexcryptica.com",
    );
  }
  if (!/\.jpe?g$/i.test(url.pathname)) {
    throw new Error("Instagram image must be a JPEG R2 social asset URL");
  }
}

async function jsonResponse(
  response: Response,
  operation: string,
): Promise<Record<string, unknown>> {
  if (!response.ok) {
    // Do not include the response body: Meta errors can contain request data.
    throw new Error(
      `Instagram ${operation} failed with status ${response.status}`,
    );
  }
  try {
    const value = (await response.json()) as unknown;
    if (!value || typeof value !== "object") throw new Error("invalid JSON");
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`Instagram ${operation} returned invalid JSON`);
  }
}

function endpoint(base: URL, path: string): string {
  return new URL(
    path.replace(/^\//, ""),
    `${base.toString().replace(/\/$/, "")}/`,
  ).toString();
}

function form(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

/** Publish one Instagram image post through Meta Graph API. */
export async function publishInstagramPost(
  options: PublishInstagramOptions,
): Promise<InstagramPublication> {
  const { asset, caption, env = process.env, fetchFn = fetch } = options;
  if (!caption) throw new Error("Instagram caption must not be empty");
  requireR2SocialImage(asset.imageUrl);
  if (options.dryRun) {
    return {
      id: "dry-run",
      url: `dry-run://instagram/${encodeURIComponent(asset.pageUrl)}`,
    };
  }

  const accountId = requiredEnv(env, "INSTAGRAM_ACCOUNT_ID");
  const accessToken = requiredEnv(env, "INSTAGRAM_ACCESS_TOKEN");
  const graphApiUrl = parseGraphApiUrl(
    requiredEnv(env, "INSTAGRAM_GRAPH_API_URL"),
  );
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  const create = await jsonResponse(
    await fetchFn(endpoint(graphApiUrl, `${accountId}/media`), {
      method: "POST",
      headers,
      body: form({
        image_url: asset.imageUrl,
        caption,
        access_token: accessToken,
      }),
    }),
    "media creation",
  );
  if (typeof create.id !== "string" || !create.id) {
    throw new Error("Instagram media creation returned no container ID");
  }

  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const maxPollAttempts = options.maxPollAttempts ?? 30;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  let ready = false;
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const status = await jsonResponse(
      await fetchFn(
        `${endpoint(graphApiUrl, create.id)}?${form({ fields: "status_code", access_token: accessToken })}`,
      ),
      "media status check",
    );
    if (status.status_code === "FINISHED") {
      ready = true;
      break;
    }
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(
        `Instagram media processing ended with ${status.status_code}`,
      );
    }
    if (attempt < maxPollAttempts - 1) await sleep(pollIntervalMs);
  }
  if (!ready) throw new Error("Instagram media processing timed out");

  const published = await jsonResponse(
    await fetchFn(endpoint(graphApiUrl, `${accountId}/media_publish`), {
      method: "POST",
      headers,
      body: form({ creation_id: create.id, access_token: accessToken }),
    }),
    "media publish",
  );
  if (typeof published.id !== "string" || !published.id) {
    throw new Error("Instagram media publish returned no media ID");
  }
  const media = await jsonResponse(
    await fetchFn(
      `${endpoint(graphApiUrl, published.id)}?${form({ fields: "permalink", access_token: accessToken })}`,
    ),
    "permalink lookup",
  );
  if (typeof media.permalink !== "string" || !media.permalink) {
    throw new Error("Instagram permalink lookup returned no permalink");
  }
  return { id: published.id, url: media.permalink };
}
