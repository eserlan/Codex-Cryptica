import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";

export interface DiscordDestinationConfig {
  id: string;
  source?: "bluesky";
  strip_hashtags?: boolean;
  auto_publish?: boolean;
  webhookEnvVar?: string;
}

export interface DiscordConfig {
  enabled: boolean;
  destinations: DiscordDestinationConfig[];
}

export const DEFAULT_DISCORD_CONFIG: DiscordConfig = {
  enabled: true,
  destinations: [
    {
      id: "main-community",
      source: "bluesky",
      strip_hashtags: true,
      auto_publish: false,
      webhookEnvVar: "DISCORD_WEBHOOK_URL",
    },
  ],
};

/**
 * Remove standalone hashtags from post text while preserving:
 * - Markdown headers (# Header, ## Header)
 * - GitHub/Issue numbers (#2906, #123)
 * - URL fragments (https://example.com/page#section)
 * - Hex colors (#ffffff, #1a2b3c)
 *
 * Cleans up resulting trailing whitespace and collapses multiple blank lines.
 */
export function stripHashtags(text: string): string {
  if (!text) return "";

  // Match hashtags: preceded by start-of-line or whitespace, '#' followed by a letter, then word chars/hyphens,
  // followed by whitespace, punctuation, or end-of-string.
  // This explicitly excludes:
  // - '# ' (Markdown headings, since space is not a letter)
  // - '#123' (Issue/PR references, since digits are not letters)
  // - 'url#anchor' (Preceded by non-whitespace)
  const pattern = /(^|[\s([{])#([a-zA-Z][\w-]*)(?=[\s.,!?:;)\]}]|$)/g;
  const hexColorPattern = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/;

  const cleaned = text.replace(pattern, (match, prefix, tag) => {
    // Preserve hex colours like #fff / #ffffff
    if (hexColorPattern.test(tag)) return match;
    // Keep the prefix (whitespace/bracket/newline) so words don't run together
    return prefix;
  });

  // Clean up whitespace:
  // 1. Collapse repeated horizontal whitespace left behind by removed hashtags
  // 2. Remove trailing spaces on each line
  // 3. Collapse 3 or more consecutive newlines into 2
  // 4. Trim leading/trailing whitespace
  return cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Derive Discord announcement text from Bluesky post drafts.
 * Strips hashtags from each post while preserving links and formatting.
 */
export function deriveDiscordFromBluesky(
  blueskyDrafts: string[] | undefined,
): string {
  if (!blueskyDrafts || blueskyDrafts.length === 0) {
    return "";
  }

  const cleanedDrafts = blueskyDrafts
    .map((draft) => stripHashtags(draft))
    .filter((draft) => draft.length > 0);

  if (cleanedDrafts.length === 0) {
    return "";
  }

  return cleanedDrafts.join("\n\n---\n\n");
}

/**
 * Load Discord destination configuration from .social/discord-destinations.yaml
 * or .social/discord-destinations.json, falling back to DEFAULT_DISCORD_CONFIG.
 */
export function loadDiscordConfig(
  repositoryRoot: string = process.cwd(),
): DiscordConfig {
  const yamlPath = resolve(repositoryRoot, ".social/discord-destinations.yaml");
  const jsonPath = resolve(repositoryRoot, ".social/discord-destinations.json");

  let rawConfig: unknown = null;

  if (existsSync(yamlPath)) {
    try {
      const content = readFileSync(yamlPath, "utf8");
      rawConfig = parseYaml(content);
    } catch (err) {
      console.warn(`[release-comms] Failed to parse ${yamlPath}:`, err);
    }
  } else if (existsSync(jsonPath)) {
    try {
      const content = readFileSync(jsonPath, "utf8");
      rawConfig = JSON.parse(content);
    } catch (err) {
      console.warn(`[release-comms] Failed to parse ${jsonPath}:`, err);
    }
  }

  if (
    rawConfig &&
    typeof rawConfig === "object" &&
    "discord" in rawConfig &&
    typeof (rawConfig as { discord: unknown }).discord === "object" &&
    (rawConfig as { discord: unknown }).discord !== null
  ) {
    const discord = (rawConfig as { discord: Record<string, unknown> }).discord;
    const destinations = Array.isArray(discord.destinations)
      ? (discord.destinations as DiscordDestinationConfig[])
      : DEFAULT_DISCORD_CONFIG.destinations;

    return {
      enabled: discord.enabled !== false,
      destinations,
    };
  }

  return DEFAULT_DISCORD_CONFIG;
}

/**
 * Resolve the webhook URL for a destination from environment variables.
 * Checks in order:
 * 1. Explicit destination.webhookEnvVar (e.g. DISCORD_WEBHOOK_URL_MAIN_COMMUNITY)
 * 2. DISCORD_WEBHOOK_URL_<DEST_ID>
 * 3. DISCORD_WEBHOOK_URL
 */
export function resolveDiscordWebhookUrl(
  destination: DiscordDestinationConfig,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (destination.webhookEnvVar && env[destination.webhookEnvVar]) {
    return env[destination.webhookEnvVar]!;
  }

  const normalizedId = destination.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const specificVar = `DISCORD_WEBHOOK_URL_${normalizedId}`;
  if (env[specificVar]) {
    return env[specificVar]!;
  }

  return env.DISCORD_WEBHOOK_URL ?? null;
}

export interface PublishDiscordResult {
  destinationId: string;
  success: boolean;
  dryRun?: boolean;
  error?: string;
}

/**
 * Publish a message to a Discord destination via webhook.
 */
export async function publishToDiscord(options: {
  message: string;
  destination: DiscordDestinationConfig;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
}): Promise<PublishDiscordResult> {
  const { destination, message, dryRun = false, env = process.env } = options;
  const fetchFn = options.fetchFn ?? fetch;

  if (dryRun) {
    return {
      destinationId: destination.id,
      success: true,
      dryRun: true,
    };
  }

  const webhookUrl = resolveDiscordWebhookUrl(destination, env);
  if (!webhookUrl) {
    return {
      destinationId: destination.id,
      success: false,
      error: `No webhook URL found for Discord destination '${destination.id}'`,
    };
  }

  try {
    const response = await fetchFn(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        destinationId: destination.id,
        success: false,
        error: `Discord webhook returned status ${response.status}: ${errorText}`,
      };
    }

    return {
      destinationId: destination.id,
      success: true,
    };
  } catch (error) {
    return {
      destinationId: destination.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
