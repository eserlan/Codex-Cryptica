import { execFileSync } from "node:child_process";

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

/** Keep mirrored Bluesky/X copy within X's stricter 280-character limit. */
export const BLUESKY_CHARACTER_LIMIT = 280;

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

/** Counts user-perceived characters the same way the Bluesky CLI enforces its limit (scripts/post-to-bluesky.mjs), so multi-code-point graphemes aren't miscounted as oversized. */
export function graphemeLength(text: string): number {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return [...segmenter.segment(text)].length;
  }
  return [...text].length;
}

/** Final post length once the page URL is resolved into the draft, for pre-publish budget checks. */
export function blueskyTextLength(draft: string, pageUrl: string): number {
  return graphemeLength(withVerifiedPageUrl(draft, pageUrl));
}

export function prepareBlueskyText(draft: string, pageUrl: string): string {
  const resolved = withVerifiedPageUrl(draft, pageUrl);
  if (graphemeLength(resolved) <= BLUESKY_CHARACTER_LIMIT) return resolved;
  throw new Error(
    `Bluesky draft exceeds ${BLUESKY_CHARACTER_LIMIT} characters; request a shorter complete rewrite instead of truncating it`,
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
    { encoding: "utf-8" },
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
  const resolvedDraft = withVerifiedPageUrl(draft, asset.pageUrl);
  if (resolvedDraft.includes("[relevant page]")) {
    throw new Error(
      "Discussion draft still contains an unresolved page placeholder",
    );
  }
  const body = `${resolvedDraft}\n\n![${asset.imageAlt}](${asset.imageUrl})`;
  if (isReleaseCommsDryRun()) {
    return {
      url: `dry-run://github-discussion/${encodeURIComponent(asset.pageUrl)}`,
    };
  }
  const output = run(
    "bun",
    ["scripts/post-to-github-discussion.ts", "--title", title, "--body", body],
    { encoding: "utf-8" },
  ).trim();
  const url = output.match(
    /https:\/\/github\.com\/eserlan\/Codex-Cryptica\/discussions\/\d+/,
  )?.[0];
  if (!url) throw new Error(`Discussion publisher returned no URL: ${output}`);
  return { url };
}
