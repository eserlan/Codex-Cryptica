import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CloudBackupDeps,
  PulledWholeChanges,
} from "#lib/stores/cloud-backup-types.js";
import { configureCloudBackup } from "./cloud-backup-config";

const mocks = vi.hoisted(() => ({
  configure: vi.fn<(deps: CloudBackupDeps) => void>(),
  files: new Map<string, string>(),
  importAsset: vi.fn(),
  maps: {} as Record<string, any>,
  canvases: {} as Record<string, any>,
  saveMaps: vi.fn(),
  deleteMap: vi.fn(),
  saveCanvas: vi.fn(),
  deleteCanvasFromDisk: vi.fn(),
  activeMapId: null as string | null,
  vault: {
    vaultName: "World",
    activeVaultId: "vault-1" as string | null,
    entities: {},
    getSpecificVaultHandle: vi.fn(async () => ({ name: "vault-1" })),
  },
}));

vi.mock("#lib/services/adventure/adventure-session-repository.js", () => ({
  adventureSessionRepository: { setChangeListener: vi.fn() },
  AdventureSessionRepository: class {},
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/map-registry.svelte.js", () => ({
  mapRegistry: {
    get maps() {
      return mocks.maps;
    },
    set maps(value) {
      mocks.maps = value;
    },
    allMaps: [],
    saveMaps: mocks.saveMaps,
    deleteMap: mocks.deleteMap,
  },
}));
vi.mock("#lib/stores/canvas-registry.svelte.js", () => ({
  canvasRegistry: {
    get canvases() {
      return mocks.canvases;
    },
    set canvases(value) {
      mocks.canvases = value;
    },
    allCanvases: [],
    saveCanvas: mocks.saveCanvas,
  },
}));
vi.mock("#lib/stores/map.svelte.js", () => ({
  mapStore: {
    get activeMapId() {
      return mocks.activeMapId;
    },
  },
}));
vi.mock("#lib/stores/vault/io.js", () => ({
  deleteCanvasFromDisk: mocks.deleteCanvasFromDisk,
}));
vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: { configure: mocks.configure },
  cloudBackupBrowserStorage: () => ({}),
}));
vi.mock("#lib/stores/cloud-backup-dirty.js", () => ({
  CloudBackupDirtyStore: class {},
}));
vi.mock("#lib/stores/cloud-backup-base.js", () => ({
  CloudBackupBaseStore: class {},
}));
vi.mock("#lib/utils/idb.js", () => ({ getDB: async () => ({}) }));
vi.mock("../../config/oracle-proxy", () => ({
  resolveOracleProxyUrl: () => "https://worker.test",
}));
vi.mock("./cloud-backup-restore", () => ({
  createCloudBackupRestore: () => ({ importAsset: mocks.importAsset }),
}));
vi.mock("#lib/utils/opfs.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readOpfsBlob: vi.fn(async (path: string[]) => {
    const text = mocks.files.get(path.join("/"));
    if (text === undefined) throw new Error("missing");
    return new Blob([text], { type: "image/png" });
  }),
  writeOpfsFile: vi.fn(async (path: string[], blob: Blob) => {
    mocks.files.set(path.join("/"), await blob.text());
  }),
}));

const ORIGINAL = "11111111-1111-4111-8111-111111111111";
const COPY = "22222222-2222-4222-8222-222222222222";
const map = (over: Record<string, unknown> = {}) => ({
  id: ORIGINAL,
  name: "Atlas",
  assetPath: "maps/original.webp",
  dimensions: { width: 10, height: 10 },
  pins: [],
  fogOfWar: { maskPath: `maps/${ORIGINAL}_mask.png` },
  ...over,
});
const bytes = (text: string) => new TextEncoder().encode(text);
const changes = (over: Partial<PulledWholeChanges>): PulledWholeChanges => ({
  copies: [],
  writes: [],
  deletes: [],
  ...over,
});

function remote() {
  configureCloudBackup();
  return mocks.configure.mock.calls[0][0].remote!;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.files.clear();
  mocks.maps = {};
  mocks.canvases = {};
  mocks.activeMapId = null;
  mocks.vault.activeVaultId = "vault-1";
  mocks.importAsset.mockImplementation(
    async (path: string, data: Uint8Array) => {
      mocks.files.set(path, new TextDecoder().decode(data));
    },
  );
  mocks.deleteMap.mockImplementation(async (id: string) => {
    const { [id]: _gone, ...rest } = mocks.maps;
    mocks.maps = rest;
  });
});

