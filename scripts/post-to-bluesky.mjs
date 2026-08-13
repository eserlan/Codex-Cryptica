#!/usr/bin/env bun
/**
 * Posts a single short message (with 1-4 required images) to Bluesky via the
 * AT Protocol's XRPC REST endpoints directly (no @atproto/api dependency) —
 * the handful of calls this needs (createSession, uploadBlob, createRecord)
 * don't justify pulling in the SDK.
 *
 * Video/animated-GIF embeds are NOT supported here: Bluesky routes video
 * through a separate transcoding service with async job polling, and GIFs
 * aren't animated blob-embeds (they'd render as a static first frame) — both
 * are a meaningfully bigger feature than this script covers today.
 *
 * Usage:
 *   bun scripts/post-to-bluesky.mjs --image path/to/shot.png --alt "Description of the image" "Post text"
 *   bun scripts/post-to-bluesky.mjs --image https://assets.codexcryptica.com/shot.png --alt "..." "Post text"
 *   bun scripts/post-to-bluesky.mjs --image a.png --alt "First" --image b.png --alt "Second" "Post text"
 *   echo "some text" | bun scripts/post-to-bluesky.mjs --image path/to/shot.png --alt "..."
 *   bun scripts/post-to-bluesky.mjs --dry-run --image path/to/shot.png --alt "..." "preview without posting"
 *
 * `--image` accepts either a local file path or an http(s) URL (e.g. a
 * Cloudflare R2 asset) — URLs are fetched and re-uploaded as a proper
 * Bluesky image blob, so the image renders inline in the post rather than
 * as a separate link-preview card. Repeat `--image`/`--alt` in pairs for up
 * to 4 images (Bluesky's own per-post limit).
 *
 * Requires BLUESKY_IDENTIFIER (handle or email) and BLUESKY_APP_PASSWORD
 * in .env — Bun loads .env automatically, don't source it manually.
 * Create an app password at https://bsky.app/settings/app-passwords
 * (never use the main account password here).
 */

import { readFile } from "node:fs/promises";

const BLUESKY_MAX_GRAPHEMES = 300;
const BLUESKY_MAX_IMAGE_BYTES = 1_000_000;
const BLUESKY_MAX_IMAGES = 4;
const PDS_URL = "https://bsky.social";

const IMAGE_MIME_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const SUPPORTED_MIME_TYPES = new Set(Object.values(IMAGE_MIME_TYPES));

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function graphemeLength(text) {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return [...segmenter.segment(text)].length;
  }
  return [...text].length;
}

/**
 * Pulls every `--image <path> --alt <text>` pair out of `args` in place,
 * in the order given, so multiple images stay paired with their own alt
 * text. Leaves any non-image/alt tokens (the post text) untouched.
 */
function extractImagePairs(args) {
  const pairs = [];
  let i = 0;
  while (i < args.length) {
    if (args[i] === "--image") {
      const imagePathOrUrl = args[i + 1];
      let alt;
      let removeCount = 2;
      if (args[i + 2] === "--alt") {
        alt = args[i + 3];
        removeCount = 4;
      }
      pairs.push({ imagePathOrUrl, alt });
      args.splice(i, removeCount);
      continue;
    }
    i++;
  }
  return pairs;
}

function mimeTypeForImagePath(imagePathOrUrl) {
  // Strip a query string before reading the extension, so R2/CDN URLs like
  // `.../shot.png?v=2` still resolve correctly.
  const withoutQuery = imagePathOrUrl.split("?")[0];
  const ext = withoutQuery.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_MIME_TYPES[ext] : undefined;
}

/**
 * Locates hashtag-like `#word` tokens in the post text and computes the
 * facet metadata Bluesky needs to render them as real, clickable/searchable
 * tags — a bare `#word` in the raw text alone renders as inert plain text.
 * Facet byte offsets are UTF-8 byte positions (not JS string/character
 * indices), so each match's prefix is re-encoded to find its true offset.
 */
