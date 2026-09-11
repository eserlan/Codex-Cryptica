import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { EvaluatorResult, WriterResult } from "./release-comms-types.ts";

export interface XPublication {
  id: string;
  url: string;
}

export interface PublishXPostOptions {
  /** The exact final text already published to Bluesky. */
  text: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
}

const DEFAULT_X_POST_URL = "https://api.x.com/2/tweets";
const DEFAULT_X_TOKEN_URL = "https://api.x.com/2/oauth2/token";

/** X always mirrors Bluesky; the evaluator never needs separate X copy. */
export function deriveXQualification(
  result: EvaluatorResult,
  drafts: WriterResult,
): string[] | undefined {
  const hasBlueskyDrafts = drafts.bluesky.length > 0;
  const hasBlueskyWorthy = Boolean(
    result.features?.some((feature) => feature.bluesky_worthy),
  );
  const channelsWithoutX = (result.recommended_channels ?? []).filter(
    (channel) => channel !== "x",
  );
  return hasBlueskyDrafts || hasBlueskyWorthy
    ? Array.from(new Set([...channelsWithoutX, "x"]))
    : channelsWithoutX;
}

/** X publishing is enabled when a user OAuth token has been configured. */
export function isXPublishingEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    Boolean(env.X_ACCESS_TOKEN?.trim()) &&
    env.X_AUTO_PUBLISH !== "0" &&
    env.X_AUTO_PUBLISH !== "false"
  );
}

function absoluteHttpsUrl(value: string, envVarName: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envVarName} must be an absolute HTTPS URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${envVarName} must be an HTTPS URL`);
  }
  return url.toString();
}

function xPostUrl(env: NodeJS.ProcessEnv): string {
  return absoluteHttpsUrl(
    env.X_POST_URL?.trim() || DEFAULT_X_POST_URL,
    "X_POST_URL",
  );
}

function xTokenUrl(env: NodeJS.ProcessEnv): string {
  return absoluteHttpsUrl(
    env.X_TOKEN_URL?.trim() || DEFAULT_X_TOKEN_URL,
    "X_TOKEN_URL",
  );
}

interface RefreshedXTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Exchange a stored refresh token for a new user access token.
 * X's OAuth 2.0 user-context access tokens expire in ~2 hours; this keeps
 * the publisher usable across an unattended webhook without re-authorizing.
 */
async function refreshXAccessToken(
  env: NodeJS.ProcessEnv,
  fetchFn: typeof fetch,
): Promise<RefreshedXTokens | undefined> {
  const clientId = env.X_CLIENT_ID?.trim();
  const clientSecret = env.X_CLIENT_SECRET?.trim();
  const refreshToken = env.X_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return undefined;

  const response = await fetchFn(xTokenUrl(env), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`X token refresh failed with status ${response.status}`);
  }
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!body.access_token) {
    throw new Error("X token refresh returned no access_token");
  }
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}

/**
 * Persist a refreshed token pair to the systemd EnvironmentFile so the
 * webhook service keeps working after a restart, not just this process.
 * Best-effort: a write failure must not fail the publish that triggered it.
 */
function persistRefreshedXTokens(
  env: NodeJS.ProcessEnv,
  tokens: RefreshedXTokens,
): void {
  env.X_ACCESS_TOKEN = tokens.accessToken;
  if (tokens.refreshToken) env.X_REFRESH_TOKEN = tokens.refreshToken;

  const envFilePath = env.X_ENV_FILE?.trim();
  if (!envFilePath || !existsSync(envFilePath)) return;
  try {
    const lines = readFileSync(envFilePath, "utf8").split("\n");
    const updates: Record<string, string> = {
      X_ACCESS_TOKEN: tokens.accessToken,
      ...(tokens.refreshToken ? { X_REFRESH_TOKEN: tokens.refreshToken } : {}),
    };
    const seen = new Set<string>();
    const next = lines.map((line) => {
      const key = line.split("=")[0];
      if (key && key in updates) {
        seen.add(key);
        return `${key}=${updates[key]}`;
      }
      return line;
    });
    for (const [key, value] of Object.entries(updates)) {
      if (!seen.has(key)) next.push(`${key}=${value}`);
    }
    writeFileSync(envFilePath, next.join("\n"));
    chmodSync(envFilePath, 0o600);
  } catch (error) {
    console.error(
      `[release-comms] failed to persist refreshed X tokens to ${envFilePath}:`,
      error,
    );
  }
}

/** Publish one exact Bluesky message through X's official Create Post API. */
export async function publishXPost(
  options: PublishXPostOptions,
): Promise<XPublication> {
  const { text, dryRun = false, env = process.env, fetchFn = fetch } = options;
  if (!text.trim()) throw new Error("X post text must not be empty");
  if (dryRun) {
    return {
      id: "dry-run",
      url: `dry-run://x/${encodeURIComponent(text)}`,
    };
  }

  let accessToken = env.X_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("Missing required environment variable: X_ACCESS_TOKEN");
  }

  const post = () =>
    fetchFn(xPostUrl(env), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

  let response = await post();
  if (response.status === 401) {
    const refreshed = await refreshXAccessToken(env, fetchFn);
    if (refreshed) {
      persistRefreshedXTokens(env, refreshed);
      accessToken = refreshed.accessToken;
      response = await post();
    }
  }
  if (!response.ok) {
    throw new Error(`X post creation failed with status ${response.status}`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("X post creation returned invalid JSON");
  }
  const id =
    body &&
    typeof body === "object" &&
    "data" in body &&
    body.data &&
    typeof body.data === "object" &&
    "id" in body.data &&
    typeof body.data.id === "string"
      ? body.data.id
      : "";
  if (!id) throw new Error("X post creation returned no post ID");
  return { id, url: `https://x.com/i/web/status/${encodeURIComponent(id)}` };
}