describe("applying pulled maps", () => {
  it("downloads the background and mask by their recorded ids over the local files", async () => {
    mocks.maps = { [ORIGINAL]: map() };
    mocks.files.set(`maps/${ORIGINAL}_mask.png`, "old mask");
    const download = vi.fn(async (id: string) => bytes(`bytes of ${id}`));
    const assets = [
      { path: "maps/original.webp", assetId: "bg--1", mimeType: "image/webp" },
      {
        path: `maps/${ORIGINAL}_mask.png`,
        assetId: "mask--2",
        mimeType: "image/png",
      },
    ];

    const out = await remote().applyWhole(
      "vault-1",
      "map",
      changes({ writes: [{ item: map({ name: "Theirs" }) as never, assets }] }),
      download,
    );

    expect(vi.mocked(download).mock.calls.map((call) => call[0])).toEqual([
      "bg--1",
      "mask--2",
    ]);
    expect(mocks.files.get(`maps/${ORIGINAL}_mask.png`)).toBe(
      "bytes of mask--2",
    );
    expect(mocks.files.get("maps/original.webp")).toBe("bytes of bg--1");
    expect(Object.keys(out.hashes).sort()).toEqual(["bg--1", "mask--2"]);
    expect(out.failed).toEqual([]);
    expect(mocks.maps[ORIGINAL].name).toBe("Theirs");
    expect(mocks.saveMaps).toHaveBeenCalledTimes(1);
  });

  it("falls back to path-derived ids for a commit with no recorded files", async () => {
    const download = vi.fn(async (_id: string) => bytes("x"));
    await remote().applyWhole(
      "vault-1",
      "map",
      changes({ writes: [{ item: map() as never }] }),
      download,
    );
    expect(vi.mocked(download).mock.calls.map((call) => call[0])).toEqual([
      "maps_original.webp",
      `maps_${ORIGINAL}_mask.png`,
    ]);
  });

  it.each([".codex", ".codex/maps.json", "entities/a.md", "maps/../x.png"])(
    "does not apply a pulled map whose file path is %s",
    async (assetPath) => {
      const download = vi.fn(async (_id: string) => bytes("evil"));
      const out = await remote().applyWhole(
        "vault-1",
        "map",
        changes({ writes: [{ item: map({ assetPath }) as never }] }),
        download,
      );
      expect(out.failed).toEqual([ORIGINAL]);
      expect(download).not.toHaveBeenCalled();
      expect(mocks.importAsset).not.toHaveBeenCalled();
      expect(mocks.files.size).toBe(0);
      expect(mocks.maps[ORIGINAL]).toBeUndefined();
    },
  );

  it("does not apply a pulled map whose mask path leaves the maps folder", async () => {
    const out = await remote().applyWhole(
      "vault-1",
      "map",
      changes({
        writes: [
          {
            item: map({ fogOfWar: { maskPath: ".codex/maps.json" } }) as never,
          },
        ],
      }),
      async () => bytes("evil"),
    );
    expect(out.failed).toEqual([ORIGINAL]);
    expect(mocks.files.size).toBe(0);
  });

  it("does not apply a keep-both copy with an unsafe path", async () => {
    const out = await remote().applyWhole(
      "vault-1",
      "map",
      changes({
        copies: [
          { copy: map({ id: COPY, assetPath: ".codex" }) as never } as never,
        ],
      }),
      async () => bytes("evil"),
    );
    expect(out.failed).toEqual([COPY]);
    expect(mocks.maps[COPY]).toBeUndefined();
  });

  it("still applies a map whose download fails, and reports the file", async () => {
    const out = await remote().applyWhole(
      "vault-1",
      "map",
      changes({ writes: [{ item: map() as never }] }),
      async () => null,
    );
    expect(out.failed).toEqual([
      "maps_original.webp",
      `maps_${ORIGINAL}_mask.png`,
    ]);
    expect(out.hashes).toEqual({});
    expect(mocks.maps[ORIGINAL]).toBeTruthy();
  });

  it("never writes a path that could leave the vault", async () => {
    const download = vi.fn(async () => bytes("x"));
    await remote().applyWhole(
      "vault-1",
      "map",
      changes({
        writes: [
          {
            item: map({
              assetPath: "../escape.png",
              fogOfWar: undefined,
            }) as never,
          },
        ],
      }),
      download,
    );
    expect(download).not.toHaveBeenCalled();
    expect(mocks.files.size).toBe(0);
  });

  it("skips a received map that is not a valid map", async () => {
    const out = await remote().applyWhole(
      "vault-1",
      "map",
      changes({
        writes: [{ item: { id: "not-a-uuid", name: "Bad" } as never }],
      }),
      async () => bytes("x"),
    );
    expect(out.failed).toEqual(["not-a-uuid"]);
    expect(mocks.maps).toEqual({});
  });

  it("gives a keep-both copy its own files before theirs overwrite the originals", async () => {
    mocks.maps = { [ORIGINAL]: map() };
    mocks.files.set("maps/original.webp", "local background");
    mocks.files.set(`maps/${ORIGINAL}_mask.png`, "local mask");

    await remote().applyWhole(
      "vault-1",
      "map",
      changes({
        copies: [
          {
            copy: map({
              id: COPY,
              name: "Atlas (Mara's version)",
            }) as never,
            fromId: ORIGINAL,
          },
        ],
        writes: [{ item: map({ name: "Theirs" }) as never }],
      }),
      async (id) => bytes(`remote ${id}`),
    );

    const copy = mocks.maps[COPY];
    expect(copy.fogOfWar.maskPath).toBe(`maps/${COPY}_mask.png`);
    expect(copy.assetPath).toBe(`maps/${COPY}.webp`);
    expect(copy.name).toBe("Atlas (Mara's version)");
    expect(mocks.files.get(`maps/${COPY}_mask.png`)).toBe("local mask");
    expect(mocks.files.get(copy.assetPath)).toBe("local background");
    expect(mocks.files.get(`maps/${ORIGINAL}_mask.png`)).toBe(
      `remote maps_${ORIGINAL}_mask.png`,
    );
    expect(mocks.maps[ORIGINAL].name).toBe("Theirs");
  });

  it("removes a deleted map through the registry", async () => {
    mocks.maps = { [ORIGINAL]: map() };
    await remote().applyWhole(
      "vault-1",
      "map",
      changes({ deletes: [ORIGINAL] }),
      async () => null,
    );
    expect(mocks.deleteMap).toHaveBeenCalledWith(ORIGINAL);
    expect(mocks.maps).toEqual({});
  });

  it("refuses to write once the vault has changed", async () => {
    const deps = remote();
    mocks.vault.activeVaultId = "other";
    await expect(
      deps.applyWhole(
        "vault-1",
        "map",
        changes({ writes: [{ item: map() as never }] }),
        async () => bytes("x"),
      ),
    ).rejects.toThrow("The vault changed.");
  });
});