function computeHashtagFacets(text) {
  const encoder = new TextEncoder();
  const facets = [];
  const pattern = /#[a-zA-Z][\w-]*/g;
  let match;
  while ((match = pattern.exec(text))) {
    const tag = match[0].slice(1);
    const byteStart = encoder.encode(text.slice(0, match.index)).length;
    const byteEnd = byteStart + encoder.encode(match[0]).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag }],
    });
  }
  return facets;
}

/**
 * Locates URLs — both `https://...` and bare domains like
 * `codexcryptica.com/...` — and computes the facet metadata Bluesky needs to
 * render them as real, clickable links. Mirrors the detection approach
 * documented at docs.bsky.app/docs/advanced-guides/post-richtext: match
 * explicit protocol URLs OR letter-led domain-dot-word patterns, then strip
 * trailing sentence punctuation the regex's greedy `\S*` tail would
 * otherwise sweep in (a period ending the sentence, a comma, a closing
 * paren). Bare domains get `https://` prepended for the facet's `uri` —
 * the visible text is left exactly as written.
 */
function computeLinkFacets(text) {
  const encoder = new TextEncoder();
  const facets = [];
  const pattern = /https?:\/\/\S+|[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+\S*/g;
  let match;
  while ((match = pattern.exec(text))) {
    const trimmed = match[0].replace(/[.,;:!?)\]}]+$/, "");
    if (!trimmed) continue;
    const uri = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const byteStart = encoder.encode(text.slice(0, match.index)).length;
    const byteEnd = byteStart + encoder.encode(trimmed).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#link", uri }],
    });
  }
  return facets;
}

async function loadImageBytes(imagePathOrUrl) {
  if (/^https?:\/\//i.test(imagePathOrUrl)) {
    let response;
    try {
      response = await fetch(imagePathOrUrl);
    } catch (err) {
      throw new Error(
        `Failed to fetch image from ${imagePathOrUrl}: ${err.message || err}`,
        { cause: err },
      );
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image from ${imagePathOrUrl} (${response.status} ${response.statusText})`,
      );
    }
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();
    const bytes = Buffer.from(await response.arrayBuffer());
    const mimeType = SUPPORTED_MIME_TYPES.has(contentType)
      ? contentType
      : mimeTypeForImagePath(imagePathOrUrl);
    return { bytes, mimeType };
  }

  let bytes;
  try {
    bytes = await readFile(imagePathOrUrl);
  } catch {
    throw new Error(`Image not found: ${imagePathOrUrl}`);
  }
  return { bytes, mimeType: mimeTypeForImagePath(imagePathOrUrl) };
}

async function createSession(identifier, password) {
  const response = await fetch(
    `${PDS_URL}/xrpc/com.atproto.server.createSession`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Bluesky auth failed (${response.status}): ${body || response.statusText}`,
    );
  }
  return response.json();
}

async function uploadImage(accessJwt, bytes, mimeType) {
  const response = await fetch(`${PDS_URL}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      Authorization: `Bearer ${accessJwt}`,
    },
    body: bytes,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Bluesky image upload failed (${response.status}): ${body || response.statusText}`,
    );
  }
  const data = await response.json();
  return data.blob;
}

async function createPost(accessJwt, did, text, facets, images) {
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    embed: {
      $type: "app.bsky.embed.images",
      images: images.map(({ blob, alt }) => ({ image: blob, alt })),
    },
  };
  if (facets.length > 0) {
    record.facets = facets;
  }

  const response = await fetch(
    `${PDS_URL}/xrpc/com.atproto.repo.createRecord`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessJwt}`,
      },
      body: JSON.stringify({
        repo: did,
        collection: "app.bsky.feed.post",
        record,
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Bluesky post failed (${response.status}): ${body || response.statusText}`,
    );
  }
  return response.json();
}

