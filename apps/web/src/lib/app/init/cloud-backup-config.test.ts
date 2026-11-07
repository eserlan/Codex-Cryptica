import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudBackupDeps } from "#lib/stores/cloud-backup-types.js";
import { configureCloudBackup } from "./cloud-backup-config";

const mocks = vi.hoisted(() => ({
  configure: vi.fn<(deps: CloudBackupDeps) => void>(),
  storage: {},
  vault: {
    vaultName: "World",
    activeVaultId: "vault-1" as string | null,
    entities: { "entity-1": { id: "entity-1", image: "images/art.png" } } as
      Record<string, unknown> | undefined,
    isContentLoaded: vi.fn(),
    readFullEntity: vi.fn(),
    resolveImageUrl: vi.fn(),
  },
  maps: { allMaps: [{ id: "map-1" }] as unknown[] | undefined },
  canvases: { allCanvases: [{ id: "canvas-1" }] as unknown[] | undefined },
  getAllFromIndex: vi.fn(),
  buildPayload: vi.fn(),
  buildDelta: vi.fn(),
  collectAssetPaths: vi.fn(),
  restore: {},
  fetch: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/map-registry.svelte.js", () => ({
  mapRegistry: mocks.maps,
}));
vi.mock("#lib/stores/canvas-registry.svelte.js", () => ({
  canvasRegistry: mocks.canvases,
}));
vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: { configure: mocks.configure },
  cloudBackupBrowserStorage: () => mocks.storage,
}));
vi.mock("#lib/stores/cloud-backup-dirty.js", () => ({
  CloudBackupDirtyStore: class {},
}));
vi.mock("#lib/utils/idb.js", () => ({
  getDB: async () => ({ getAllFromIndex: mocks.getAllFromIndex }),
}));
vi.mock("../../config/oracle-proxy", () => ({
  resolveOracleProxyUrl: () => "https://worker.test",
}));
vi.mock("#lib/services/cloud-backup-payload.js", () => ({
  buildCloudBackupPayload: mocks.buildPayload,
  buildCloudBackupDelta: mocks.buildDelta,
  collectAssetPaths: mocks.collectAssetPaths,
  assetIdForPath: (path: string) => path.replaceAll("/", "_"),
}));
vi.mock("./cloud-backup-restore", () => ({
  createCloudBackupRestore: () => mocks.restore,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAllFromIndex.mockResolvedValue([]);
  mocks.collectAssetPaths.mockReturnValue([]);
  mocks.vault.vaultName = "World";
  mocks.vault.activeVaultId = "vault-1";
  mocks.vault.entities = {
    "entity-1": { id: "entity-1", image: "images/art.png" },
  };
  mocks.maps.allMaps = [{ id: "map-1" }];
  mocks.canvases.allCanvases = [{ id: "canvas-1" }];
});

function configured() {
  configureCloudBackup();
  return mocks.configure.mock.calls[0][0];
}

describe("cloud backup configuration", () => {
  it("wires the worker endpoint, storage, restore and lazy fetch adapter", async () => {
    const deps = configured();
    expect(deps.runtime.baseUrl).toBe("https://worker.test");
    expect(deps.runtime.storage).toBe(mocks.storage);
    expect(deps.restore).toBe(mocks.restore);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response());
    try {
      await deps.runtime.fetch!("https://worker.test/request", {
        method: "POST",
      });
      expect(fetchSpy).toHaveBeenCalledWith("https://worker.test/request", {
        method: "POST",
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("reads persisted journals for the requested vault and sorts the snapshot newest first", async () => {
    const older = { id: "old", startedAt: 1 };
    const newer = { id: "new", startedAt: 2 };
    mocks.getAllFromIndex.mockResolvedValue([older, newer]);
    mocks.buildPayload.mockResolvedValue({ snapshot: true });
    const deps = configured();
    const signal = new AbortController().signal;
    expect(await deps.buildPayload("requested-vault", signal)).toEqual({
      snapshot: true,
    });
    expect(mocks.getAllFromIndex).toHaveBeenCalledWith(
      "session_journals",
      "by-vault",
      "requested-vault",
    );
    expect(mocks.buildPayload).toHaveBeenCalledWith(
      "World",
      Object.values(mocks.vault.entities!),
      expect.objectContaining({ signal }),
      {
        maps: mocks.maps.allMaps,
        canvases: mocks.canvases.allCanvases,
        sessionJournals: [newer, older],
      },
    );
    const options = mocks.buildPayload.mock.calls[0][2];
    options.hydrateEntities.isContentLoaded("entity-1");
    options.hydrateEntities.readFullEntity("entity-1");
    options.resolveImageUrl("images/art.png");
    expect(mocks.vault.isContentLoaded).toHaveBeenCalledWith("entity-1");
    expect(mocks.vault.readFullEntity).toHaveBeenCalledWith("entity-1");
    expect(mocks.vault.resolveImageUrl).toHaveBeenCalledWith("images/art.png");
  });

  it("propagates journal read failures rather than making a partial snapshot", async () => {
    mocks.getAllFromIndex.mockRejectedValue(new Error("journal read failed"));
    await expect(configured().buildPayload("vault-1")).rejects.toThrow(
      "journal read failed",
    );
    expect(mocks.buildPayload).not.toHaveBeenCalled();
  });

  it("builds deltas from current entities, references, hydration and cancellation", async () => {
    mocks.collectAssetPaths.mockReturnValue(["images/art.png"]);
    mocks.buildDelta.mockResolvedValue(null);
    const deps = configured();
    const uploaded = new Set<string>();
    const signal = new AbortController().signal;
    const changes = [
      {
        kind: "entity" as const,
        id: "entity-1",
        vaultId: "vault-1",
        version: "v1",
        deleted: false,
      },
    ];
    expect(
      await deps.buildDelta!("vault-1", changes, uploaded, signal),
    ).toBeNull();
    expect(mocks.buildDelta).toHaveBeenCalledWith(
      "World",
      changes,
      expect.objectContaining({
        uploadedAssetIds: uploaded,
        signal,
        referencedAssetIds: ["images_art.png"],
      }),
      { maps: mocks.maps.allMaps, canvases: mocks.canvases.allCanvases },
    );
    const options = mocks.buildDelta.mock.calls[0][2];
    expect(options.getEntity("entity-1")).toBe(
      mocks.vault.entities!["entity-1"],
    );
    expect(options.getEntity("missing")).toBeUndefined();
    options.hydrateEntities.readFullEntity("entity-1");
    expect(mocks.vault.readFullEntity).toHaveBeenCalledWith("entity-1");
    expect(mocks.getAllFromIndex).not.toHaveBeenCalled();
  });

  it("lists local loading state and reads the active vault at call time", () => {
    mocks.vault.isContentLoaded.mockReturnValue(false);
    const deps = configured();
    expect(deps.listLocalEntities!()).toEqual([
      {
        id: "entity-1",
        loaded: false,
        entity: mocks.vault.entities!["entity-1"],
      },
    ]);
    mocks.vault.activeVaultId = "vault-2";
    expect(deps.activeVaultId()).toBe("vault-2");
    mocks.vault.activeVaultId = null;
    expect(deps.activeVaultId()).toBeNull();
  });

  it("supports an empty vault and missing registries", async () => {
    mocks.vault.vaultName = "";
    mocks.vault.entities = undefined;
    mocks.maps.allMaps = undefined;
    mocks.canvases.allCanvases = undefined;
    const deps = configured();
    await deps.buildPayload("empty");
    expect(mocks.buildPayload).toHaveBeenCalledWith(
      "Vault",
      [],
      expect.any(Object),
      { maps: [], canvases: [], sessionJournals: [] },
    );
    await deps.buildDelta!(
      "empty",
      [],
      new Set(),
      new AbortController().signal,
    );
    expect(mocks.buildDelta).toHaveBeenCalledWith(
      "Vault",
      [],
      expect.any(Object),
      { maps: [], canvases: [] },
    );
    expect(deps.listLocalEntities!()).toEqual([]);
  });

  it("logs stage timings with optional counts and bytes only", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const deps = configured();
      deps.timing!({ stage: "hydrate", durationMs: 1.25 });
      deps.timing!({ stage: "hydrate", durationMs: 2, count: 0, bytes: 12 });
      expect(debug).toHaveBeenNthCalledWith(1, "[CloudBackup:hydrate] 1.3ms");
      expect(debug).toHaveBeenNthCalledWith(
        2,
        "[CloudBackup:hydrate] 2.0ms count=0 bytes=12",
      );
    } finally {
      debug.mockRestore();
    }
  });
});
