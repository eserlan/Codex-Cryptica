/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPack } from "@codex/content-packs";
import {
  ImportSettingsController,
  type ImportSettingsControllerDeps,
} from "./import-settings-controller.svelte";
import { mapThemeToGenre } from "./theme-mapper";
import { isScabardExport } from "@codex/importer";
import type { DroppedItem } from "@codex/importer";

const fsMocks = vi.hoisted(() => ({
  pickDirectory: vi.fn(),
  isFileSystemAccessSupported: vi.fn(() => true),
}));
vi.mock("$lib/utils/fs", () => fsMocks);

function baseDeps(
  overrides: Partial<ImportSettingsControllerDeps> = {},
): ImportSettingsControllerDeps {
  return {
    oracle: {
      isEnabled: true,
      effectiveApiKey: null,
    } as any,
    vault: {
      entities: {},
      allEntities: [],
      createEntity: async () => "",
      updateEntity: async () => true,
      batchCreateEntities: async () => {},
      addConnection: async () => true,
      suspendSaving: () => {},
      resumeSaving: () => {},
      flushPendingSaves: async () => {},
      saveImageToVault: async () => ({ image: "", thumbnail: "" }),
    } as any,
    importQueue: {
      activeItemChunks: {},
      updateChunkStatus: () => {},
    } as any,
    aiClientManager: {
      getModel: () => {
        throw new Error("AI must not be called in this test");
      },
    } as any,
    modalUIStore: { isImporting: false } as any,
    connectionModeStore: { abortSignal: new AbortController().signal } as any,
    notificationStore: { notify: () => {} } as any,
    themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    ...overrides,
  };
}

