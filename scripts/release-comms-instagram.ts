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

export function isInstagramPublishingEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    env.INSTAGRAM_AUTO_PUBLISH === "0" ||
    env.INSTAGRAM_AUTO_PUBLISH === "false" ||
    env.RELEASE_COMMS_INSTAGRAM_ENABLED === "0" ||
    env.RELEASE_COMMS_INSTAGRAM_ENABLED === "false"
  ) {
    return false;
  }
  return true;
}

export interface PublishInstagramOptions {
  asset: BlueskyAsset;
  /** The final Bluesky caption, preserved byte-for-byte for Instagram. */
  caption: string;
  /** An already published Meta media ID to look up permalink for, bypassing creation and media publish. */
  publishedMediaId?: string;
  /** Invoked immediately after media_publish succeeds, before permalink lookup, to checkpoint the media ID. */
  onMediaPublished?: (mediaId: string) => Promise<void> | void;
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

/** Look up the permalink for an already published Meta media item. */
export async function lookupInstagramPermalink(
  mediaId: string,
  options: {
    env?: NodeJS.ProcessEnv;
    fetchFn?: typeof fetch;
    dryRun?: boolean;
  } = {},
): Promise<string> {
  if (options.dryRun) {
    return `dry-run://instagram/media/${encodeURIComponent(mediaId)}`;
  }
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? fetch;
  const accessToken = requiredEnv(env, "INSTAGRAM_ACCESS_TOKEN");
  const graphApiUrl = parseGraphApiUrl(
    requiredEnv(env, "INSTAGRAM_GRAPH_API_URL"),
  );
  const media = await jsonResponse(
    await fetchFn(
      `${endpoint(graphApiUrl, mediaId)}?${form({ fields: "permalink", access_token: accessToken })}`,
    ),
    "permalink lookup",
  );
  if (typeof media.permalink !== "string" || !media.permalink) {
    throw new Error("Instagram permalink lookup returned no permalink");
  }
  return media.permalink;
}

/** Publish one Instagram image post through Meta Graph API. */
export async function publishInstagramPost(
  options: PublishInstagramOptions,
): Promise<InstagramPublication> {
  const { asset, caption, env = process.env, fetchFn = fetch } = options;
  if (!caption) throw new Error("Instagram caption must not be empty");
  requireR2SocialImage(asset.imageUrl);
  if (options.dryRun) {
    const dryRunId = options.publishedMediaId ?? "dry-run";
    if (options.onMediaPublished && !options.publishedMediaId) {
      await options.onMediaPublished(dryRunId);
    }
    return {
      id: dryRunId,
      url: `dry-run://instagram/${encodeURIComponent(asset.pageUrl)}`,
    };
  }

  const accountId = requiredEnv(env, "INSTAGRAM_ACCOUNT_ID");
  const accessToken = requiredEnv(env, "INSTAGRAM_ACCESS_TOKEN");
  const graphApiUrl = parseGraphApiUrl(
    requiredEnv(env, "INSTAGRAM_GRAPH_API_URL"),
  );

  // If this handoff already completed media_publish on a previous attempt,
  // recover only the permalink instead of creating duplicate media posts.
  if (options.publishedMediaId) {
    const permalink = await lookupInstagramPermalink(options.publishedMediaId, {
      env,
      fetchFn,
      dryRun: false,
    });
    return { id: options.publishedMediaId, url: permalink };
  }

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

  // Checkpoint the published media ID before looking up the permalink.
  // If the permalink lookup fails transiently, subsequent retries can
  // recover the permalink using this ID rather than creating a duplicate post.
  if (options.onMediaPublished) {
    await options.onMediaPublished(published.id);
  }

  const permalink = await lookupInstagramPermalink(published.id, {
    env,
    fetchFn,
    dryRun: false,
  });
  return { id: published.id, url: permalink };
}
