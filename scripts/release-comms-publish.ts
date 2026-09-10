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

export function prepareBlueskyText(draft: string, pageUrl: string): string {
  const resolved = draft.replace("codexcryptica.com/[relevant page]", pageUrl);
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
  const body = `${draft.replaceAll("codexcryptica.com/[relevant page]", asset.pageUrl)}\n\n![${asset.imageAlt}](${asset.imageUrl})`;
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