describe("import-settings-controller helpers", () => {
  it("maps workspace and unknown themes to fantasy", () => {
    expect(mapThemeToGenre("workspace")).toBe("fantasy");
    expect(mapThemeToGenre("")).toBe("fantasy");
  });

  it("maps known alternate theme ids to their importer genres", () => {
    expect(mapThemeToGenre("fallout")).toBe("apocalyptic");
    expect(mapThemeToGenre("modern")).toBe("cyberpunk");
    expect(mapThemeToGenre("western")).toBe("steampunk");
    expect(mapThemeToGenre("space-opera-resistance")).toBe("scifi");
  });

  it("detects scabard exports from pages and conns arrays", () => {
    expect(isScabardExport({ pages: [], conns: [] })).toBe(true);
    expect(isScabardExport({ pages: [], conns: {}, foo: "bar" })).toBe(false);
    expect(isScabardExport(null)).toBe(false);
  });

  it("prepares real scabard JSON as a deterministic review session", async () => {
    const rawData = readFileSync(
      resolve(
        process.cwd(),
        "../../packages/importer/tests/cc/fixtures/london-calling-campaign.json",
      ),
      "utf-8",
    );

    const deps: ImportSettingsControllerDeps = {
      oracle: {
        isEnabled: false,
        effectiveApiKey: null,
      } as any,
      vault: {
        entities: {},
        allEntities: [],
        createEntity: async () => "",
        updateEntity: async () => true,
        batchCreateEntities: async () => {},
        addConnection: async () => true,
        suspendSaving: () => {},
        resumeSaving: () => {},
        flushPendingSaves: async () => {},
        saveImageToVault: async () => ({ image: "", thumbnail: "" }),
      } as any,
      importQueue: {
        activeItemChunks: {},
        updateChunkStatus: () => {},
      } as any,
      aiClientManager: {
        getModel: () => {
          throw new Error("Scabard import must not request an AI model");
        },
      } as any,
      modalUIStore: { isImporting: false } as any,
      connectionModeStore: { abortSignal: new AbortController().signal } as any,
      notificationStore: { notify: () => {} } as any,
      themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    };

    const controller = new ImportSettingsController(deps);
    const file = new File([rawData], "london-calling-campaign.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("cc");
    expect(controller.ccSession?.sourceSystem).toBe("scabard");
    expect(controller.ccSession?.items.length).toBeGreaterThan(0);
    expect(controller.ccSession?.relationships.length).toBeGreaterThan(0);
  });

  it("surfaces a clear rejected-file reason when Oracle analysis fails, instead of silently importing nothing", async () => {
    const deps: ImportSettingsControllerDeps = {
      oracle: {
        // Matches production: isEnabled is always true, so unavailability can
        // only be detected by the analysis call actually failing.
        isEnabled: true,
        effectiveApiKey: null,
      } as any,
      vault: {
        entities: {},
        allEntities: [],
        createEntity: async () => "",
        updateEntity: async () => true,
        batchCreateEntities: async () => {},
        addConnection: async () => true,
        suspendSaving: () => {},
        resumeSaving: () => {},
        flushPendingSaves: async () => {},
        saveImageToVault: async () => ({ image: "", thumbnail: "" }),
      } as any,
      importQueue: {
        activeItemChunks: {},
        updateChunkStatus: () => {},
      } as any,
      aiClientManager: {
        getModel: () => {
          throw new Error("Failed to fetch");
        },
      } as any,
      modalUIStore: { isImporting: false } as any,
      connectionModeStore: { abortSignal: new AbortController().signal } as any,
      notificationStore: { notify: () => {} } as any,
      themeStore: { worldThemeId: "workspace", activeTheme: null } as any,
    };

    const controller = new ImportSettingsController(deps);
    const file = new File(
      ["Primary Deity: Sol-Varon, The Radiant Tyrant."],
      "notes.txt",
      { type: "text/plain" },
    );

    await controller.handleFiles([file]);

    // No ccSession is produced, so the review step (which only renders
    // CCImportReview) would be a dead end — upload still shows rejectedFiles
    // via ImportSourcePicker, so that's where the user should land.
    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles).toHaveLength(1);
    expect(controller.rejectedFiles[0].name).toBe("notes.txt");
    expect(controller.rejectedFiles[0].reason).toMatch(/no model produced/i);
  });

  it("routes successful Oracle analysis through the same rich review/report pipeline as Scabard/Chronica", async () => {
    const mockResponse = JSON.stringify([
      {
        title: "Hero",
        type: "Character",
        chronicle: "A brave warrior.",
        detectedLinks: [{ target: "Sword", label: "wields" }],
      },
      {
        title: "Sword",
        type: "Item",
        chronicle: "A gleaming blade.",
      },
    ]);

    const deps = baseDeps({
      aiClientManager: {
        getModel: () => ({
          generateContent: async () => ({
            response: { text: () => mockResponse },
          }),
        }),
      } as any,
    });

    const controller = new ImportSettingsController(deps);
    const file = new File(["Hero wields the Sword."], "notes.txt", {
      type: "text/plain",
    });

    await controller.handleFiles([file]);

    expect(controller.rejectedFiles).toEqual([]);
    expect(controller.step).toBe("review");
    expect(controller.ccSession?.sourceSystem).toBe("oracle");

    const hero = controller.ccSession?.items.find(
      (item) => item.draft.title === "Hero",
    );
    expect(hero?.resolvedType).toBe("character");

    const sword = controller.ccSession?.items.find(
      (item) => item.draft.title === "Sword",
    );
    expect(sword?.resolvedType).toBe("item");

    // Preview relationships always start "unresolved" — actual resolution
    // happens during commit(), not prepare(). Just confirm the link survived
    // conversion with the right endpoints.
    expect(controller.ccSession?.relationships).toHaveLength(1);
    expect(controller.ccSession?.relationships[0].draft.fromRef).toBe(
      hero?.draft.sourceId,
    );
    expect(controller.ccSession?.relationships[0].draft.toRef).toBe(
      sword?.draft.sourceId,
    );
  });

  it("routes creature pack selection through the same rich review pipeline, with no AI calls", async () => {
    const pack = getPack("fantasy-bestiary")!;
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);

    await controller.handlePackSelect(pack);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("oracle");
    expect(controller.ccSession?.sourceSystem).toBe("oracle");
    expect(controller.ccSession?.items.length).toBe(pack.entries.length);
    for (const item of controller.ccSession?.items ?? []) {
      expect(item.resolvedType).toBe("creature");
    }
  });

  it("counts a creature pack entry as imported when its slug matches an existing vault entity", () => {
    const pack = getPack("fantasy-bestiary")!;
    const importedEntry = pack.entries[0];
    const deps = baseDeps({
      vault: {
        entities: {},
        allEntities: [{ id: "existing-1", title: importedEntry.title } as any],
      } as any,
    });
    const controller = new ImportSettingsController(deps);

    const status = controller.getPackImportStatus(pack);

    expect(status.importedCount).toBe(1);
    expect(status.total).toBe(pack.entries.length);
    expect(status.isFullyImported).toBe(pack.entries.length === 1);
    expect(status.isPartiallyImported).toBe(pack.entries.length > 1);
  });

  it("reports no imported entries when the vault has no matching entities", () => {
    const pack = getPack("fantasy-bestiary")!;
    const controller = new ImportSettingsController(baseDeps());

    expect(controller.getPackImportStatus(pack)).toEqual({
      importedCount: 0,
      total: pack.entries.length,
      isFullyImported: false,
      isPartiallyImported: false,
    });
  });

  it("matches creature pack entries to existing vault entities by title slug when selecting a pack", async () => {
    const pack = getPack("fantasy-bestiary")!;
    const importedEntry = pack.entries[0];
    const deps = baseDeps({
      vault: {
        entities: {},
        allEntities: [{ id: "existing-1", title: importedEntry.title } as any],
      } as any,
    });
    const controller = new ImportSettingsController(deps);

    await controller.handlePackSelect(pack);

    const matched = controller.ccSession?.items.find(
      (item) => item.draft.title === importedEntry.title,
    );
    expect(matched?.match?.entityId).toBe("existing-1");
  });
});

