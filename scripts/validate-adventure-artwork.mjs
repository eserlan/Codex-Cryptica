import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseCatalogue } from "../packages/adventure-artwork-engine/src/catalogue.ts";

function assertNoMissingHistoricalAssets(oldMap, currentIds) {
  for (const id of oldMap.keys()) {
    if (!currentIds.has(id)) {
      throw new Error(`Missing historical asset ${id}; retain it as withdrawn`);
    }
  }
}

function assertImmutableVariants(asset, prior) {
  for (const variant of ["preview", "display"]) {
    const next = asset.variants[variant];
    const prev = prior.variants[variant];
    if (next.url !== prev.url || next.sha256 !== prev.sha256) {
      throw new Error(
        `Asset ${asset.id} has changed its immutable ${variant} image`,
      );
    }
  }
}

/** Validate the released catalogue and ensure an existing ID retains its variants. */
export function validateCatalogueTransition(current, previous) {
  const assets = parseCatalogue(current);
  const old = new Map(
    parseCatalogue(previous).map((asset) => [asset.id, asset]),
  );
  assertNoMissingHistoricalAssets(
    old,
    new Set(assets.map((asset) => asset.id)),
  );
  for (const asset of assets) {
    const prior = old.get(asset.id);
    if (prior) assertImmutableVariants(asset, prior);
  }
  return assets;
}

/** A release must contain the planned, genuinely distinct, reviewed seed. */
export function validateReleaseCatalogue(current, previous) {
  const assets = validateCatalogueTransition(current, previous);
  const landscapes = assets.filter(
    (asset) => asset.type === "location" && !asset.withdrawn,
  );
  if (
    landscapes.length < 24 ||
    new Set(landscapes.map((asset) => asset.variants.display.sha256)).size < 24
  )
    throw new Error(
      "Release requires at least 24 distinct reviewed location illustrations",
    );
  const genres = [
    "fantasy",
    "contemporary",
    "science-fiction",
    "horror",
    "neutral",
  ];
  if (
    genres.some(
      (genre) => !landscapes.some((asset) => asset.genres.includes(genre)),
    )
  )
    throw new Error("Release lacks required genre coverage");
  return assets;
}

async function readStreamUpToLimit(body, maxBytes, assetId) {
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(`Oversized artwork variant ${assetId}`);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

function hasWebpHeader(bytes) {
  return (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  );
}

function hasExpectedDigest(bytes, expectedSha256) {
  return createHash("sha256").update(bytes).digest("hex") === expectedSha256;
}

function assertValidWebpBytes(bytes, variant, assetId) {
  if (
    bytes.byteLength !== variant.bytes ||
    !hasWebpHeader(bytes) ||
    !hasExpectedDigest(bytes, variant.sha256)
  ) {
    throw new Error(`Invalid artwork bytes for ${assetId}`);
  }
}

async function readBoundedVariantBytes(response, variant, assetId) {
  const bytes = await readStreamUpToLimit(
    response.body,
    variant.bytes,
    assetId,
  );
  assertValidWebpBytes(bytes, variant, assetId);
  return bytes;
}

function hasUnexpectedRedirect(response, expectedUrl) {
  return (
    response.redirected ||
    (Boolean(response.url) && response.url !== expectedUrl)
  );
}

function readContentTypeMime(response) {
  const contentType = response.headers.get("content-type");
  return contentType ? contentType.split(";")[0].trim() : "";
}

function isOkWebpStream(response) {
  return (
    response.ok &&
    Boolean(response.body) &&
    readContentTypeMime(response) === "image/webp"
  );
}

function assertValidVariantResponse(response, expectedUrl, assetId) {
  if (
    !isOkWebpStream(response) ||
    hasUnexpectedRedirect(response, expectedUrl)
  ) {
    throw new Error(`Unable to fetch artwork variant ${assetId}`);
  }
}

async function verifySingleVariant(assetId, variant, fetcher, decode) {
  const response = await fetcher(variant.url, {
    signal: AbortSignal.timeout(8000),
    redirect: "error",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  assertValidVariantResponse(response, variant.url, assetId);
  const bytes = await readBoundedVariantBytes(response, variant, assetId);
  const dimensions = await decode(bytes);
  if (
    dimensions.width !== variant.width ||
    dimensions.height !== variant.height
  ) {
    throw new Error(`Invalid artwork dimensions for ${assetId}`);
  }
}

async function verifyAssetVariants(asset, fetcher, decode) {
  for (const variant of [asset.variants.preview, asset.variants.display]) {
    await verifySingleVariant(asset.id, variant, fetcher, decode);
  }
}

function assertVerificationDeps(fetcher, decode) {
  if (typeof fetcher !== "function" || typeof decode !== "function") {
    throw new Error("Artwork verification requires fetch and an image decoder");
  }
}

/** Check the published variants with a caller-supplied full image decoder. */
export async function verifyArtworkVariants(
  assets,
  { fetch: fetcher, decode },
) {
  assertVerificationDeps(fetcher, decode);
  for (const asset of parseCatalogue(assets)) {
    if (!asset.withdrawn) {
      await verifyAssetVariants(asset, fetcher, decode);
    }
  }
}

/** Use the existing Playwright browser to decode the actual bytes, not headers alone. */
export async function openArtworkDecoder() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    return {
      decode: (bytes) =>
        page.evaluate(async (values) => {
          const bitmap = await createImageBitmap(
            new Blob([new Uint8Array(values)], { type: "image/webp" }),
          );
          try {
            return { width: bitmap.width, height: bitmap.height };
          } finally {
            bitmap.close();
          }
        }, Array.from(bytes)),
      close: () => browser.close(),
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function verifyReleaseAssets(
  assets,
  { fetch: fetcher, openDecoder },
) {
  const decoder = await openDecoder();
  try {
    await verifyArtworkVariants(assets, {
      fetch: fetcher,
      decode: decoder.decode,
    });
  } finally {
    await decoder.close();
  }
}

if (import.meta.main) {
  const [currentPath, previousPath] = process.argv.slice(2);
  if (
    Boolean(currentPath) !== Boolean(previousPath) ||
    process.argv.length > 4
  ) {
    console.error(
      "Usage: bun scripts/validate-adventure-artwork.mjs <current.json> <previous.json>",
    );
    process.exitCode = 1;
  } else {
    try {
      const current = currentPath
        ? JSON.parse(await readFile(currentPath, "utf8"))
        : (
            await import("../packages/adventure-artwork-engine/src/catalogue/seed.ts")
          ).seedArtwork;
      const previous = JSON.parse(
        await readFile(
          previousPath ??
            new URL(
              "../packages/adventure-artwork-engine/src/catalogue/released-baseline.json",
              import.meta.url,
            ),
          "utf8",
        ),
      );
      const assets = currentPath
        ? validateCatalogueTransition(current, previous)
        : validateReleaseCatalogue(current, previous);
      if (!currentPath)
        await verifyReleaseAssets(assets, {
          fetch,
          openDecoder: openArtworkDecoder,
        });
      console.log(
        `Validated ${assets.length} artwork assets${currentPath ? " (metadata only)" : " and their uploaded variants"}.`,
      );
    } catch (error) {
      console.error(
        "Artwork catalogue validation failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exitCode = 1;
    }
  }
}
