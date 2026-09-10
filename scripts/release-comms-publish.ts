import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export interface BlueskyAsset {
  pageUrl: string;
  imageUrl: string;
  imageAlt: string;
}

export interface BlueskyPublication {
  text: string;
  url: string;
}

export interface DiscussionPublication {
  url: string;
}

/** Avoid every external write while still exercising the production flow. */
export function isReleaseCommsDryRun(): boolean {
  return process.env.RELEASE_COMMS_DRY_RUN === "1";
}

function withVerifiedPageUrl(draft: string, pageUrl: string): string {
  const resolved = draft
    .replaceAll("https://codexcryptica.com/[relevant page]", pageUrl)
    .replaceAll("codexcryptica.com/[relevant page]", pageUrl);
  return resolved.includes(pageUrl) ? resolved : `${resolved}\n\n${pageUrl}`;
}

export function prepareBlueskyText(draft: string, pageUrl: string): string {
  const resolved = withVerifiedPageUrl(draft, pageUrl);
  if ([...resolved].length <= 300) return resolved;
  throw new Error(
    "Bluesky draft exceeds 300 characters; request a shorter complete rewrite instead of truncating it",
  );
}

export function publishBlueskyPost(
  draft: string,
  asset: BlueskyAsset,
  run: typeof execFileSync = execFileSync,
): BlueskyPublication {
  const text = prepareBlueskyText(draft, asset.pageUrl);
  if (text.includes("[relevant page]")) {
    throw new Error(
      "Bluesky draft still contains an unresolved page placeholder",
    );
  }
  if (isReleaseCommsDryRun()) {
    return {
      text,
      url: `dry-run://bluesky/${encodeURIComponent(asset.pageUrl)}`,
    };
  }
  const output = run(
    "bun",
    [
      "scripts/post-to-bluesky.mjs",
      "--image",
      asset.imageUrl,
      "--alt",
      asset.imageAlt,
      text,
    ],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  ).trim();
  const url = output.match(/https:\/\/bsky\.app\/profile\/\S+/)?.[0];
  if (!url)
    throw new Error(`Bluesky publisher returned no post URL: ${output}`);
  return { text, url };
}

export function publishDiscussion(
  title: string,
  draft: string,
  asset: BlueskyAsset,
  run: typeof execFileSync = execFileSync,
): DiscussionPublication {
  const body = `${withVerifiedPageUrl(draft, asset.pageUrl)}\n\n![${asset.imageAlt}](${asset.imageUrl})`;
  if (isReleaseCommsDryRun()) {
    return {
      url: `dry-run://github-discussion/${encodeURIComponent(asset.pageUrl)}`,
    };
  }
  const output = run(
    "bun",
    ["scripts/post-to-github-discussion.ts", "--title", title, "--body", body],
    { cwd: REPOSITORY_ROOT, encoding: "utf-8" },
  ).trim();
  const url = output.match(
    /https:\/\/github\.com\/eserlan\/Codex-Cryptica\/discussions\/\d+/,
  )?.[0];
  if (!url) throw new Error(`Discussion publisher returned no URL: ${output}`);
  return { url };
}