function cifManifestText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: "codex-world-interchange",
    version: "1.0",
    source: { system: "test-tool", worldKey: "test-world" },
    world: { title: "Test World" },
    entities: [
      {
        key: "characters/a",
        kind: "character",
        title: "A",
        content: { format: "markdown", body: "Body" },
      },
      {
        key: "characters/b",
        kind: "character",
        title: "B",
        content: { format: "markdown", body: "Body" },
      },
    ],
    relationships: [
      { from: "characters/a", to: "characters/b", kind: "knows" },
    ],
    assets: [],
    ...overrides,
  });
}

describe("import-settings-controller — CIF detection and flow (T009)", () => {
  it("detects a .cif.json file before chronica/scabard checks and prepares a review session", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([cifManifestText()], "world.cif.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("cc");
    expect(controller.ccSession?.sourceSystem).toBe("cif");
    expect(controller.ccSession?.items.length).toBe(2);
    expect(controller.ccSession?.relationships.length).toBe(1);
  });

  it("detects a plain .json file that self-declares the CIF format", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([cifManifestText()], "export.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.ccSession?.sourceSystem).toBe("cif");
  });

  it("rejects a .cif.json file with a plain-language error naming the rule, without opening review", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(["{ not valid json"], "world.cif.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles.length).toBe(1);
    expect(controller.rejectedFiles[0].name).toBe("world.cif.json");
  });

  it("rejects a malformed .cif.zip with a readable error", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(["PK\x03\x04binarydata"], "world.cif.zip", {
      type: "application/zip",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles[0].reason).toMatch(/couldn't be read/i);
  });

  it("prepares a review session with eligible asset drafts for a .cif.zip package", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const { sha256Hex } = await import("@codex/importer");
    const png = strToU8("png-bytes");
    const manifest = JSON.parse(cifManifestText()) as Record<string, unknown>;
    (manifest.entities as Array<Record<string, unknown>>)[0].media = [
      { assetKey: "art/a" },
    ];
    manifest.assets = [
      {
        key: "art/a",
        path: "assets/a.png",
        mediaType: "image/png",
        sha256: await sha256Hex(png),
      },
    ];
    const bytes = zipSync({
      "manifest.json": strToU8(JSON.stringify(manifest)),
      "assets/a.png": png,
    });
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([bytes as BlobPart], "world.cif.zip", {
      type: "application/zip",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.ccSession?.sourceSystem).toBe("cif");
    expect(controller.ccSession?.assets.length).toBe(1);
    expect(controller.ccSession?.assets[0].eligible).toBe(true);
  });

  it("rejects a .cif.zip whose asset digest doesn't match, without opening review", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const png = strToU8("png-bytes");
    const manifest = JSON.parse(cifManifestText()) as Record<string, unknown>;
    manifest.assets = [
      {
        key: "art/a",
        path: "assets/a.png",
        mediaType: "image/png",
        sha256: "0".repeat(64),
      },
    ];
    const bytes = zipSync({
      "manifest.json": strToU8(JSON.stringify(manifest)),
      "assets/a.png": png,
    });
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([bytes as BlobPart], "world.cif.zip", {
      type: "application/zip",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles[0].reason).toMatch(/doesn't match/i);
  });

  it("is unreachable in guest sessions (FR-019)", async () => {
    const deps = baseDeps({ vault: { isGuest: true } as any });
    const controller = new ImportSettingsController(deps);
    const file = new File([cifManifestText()], "world.cif.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.ccSession).toBeNull();
    expect(controller.step).toBe("upload");
    expect(controller.rejectedFiles.length).toBe(1);
  });

  it("cancel at review discards the session with zero vault mutations (FR-009)", async () => {
    let createCalled = false;
    const deps = baseDeps({
      vault: {
        entities: {},
        allEntities: [],
        createEntity: async () => {
          createCalled = true;
          return "new-id";
        },
        updateEntity: async () => true,
        batchCreateEntities: async () => {},
        addConnection: async () => true,
        suspendSaving: () => {},
        resumeSaving: () => {},
        flushPendingSaves: async () => {},
        saveImageToVault: async () => ({ image: "", thumbnail: "" }),
      } as any,
    });
    const controller = new ImportSettingsController(deps);
    const file = new File([cifManifestText()], "world.cif.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);
    expect(controller.step).toBe("review");

    // Cancelling means: never calling commit(). No vault mutation method
    // should have been invoked just from preparing the review.
    expect(createCalled).toBe(false);
  });
});

function threadWeaverExportText(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    twe_format: "thread-weaver-campaign",
    twe_version: 2,
    exportedAt: "2026-01-01T00:00:00.000Z",
    generator: { seed: "test-seed" },
    networkData: {
      settlements: [
        {
          id: "s1",
          name: "Greyhaven",
          type: "City",
          population: 5000,
          nation: "Aldoria",
          description: "A grey harbor town.",
        },
      ],
      factions: [
        {
          name: "The Iron Ledger",
          headquarters: "s1",
          structure_type: "guild",
        },
      ],
      characters: [
        {
          id: 1,
          name: "Mira",
          faction: "The Iron Ledger",
          role: "Enforcer",
          settlement: { id: "s1" },
        },
      ],
    },
    ...overrides,
  });
}

describe("import-settings-controller — Thread Weaver direct import", () => {
  it("converts a raw Thread Weaver export in-browser and prepares a CIF review session", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([threadWeaverExportText()], "campaign.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(controller.importMode).toBe("cc");
    expect(controller.ccSession?.sourceSystem).toBe("cif");
    // location + faction + character
    expect(controller.ccSession?.items.length).toBe(3);
    const types = controller.ccSession?.items.map((i) => i.resolvedType);
    expect(types).toContain("location");
    expect(types).toContain("faction");
    expect(types).toContain("character");
  });

  it("does not shadow a real .cif.json file (CIF detection still wins)", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File([cifManifestText()], "world.cif.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.ccSession?.items.length).toBe(2);
  });

  it("rejects a malformed Thread Weaver export with a readable error, without opening review", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(
      [threadWeaverExportText({ networkData: { characters: "not-an-array" } })],
      "campaign.json",
      { type: "application/json" },
    );

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
  });

  it("is unreachable in guest sessions", async () => {
    const deps = baseDeps({ vault: { isGuest: true } as any });
    const controller = new ImportSettingsController(deps);
    const file = new File([threadWeaverExportText()], "campaign.json", {
      type: "application/json",
    });

    await controller.handleFiles([file]);

    expect(controller.ccSession).toBeNull();
    expect(controller.step).toBe("upload");
    expect(controller.rejectedFiles.length).toBe(1);
  });
});

describe("import-settings-controller — CIF blocking validation (T016/FR-003)", () => {
  it("rejects a structurally invalid CIF package (duplicate entity key) before opening review", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(
      [
        cifManifestText({
          entities: [
            {
              key: "characters/a",
              kind: "character",
              title: "A",
              content: { format: "markdown", body: "Body" },
            },
            {
              key: "characters/a",
              kind: "character",
              title: "Duplicate",
              content: { format: "markdown", body: "Body" },
            },
          ],
          relationships: [],
        }),
      ],
      "world.cif.json",
      { type: "application/json" },
    );

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles.length).toBe(1);
    expect(controller.rejectedFiles[0].reason).toContain("characters/a");
  });

  it("rejects an unsupported CIF version before opening review, naming both versions", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(
      [cifManifestText({ version: "99.0" })],
      "world.cif.json",
      { type: "application/json" },
    );

    await controller.handleFiles([file]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles[0].reason).toContain("99.0");
    expect(controller.rejectedFiles[0].reason).toContain("1.0");
  });
});