describe("applying pulled canvases", () => {
  const canvas = (over: Record<string, unknown> = {}) => ({
    id: "c1",
    name: "Plot",
    slug: "plot",
    nodes: [],
    edges: [],
    lastModified: 1,
    ...over,
  });

  it("writes canvases, saves them and removes deleted ones from disk", async () => {
    mocks.canvases = { gone: canvas({ id: "gone", slug: "gone" }) };
    await remote().applyWhole(
      "vault-1",
      "canvas",
      changes({ writes: [{ item: canvas() as never }], deletes: ["gone"] }),
      async () => null,
    );
    expect(Object.keys(mocks.canvases)).toEqual(["c1"]);
    expect(mocks.saveCanvas).toHaveBeenCalledWith("c1", {
      explicitVaultId: "vault-1",
    });
    expect(mocks.deleteCanvasFromDisk).toHaveBeenCalledWith(
      expect.anything(),
      "gone",
    );
  });

  it("gives a copy a slug no other canvas has", async () => {
    mocks.canvases = { c1: canvas({ slug: "plot-mara-s-version" }) };
    await remote().applyWhole(
      "vault-1",
      "canvas",
      changes({
        copies: [
          {
            copy: canvas({
              id: COPY,
              name: "Plot (Mara's version)",
              slug: "plot",
            }) as never,
            fromId: "c1",
          },
        ],
        writes: [{ item: canvas({ name: "Theirs" }) as never }],
      }),
      async () => null,
    );
    expect(mocks.canvases[COPY].slug).toBe(
      `plot-mara-s-version-${COPY.slice(0, 4)}`,
    );
    expect(mocks.canvases.c1.name).toBe("Theirs");
    expect(mocks.saveCanvas).toHaveBeenCalledWith(COPY, expect.anything());
  });

  it("skips a received canvas that is not valid", async () => {
    const out = await remote().applyWhole(
      "vault-1",
      "canvas",
      changes({ writes: [{ item: { id: "x", name: 3 } as never }] }),
      async () => null,
    );
    expect(out.failed).toEqual(["x"]);
    expect(mocks.canvases).toEqual({});
  });
});

describe("what is open", () => {
  it("treats the active map on the map page and the canvas at its address as open", () => {
    const deps = remote();
    mocks.activeMapId = ORIGINAL;
    window.history.pushState({}, "", "/map");
    expect(deps.isWholeOpen("map", ORIGINAL)).toBe(true);
    expect(deps.isWholeOpen("map", COPY)).toBe(false);
    window.history.pushState({}, "", "/vault");
    expect(deps.isWholeOpen("map", ORIGINAL)).toBe(false);

    mocks.canvases = { c1: { id: "c1", slug: "plot" } };
    window.history.pushState({}, "", "/canvas/plot");
    expect(deps.isWholeOpen("canvas", "c1")).toBe(true);
    expect(deps.isWholeOpen("canvas", "none")).toBe(false);
  });

  it("makes ids that are valid uuids and not in use", () => {
    const deps = remote();
    expect(deps.newWholeId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
