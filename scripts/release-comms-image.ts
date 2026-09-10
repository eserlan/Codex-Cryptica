import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PublicContentItem } from "./release-comms-content.ts";
import type { BlueskyAsset } from "./release-comms-publish.ts";

const ASSET_HOST = "https://assets.codexcryptica.com";
const IMAGE_PROXY =
  process.env.RELEASE_COMMS_IMAGE_PROXY_URL ??
  "https://oracle-proxy.espen-erlandsen.workers.dev";
const R2_BUCKET = "codex-cryptica-statics";

export interface ImageDependencies {
  fetch: typeof fetch;
  run: typeof execFileSync;
}

function imageKey(item: PublicContentItem): string {
  const slug = new URL(item.url).pathname.split("/").filter(Boolean).at(-1);
  if (!slug) throw new Error(`Cannot derive social-image key: ${item.url}`);
  return `og/${slug}.jpg`;
}

function generatedAlt(item: PublicContentItem): string {
  return `A tabletop roleplaying illustration for ${item.title}`;
}

function imagePrompt(item: PublicContentItem): string {
  return [
    "Create a premium 16:9 editorial fantasy illustration for a tabletop roleplaying reference page.",
    `Subject: ${item.title}.`,
    "Show a useful, evocative game-prep scene related to the subject, with no text, logos, watermarks, gore, or copyrighted characters.",
    "Painterly fantasy book-cover style, clear focal point, readable at social-card size.",
  ].join(" ");
}

/**
 * Resolves a verified R2 social card. Missing source metadata is not a reason
 * to abandon a release: create a deterministic R2 card once, then reuse it.
 */
export async function resolveSocialAsset(
  item: PublicContentItem,
  dependencies: Partial<ImageDependencies> = {},
): Promise<BlueskyAsset> {
  if (item.imageUrl && item.imageAlt) {
    return {
      pageUrl: item.url,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
    };
  }

  const fetchImpl = dependencies.fetch ?? fetch;
  const run = dependencies.run ?? execFileSync;
  const key = imageKey(item);
  const imageUrl = `${ASSET_HOST}/${key}`;
  const existing = await fetchImpl(imageUrl, { method: "HEAD" });
  if (existing.ok) {
    return { pageUrl: item.url, imageUrl, imageAlt: generatedAlt(item) };
  }

  const generated = await fetchImpl(`${IMAGE_PROXY}/v1/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: "https://codexcryptica.com",
    },
    body: JSON.stringify({
      prompt: imagePrompt(item),
      width: 1600,
      height: 900,
    }),
  });
  if (!generated.ok) {
    throw new Error(
      `Could not generate social image for ${item.url}: ${generated.status}`,
    );
  }
  const payload = (await generated.json()) as { result?: { image?: string } };
  const image = payload.result?.image;
  if (!image)
    throw new Error(`Image service returned no image for ${item.url}`);

  const directory = await mkdtemp(join(tmpdir(), "release-comms-image-"));
  const source = join(directory, "source.png");
  const target = join(directory, "social.jpg");
  try {
    await writeFile(source, Buffer.from(image, "base64"));
    run("magick", [
      source,
      "-resize",
      "1600x900^",
      "-gravity",
      "center",
      "-extent",
      "1600x900",
      "-quality",
      "88",
      target,
    ]);
    run(
      "bunx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        `${R2_BUCKET}/${key}`,
        `--file=${target}`,
        "--content-type=image/jpeg",
        "--remote",
      ],
      { stdio: "inherit" },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  return { pageUrl: item.url, imageUrl, imageAlt: generatedAlt(item) };
}
