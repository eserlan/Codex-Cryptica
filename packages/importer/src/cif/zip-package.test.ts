import { describe, it, expect, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";

import { parseCifPackage } from "./parse";
import { resolveCifAssets } from "./assets";
import {
  normalizeCifPackage,
  buildCifSourceRef,
  cifSourceRefBuilder,
  CIF_MAPPING_RULES,
} from "./normalize";
import { sha256Hex } from "./zip";
import { CifWarningCode } from "./report";
import type { CifManifest } from "./package";
import { ImportEngine } from "../cc/engine";
import { setMatchDecision } from "../cc/session";
import type { VaultWriter, AssetInput } from "../cc/ports";

const lyraBytes = strToU8("lyra-png-bytes");
const mapBytes = strToU8("map-webp-bytes");

async function buildManifest(): Promise<CifManifest> {
  return {
    format: "codex-world-interchange",
    version: "1.0",
    source: { system: "test-tool", worldKey: "coast" },
    world: { title: "Shattered Coast" },
    entities: [
      {
        key: "lyra",
        kind: "character",
        title: "Captain Lyra",
        content: { format: "markdown", body: "A captain." },
        media: [
          { assetKey: "art/lyra", role: "image" },
          { assetKey: "art/map" },
        ],
      },
      {
        key: "port",
        kind: "location",
        title: "Port Ashen",
        content: { format: "markdown", body: "A port." },
      },
    ],
    relationships: [],
    assets: [
      {
        key: "art/lyra",
        path: "assets/lyra.png",
        mediaType: "image/png",
        sha256: await sha256Hex(lyraBytes),
      },
      {
        key: "art/map",
        path: "assets/map.webp",
        mediaType: "image/webp",
        sha256: await sha256Hex(mapBytes),
      },
      {
        key: "art/unused",
        path: "assets/unused.webp",
        mediaType: "image/webp",
        sha256: await sha256Hex(strToU8("unused")),
      },
    ],
  };
}

async function buildZip(): Promise<Uint8Array> {
  const manifest = await buildManifest();
  return zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "assets/lyra.png": lyraBytes,
    "assets/map.webp": mapBytes,
    "assets/unused.webp": strToU8("unused"),
    "notes.txt": strToU8("stray"),
  });
}

function asInput(bytes: Uint8Array, fileName = "world.cif.zip") {
  return {
    fileName,
    size: bytes.byteLength,
    text: async () => new TextDecoder().decode(bytes),
    bytes: async () => bytes,
  };
}