function postUrlFromUri(uri, handle) {
  // at://did:plc:xxx/app.bsky.feed.post/<rkey> -> the public post URL,
  // using the handle (not the DID) since that's what's actually shareable.
  const rkey = uri.split("/").pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const remaining = args.filter((a) => a !== "--dry-run");
  const imagePairs = extractImagePairs(remaining);

  let text = remaining.join(" ").trim();
  if (!text) {
    text = (await readStdin()).trim();
  }

  if (!text) {
    console.error(
      "No message text given. Pass it as an argument or pipe it via stdin.",
    );
    process.exit(1);
  }

  if (imagePairs.length === 0) {
    console.error(
      "Missing --image <path-or-url> --alt \"description\". Every post needs at least one image (video/animated GIF aren't supported here yet).",
    );
    process.exit(1);
  }
  if (imagePairs.length > BLUESKY_MAX_IMAGES) {
    console.error(
      `${imagePairs.length} images given, over Bluesky's ${BLUESKY_MAX_IMAGES}-image-per-post limit.`,
    );
    process.exit(1);
  }
  for (const { imagePathOrUrl, alt } of imagePairs) {
    if (!imagePathOrUrl) {
      console.error("A --image flag is missing its path/URL value.");
      process.exit(1);
    }
    if (!alt) {
      console.error(
        `Missing --alt "description" for image ${imagePathOrUrl}. Alt text is required for every image.`,
      );
      process.exit(1);
    }
  }

  const length = graphemeLength(text);
  if (length > BLUESKY_MAX_GRAPHEMES) {
    console.error(
      `Message is ${length} characters, over Bluesky's ${BLUESKY_MAX_GRAPHEMES}-character limit. Trim it and try again.`,
    );
    process.exit(1);
  }

  const linkFacets = computeLinkFacets(text);
  const tagFacets = computeHashtagFacets(text);
  const facets = [...linkFacets, ...tagFacets];

  const loadedImages = [];
  for (const { imagePathOrUrl, alt } of imagePairs) {
    const { bytes, mimeType } = await loadImageBytes(imagePathOrUrl);
    if (!mimeType) {
      console.error(
        `Couldn't determine the image type for ${imagePathOrUrl}. Use a .png, .jpg/.jpeg, or .webp file/URL.`,
      );
      process.exit(1);
    }
    if (bytes.length > BLUESKY_MAX_IMAGE_BYTES) {
      console.error(
        `Image ${imagePathOrUrl} is ${bytes.length} bytes, over Bluesky's ${BLUESKY_MAX_IMAGE_BYTES}-byte limit for post images.`,
      );
      process.exit(1);
    }
    loadedImages.push({ imagePathOrUrl, alt, bytes, mimeType });
  }

  if (dryRun) {
    const imageSummary = loadedImages
      .map(
        (img) =>
          `  - ${img.imagePathOrUrl} (${img.bytes.length} bytes, ${img.mimeType}, alt: "${img.alt}")`,
      )
      .join("\n");
    console.log(
      `[dry-run] Would post (${length} chars, ${tagFacets.length} tag${tagFacets.length === 1 ? "" : "s"}, ${linkFacets.length} link${linkFacets.length === 1 ? "" : "s"}) with ${loadedImages.length} image${loadedImages.length === 1 ? "" : "s"}:\n${imageSummary}\n\n${text}`,
    );
    return;
  }

  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) {
    console.error(
      "BLUESKY_IDENTIFIER and/or BLUESKY_APP_PASSWORD not set (check .env).",
    );
    process.exit(1);
  }

  const session = await createSession(identifier, password);
  const uploadedImages = [];
  for (const img of loadedImages) {
    const blob = await uploadImage(session.accessJwt, img.bytes, img.mimeType);
    uploadedImages.push({ blob, alt: img.alt });
  }
  const record = await createPost(
    session.accessJwt,
    session.did,
    text,
    facets,
    uploadedImages,
  );

  console.log(
    `Posted (${length} chars, with ${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"}).`,
  );
  console.log(postUrlFromUri(record.uri, session.handle));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