describe("import-settings-controller — validateCifManifest warnings surface in review (Copilot PR feedback)", () => {
  it("threads validateCifManifest's own warnings (e.g. cif.unmapped-kind) into the session instead of dropping them", async () => {
    const deps = baseDeps();
    const controller = new ImportSettingsController(deps);
    const file = new File(
      [
        cifManifestText({
          entities: [
            {
              key: "characters/a",
              // Not one of CIF_MAPPING_RULES' known kinds — validateCifManifest
              // produces a cif.unmapped-kind warning for this, but normalizeCifPackage
              // never independently computes that same warning (it relies on the
              // engine's separate typeFallback mechanism instead).
              kind: "deity",
              title: "A",
              content: { format: "markdown", body: "Body" },
            },
          ],
          relationships: [],
        }),
      ],
      "world.cif.json",
      { type: "application/json" },
    );

    await controller.handleFiles([file]);

    expect(controller.step).toBe("review");
    expect(
      controller.ccSession?.warnings.some(
        (w) => w.code === "cif.unmapped-kind",
      ),
    ).toBe(true);
  });
});

function vaultEntityFile(
  overrides: Record<string, unknown> = {},
  content = "Lore body.",
): File {
  const fields = {
    id: "x",
    type: "Character",
    title: "Thistle",
    tags: [],
    ...overrides,
  };
  const yaml = Object.entries(fields)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return new File([`---\n${yaml}\n---\n\n${content}`], "entity.md", {
    type: "text/markdown",
  });
}