describe("parseCifPackage", () => {
  it("parses a ZIP package end to end", async () => {
    const result = await parseCifPackage(asInput(await buildZip()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.world.title).toBe("Shattered Coast");
    expect(result.zip?.files.size).toBe(3);
    expect(result.zip?.ignoredPaths).toEqual(["notes.txt"]);
  });

  it("still parses plain .cif.json inputs without a zip payload", async () => {
    const manifest = await buildManifest();
    const json = strToU8(JSON.stringify({ ...manifest, assets: [] }));
    const result = await parseCifPackage({
      fileName: "world.cif.json",
      size: json.byteLength,
      text: async () => new TextDecoder().decode(json),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.zip).toBeUndefined();
  });

  it("routes a .json-named file that is really a ZIP through the ZIP path", async () => {
    const result = await parseCifPackage(
      asInput(await buildZip(), "world.cif.json"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.zip?.files.size).toBe(3);
  });

  it("errors when ZIP bytes aren't available", async () => {
    const bytes = await buildZip();
    const result = await parseCifPackage({
      fileName: "world.cif.zip",
      size: bytes.byteLength,
      text: async () => new TextDecoder().decode(bytes),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].code).toBe("zip-bytes-unavailable");
  });
});

describe("normalizeCifPackage with resolved assets", () => {
  it("builds placed asset drafts, warns on extras and unplaced assets", async () => {
    const manifest = await buildManifest();
    const files = new Map([
      ["assets/lyra.png", lyraBytes],
      ["assets/map.webp", mapBytes],
      ["assets/unused.webp", strToU8("unused")],
    ]);
    const resolved = await resolveCifAssets(manifest, files);
    expect(resolved.errors).toEqual([]);

    const { pkg, warnings } = normalizeCifPackage(manifest, {
      assets: resolved.assets,
      zipIgnoredPaths: ["notes.txt"],
    });

    expect(pkg.assetDrafts).toHaveLength(1);
    const draft = pkg.assetDrafts[0];
    expect(draft.placementRef).toBe(
      buildCifSourceRef("test-tool", "coast", "lyra"),
    );
    expect(draft.originalName).toBe("lyra.png");
    expect(draft.mimeType).toBe("image/png");
    expect(draft.contentHash).toBe(await sha256Hex(lyraBytes));

    const codes = warnings.map((w) => w.code);
    expect(codes).toContain(CifWarningCode.AssetExtraImageRef);
    expect(codes).toContain(CifWarningCode.AssetUnplaced);
    expect(codes).toContain(CifWarningCode.ZipIgnoredFile);
    // Precise per-asset reporting replaces the blanket Phase 1 warning.
    expect(codes).not.toContain(CifWarningCode.AssetsNotImported);
  });

  it("keeps the blanket not-imported warning for text-only packages", async () => {
    const manifest = await buildManifest();
    const { warnings } = normalizeCifPackage(manifest);
    expect(warnings.map((w) => w.code)).toContain(
      CifWarningCode.AssetsNotImported,
    );
  });
});

function mockWriter(overrides: Partial<VaultWriter> = {}): VaultWriter {
  let nextId = 0;
  return {
    findBySourceRef: vi.fn().mockResolvedValue(null),
    createEntity: vi
      .fn()
      .mockImplementation(async () => ({ id: `id-${nextId++}` })),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    appendConnection: vi.fn().mockResolvedValue({ created: true }),
    saveAsset: vi.fn().mockResolvedValue({ ref: "asset-ref" }),
    ...overrides,
  };
}

function engineFor(writer: VaultWriter): ImportEngine {
  return new ImportEngine(
    { writer },
    { mappingRules: CIF_MAPPING_RULES, sourceRefBuilder: cifSourceRefBuilder },
  );
}

async function preparedZipSession(writer: VaultWriter) {
  const manifest = await buildManifest();
  const files = new Map([
    ["assets/lyra.png", lyraBytes],
    ["assets/map.webp", mapBytes],
    ["assets/unused.webp", strToU8("unused")],
  ]);
  const resolved = await resolveCifAssets(manifest, files);
  const { pkg } = normalizeCifPackage(manifest, { assets: resolved.assets });
  const engine = engineFor(writer);
  const session = await engine.prepare(pkg);
  return { engine, session };
}

describe("engine commit with ZIP assets", () => {
  it("saves the placed asset attached to its committed entity", async () => {
    const saved: AssetInput[] = [];
    const createdIds = new Map<string, string>();
    let nextId = 0;
    const writer = mockWriter({
      createEntity: vi.fn().mockImplementation(async (input) => {
        const id = `id-${nextId++}`;
        createdIds.set(input.title, id);
        return { id };
      }),
      saveAsset: vi.fn().mockImplementation(async (input: AssetInput) => {
        saved.push(input);
        return { ref: "images/x.webp" };
      }),
    });

    const { engine, session } = await preparedZipSession(writer);
    const report = await engine.commit(session);

    expect(report.failures).toEqual([]);
    expect(report.assetsImported).toBe(1);
    expect(saved).toHaveLength(1);
    expect(saved[0].entityId).toBe(createdIds.get("Captain Lyra"));
    expect(saved[0].mimeType).toBe("image/png");
    expect(saved[0].contentHash).toBe(await sha256Hex(lyraBytes));
  });

  it("does not attach assets to entities skipped in review", async () => {
    const existingRef = buildCifSourceRef("test-tool", "coast", "lyra");
    const writer = mockWriter({
      findBySourceRef: vi
        .fn()
        .mockImplementation(async (ref: string) =>
          ref === existingRef ? { id: "existing-lyra" } : null,
        ),
      getEntityFields: vi.fn().mockResolvedValue(null),
    });

    let { session } = await preparedZipSession(writer);
    const engine = engineFor(writer);
    session = setMatchDecision(session, existingRef, "skip");

    const report = await engine.commit(session);

    expect(writer.saveAsset).not.toHaveBeenCalled();
    expect(report.assetsImported).toBe(0);
    expect(report.assetsSkipped[0]?.reason).toMatch(/skipped in review/i);
  });

  it("records a saveAsset failure without failing the rest of the import", async () => {
    const writer = mockWriter({
      saveAsset: vi.fn().mockRejectedValue(new Error("disk full")),
    });

    const { engine, session } = await preparedZipSession(writer);
    const report = await engine.commit(session);

    expect(report.entitiesCreated).toBe(2);
    expect(report.assetsImported).toBe(0);
    expect(report.failures[0]?.stage).toBe("asset");
    expect(report.failures[0]?.message).toContain("disk full");
  });
});
