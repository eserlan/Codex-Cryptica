import { describe, it, expect } from "vitest";
import { strToU8 } from "fflate";

import { resolveCifAssets } from "./assets";
import { sha256Hex } from "./zip";
import { CifWarningCode } from "./report";
import type { CifManifest } from "./package";

const pngBytes = strToU8("fake-png-bytes");

async function manifestWith(
  assets: CifManifest["assets"],
): Promise<CifManifest> {
  return {
    format: "codex-world-interchange",
    version: "1.0",
    source: { system: "test-tool", worldKey: "w" },
    world: { title: "World" },
    entities: [],
    relationships: [],
    assets,
  };
}

describe("resolveCifAssets", () => {
  it("resolves a declared image whose digest matches", async () => {
    const digest = await sha256Hex(pngBytes);
    const manifest = await manifestWith([
      {
        key: "art/lyra",
        path: "assets/lyra.png",
        mediaType: "image/png",
        sha256: digest,
      },
    ]);
    const result = await resolveCifAssets(
      manifest,
      new Map([["assets/lyra.png", pngBytes]]),
    );

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    const resolved = result.assets.get("art/lyra");
    expect(resolved?.fileName).toBe("lyra.png");
    expect(resolved?.sha256).toBe(digest);
    expect(resolved?.bytes).toBe(pngBytes);
  });

  it("blocks the package on a checksum mismatch", async () => {
    const manifest = await manifestWith([
      {
        key: "art/lyra",
        path: "assets/lyra.png",
        mediaType: "image/png",
        sha256: "0".repeat(64),
      },
    ]);
    const result = await resolveCifAssets(
      manifest,
      new Map([["assets/lyra.png", pngBytes]]),
    );
    expect(result.errors[0]?.code).toBe("asset-checksum-mismatch");
    expect(result.assets.size).toBe(0);
  });

  it("blocks when a declared file is missing from the archive", async () => {
    const digest = await sha256Hex(pngBytes);
    const manifest = await manifestWith([
      {
        key: "art/lyra",
        path: "assets/gone.png",
        mediaType: "image/png",
        sha256: digest,
      },
    ]);
    const result = await resolveCifAssets(manifest, new Map());
    expect(result.errors[0]?.code).toBe("asset-missing-file");
  });

  it("blocks paths outside the assets folder", async () => {
    const digest = await sha256Hex(pngBytes);
    const manifest = await manifestWith([
      {
        key: "art/evil",
        path: "manifest.json",
        mediaType: "image/png",
        sha256: digest,
      },
    ]);
    const result = await resolveCifAssets(
      manifest,
      new Map([["manifest.json", pngBytes]]),
    );
    expect(result.errors[0]?.code).toBe("asset-unsafe-path");
  });

  it("warns and skips url-only assets", async () => {
    const manifest = await manifestWith([
      {
        key: "art/remote",
        url: "https://example.com/lyra.png",
        mediaType: "image/png",
      },
    ]);
    const result = await resolveCifAssets(manifest, new Map());
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]?.code).toBe(CifWarningCode.AssetUrlNotImported);
  });

  it("warns and skips non-image media types", async () => {
    const digest = await sha256Hex(pngBytes);
    const manifest = await manifestWith([
      {
        key: "audio/theme",
        path: "assets/theme.ogg",
        mediaType: "audio/ogg",
        sha256: digest,
      },
    ]);
    const result = await resolveCifAssets(
      manifest,
      new Map([["assets/theme.ogg", pngBytes]]),
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]?.code).toBe(CifWarningCode.AssetUnsupportedType);
    expect(result.assets.size).toBe(0);
  });
});