function createVaultStoreMock(seedEntities: Record<string, any> = {}) {
  const entities: Record<string, any> = { ...seedEntities };
  let counter = 0;
  return {
    entities,
    createEntity: async (
      type: string,
      title: string,
      initialData: Record<string, unknown> = {},
    ) => {
      const id = `e${++counter}`;
      entities[id] = { id, type, title, ...initialData };
      return id;
    },
    updateEntity: async (id: string, updates: Record<string, unknown>) => {
      if (!entities[id]) return false;
      entities[id] = { ...entities[id], ...updates };
      return true;
    },
    addConnection: async () => true,
    suspendSaving: () => {},
    resumeSaving: () => {},
    flushPendingSaves: async () => {},
    saveImageToVault: async (
      _blob: unknown,
      _entityId: string,
      name?: string,
    ) => ({
      image: `images/${name ?? "asset"}.webp`,
      thumbnail: `images/${name ?? "asset"}_thumb.webp`,
    }),
    isGuest: false,
  };
}

describe("import-settings-controller — Import Files (file-system drag/drop & upload)", () => {
  it("prepares a review session that preserves the dropped file's real entity type", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    const items: DroppedItem[] = [
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
    ];

    await controller.handleVaultFiles(items);

    expect(controller.step).toBe("review");
    expect(controller.ccSession?.sourceSystem).toBe("vault-files");
    expect(controller.ccSession?.items[0].resolvedType).toBe("Character");
    expect(controller.ccSession?.items[0].typeFallback).toBe(false);
  });

  it("preserves a custom (non-built-in) entity type just as faithfully", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    const items: DroppedItem[] = [
      {
        relativePath: "entities/relic.md",
        file: vaultEntityFile({
          id: "relic",
          type: "Ancient Relic",
          title: "The Shard",
        }),
      },
    ];

    await controller.handleVaultFiles(items);

    expect(controller.ccSession?.items[0].resolvedType).toBe("Ancient Relic");
  });

  it("does not treat a same-titled but unrelated existing entity as a conflict (no title fallback)", async () => {
    const deps = baseDeps({
      vault: createVaultStoreMock({
        existing1: { id: "existing1", type: "Character", title: "Thistle" },
      }) as any,
    });
    const controller = new ImportSettingsController(deps);
    const items: DroppedItem[] = [
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
    ];

    await controller.handleVaultFiles(items);

    expect(controller.ccSession?.items[0].match).toBeNull();
  });

  it("matches an exact re-drop of a previously-imported sourcePath as a conflict", async () => {
    const deps = baseDeps({
      vault: createVaultStoreMock({
        existing1: {
          id: "existing1",
          type: "Character",
          title: "Something Else",
          discoverySource: "vault-files:path:entities/thistle.md",
        },
      }) as any,
    });
    const controller = new ImportSettingsController(deps);
    const items: DroppedItem[] = [
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
    ];

    await controller.handleVaultFiles(items);

    expect(controller.ccSession?.items[0].match?.entityId).toBe("existing1");
    expect(controller.ccSession?.items[0].matchDecision ?? "skip").toBe("skip");
  });

  it("rejects a caller trying to set matchDecision to update for a vault-files session (FR-006/FR-007)", async () => {
    const deps = baseDeps({
      vault: createVaultStoreMock({
        existing1: {
          id: "existing1",
          type: "Character",
          title: "Something Else",
          discoverySource: "vault-files:path:entities/thistle.md",
        },
      }) as any,
    });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
    ]);

    const ref = controller.ccSession!.items[0].sourceRef;
    controller.handleCCMatchDecisionChange(ref, "update");

    expect(controller.ccSession?.items[0].matchDecision ?? "skip").toBe("skip");
  });

  it("surfaces a missing image reference instead of silently dropping it", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      {
        relativePath: "entities/thistle.md",
        file: vaultEntityFile({ image: "images/thistle.webp" }),
      },
    ]);

    expect(controller.step).toBe("review");
    expect(controller.missingImageRefs).toEqual([
      {
        path: "images/thistle.webp",
        referencedBy: ["entities/thistle.md"],
        resolution: "unresolved",
      },
    ]);
  });

  it("resolves a missing image by adding the file directly and re-prepares the session", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      {
        relativePath: "entities/thistle.md",
        file: vaultEntityFile({ image: "images/thistle.webp" }),
      },
    ]);
    const ref = controller.missingImageRefs[0];

    const imageFile = new File(["bytes"], "thistle.webp", {
      type: "image/webp",
    });
    await controller.handleAddMissingImageFile(ref, imageFile);

    expect(controller.missingImageRefs[0].resolution).toBe("added-directly");
    expect(controller.ccSession?.assets.length).toBe(1);
  });

  it("resolves a missing image via granted folder access", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      {
        relativePath: "entities/thistle.md",
        file: vaultEntityFile({ image: "images/thistle.webp" }),
      },
    ]);
    const ref = controller.missingImageRefs[0];

    const imageFile = new File(["bytes"], "thistle.webp", {
      type: "image/webp",
    });
    fsMocks.isFileSystemAccessSupported.mockReturnValue(true);
    fsMocks.pickDirectory.mockResolvedValue({
      values: async function* () {
        yield {
          kind: "file",
          name: "thistle.webp",
          getFile: () => Promise.resolve(imageFile),
        };
      },
    });

    await controller.handleResolveMissingImageFromFolder(ref);

    expect(controller.missingImageRefs[0].resolution).toBe(
      "resolved-from-folder",
    );
    expect(controller.ccSession?.assets.length).toBe(1);
  });

  it("explains folder access isn't supported instead of attempting it", async () => {
    const notify = vi.fn();
    const controller = new ImportSettingsController(
      baseDeps({
        vault: createVaultStoreMock() as any,
        notificationStore: { notify } as any,
      }),
    );
    await controller.handleVaultFiles([
      {
        relativePath: "entities/thistle.md",
        file: vaultEntityFile({ image: "images/thistle.webp" }),
      },
    ]);
    const ref = controller.missingImageRefs[0];

    fsMocks.isFileSystemAccessSupported.mockReturnValue(false);
    fsMocks.pickDirectory.mockClear();

    await controller.handleResolveMissingImageFromFolder(ref);

    expect(notify).toHaveBeenCalled();
    expect(fsMocks.pickDirectory).not.toHaveBeenCalled();
    expect(controller.missingImageRefs[0].resolution).toBe("unresolved");
  });

  it("excludes an unrecognized dropped file and still imports the valid ones", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
      {
        relativePath: "notes/readme.txt",
        file: new File(["hi"], "readme.txt"),
      },
    ]);

    expect(controller.step).toBe("review");
    expect(controller.ccSession?.items.length).toBe(1);
    expect(
      controller.ccSession?.warnings.some((w) => w.ref === "notes/readme.txt"),
    ).toBe(true);
  });

  it("returns to upload with a clear reason when nothing recognizable was dropped", async () => {
    const deps = baseDeps({ vault: createVaultStoreMock() as any });
    const controller = new ImportSettingsController(deps);
    await controller.handleVaultFiles([
      {
        relativePath: "notes/readme.txt",
        file: new File(["hi"], "readme.txt"),
      },
    ]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles.length).toBeGreaterThan(0);
  });

  it("is unreachable in guest sessions", async () => {
    const deps = baseDeps({ vault: { isGuest: true } as any });
    const controller = new ImportSettingsController(deps);

    await controller.handleVaultFiles([
      { relativePath: "entities/thistle.md", file: vaultEntityFile() },
    ]);

    expect(controller.step).toBe("upload");
    expect(controller.ccSession).toBeNull();
    expect(controller.rejectedFiles.length).toBeGreaterThan(0);
  });
});
