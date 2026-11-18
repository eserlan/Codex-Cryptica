import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SeoImportService } from "./import-handler";

describe("SeoImportService", () => {
  let mockVaultStore: any;
  let mockRegistryStore: any;
  let service: SeoImportService;

  beforeEach(() => {
    // Stub localStorage
    const storage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
    // window stub removed in favor of DI

    mockVaultStore = {
      isInitialized: true,
      activeVaultId: "v1",
      entities: {},
      // Mirrors the real vault store's relationship between `entities` and
      // the pre-cached `allEntities` array the implementation now reads from.
      get allEntities() {
        return Object.values(this.entities);
      },
      init: vi.fn().mockResolvedValue(undefined),
      switchVault: vi.fn().mockResolvedValue(undefined),
      createEntity: vi.fn().mockResolvedValue("e1"),
      updateEntity: vi.fn().mockResolvedValue(undefined),
      saveImageToVault: vi.fn().mockResolvedValue("images/imported.png"),
      selectedEntityId: null,
    };

    mockRegistryStore = {
      vaultName: "Vault 1",
      availableVaults: [{ id: "v1", name: "Vault 1" }],
      init: vi.fn().mockResolvedValue(undefined),
      createVault: vi.fn().mockResolvedValue("new-v"),
      setActiveVault: vi.fn().mockResolvedValue(undefined),
    };

    service = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      undefined,
      undefined,
      {},
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return null if no pending import exists", async () => {
    const res = await service.checkAndHandlePendingImport();
    expect(res).toEqual({ status: "none" });
  });

  it("should parse, validate and import a valid draft and select the entity", async () => {
    const draft = {
      type: "character",
      title: "Valen Frost",
      content: "A brave elven warrior.",
      lore: "Strength: 18",
      labels: ["custom-label"],
      discoverySource: "kanka:character:101",
      systemId: "tales-of-the-valiant",
      metadata: { kankaEntityId: 101 },
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    const res = await service.checkAndHandlePendingImport();

    expect(res).toEqual({
      status: "imported",
      rootId: "e1",
      count: 1,
      vaultName: "Vault 1",
      rootTitle: "Valen Frost",
    });
    expect(mockVaultStore.createEntity).toHaveBeenCalledWith(
      "character",
      "Valen Frost",
      {
        content: "A brave elven warrior.",
        lore: "Strength: 18",
        labels: ["custom-label"],
        status: "active",
        discoverySource: "kanka:character:101",
        systemId: "tales-of-the-valiant",
        metadata: { kankaEntityId: 101 },
      },
    );
    expect(mockVaultStore.selectedEntityId).toBe("e1");
    expect(localStorage.getItem("__codex_pending_import")).toBeNull();
  });

  it("should link a rasterized diagram image to the created entity when present", async () => {
    const mockMapLinker = {
      linkImageToEntity: vi.fn().mockResolvedValue("map1"),
    };
    const linkingService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      undefined,
      mockMapLinker as any,
    );

    const draft = {
      type: "location",
      title: "Kesh-9",
      content: "A binary star system.",
      mapImageDataUrl:
        "data:image/png;base64," + btoa("fake-png-bytes-for-test"),
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await linkingService.checkAndHandlePendingImport();

    expect(mockMapLinker.linkImageToEntity).toHaveBeenCalledOnce();
    const [file, mapName, entityId] =
      mockMapLinker.linkImageToEntity.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe("image/png");
    expect(mapName).toBe("Kesh-9 Map");
    expect(entityId).toBe("e1");
  });

  it("should not attempt to link a map when mapImageDataUrl is absent", async () => {
    const mockMapLinker = { linkImageToEntity: vi.fn() };
    const linkingService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      undefined,
      mockMapLinker as any,
    );

    const draft = { type: "location", title: "Plain System", content: "" };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await linkingService.checkAndHandlePendingImport();

    expect(mockMapLinker.linkImageToEntity).not.toHaveBeenCalled();
  });

  it("should not fail the import if linking the map image throws", async () => {
    const mockMapLinker = {
      linkImageToEntity: vi.fn().mockRejectedValue(new Error("upload failed")),
    };
    const linkingService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      undefined,
      mockMapLinker as any,
    );

    const draft = {
      type: "location",
      title: "Kesh-9",
      content: "",
      mapImageDataUrl:
        "data:image/png;base64," + btoa("fake-png-bytes-for-test"),
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    const res = await linkingService.checkAndHandlePendingImport();

    expect(res).toMatchObject({ status: "imported", rootId: "e1" });
  });

  it("should create a new vault if no vault is active", async () => {
    mockVaultStore.activeVaultId = null;
    mockRegistryStore.availableVaults = [];

    const draft = {
      type: "character",
      title: "Hero",
      content: "Simple hero.",
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await service.checkAndHandlePendingImport();

    expect(mockRegistryStore.createVault).toHaveBeenCalledWith(
      "My Codex Vault",
    );
    expect(mockVaultStore.switchVault).toHaveBeenCalledWith("new-v");
  });

  it("should resolve duplicate titles by appending a suffix", async () => {
    // Existing entity has name "Hero"
    mockVaultStore.entities = {
      "e-existing": { id: "e-existing", title: "Hero" },
    };

    const draft = {
      type: "character",
      title: "Hero",
      content: "Another hero.",
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.createEntity).toHaveBeenCalledWith(
      "character",
      "Hero (Imported)",
      expect.anything(),
    );
  });

  it("should resolve multiple duplicate titles correctly", async () => {
    mockVaultStore.entities = {
      e1: { id: "e1", title: "Hero" },
      e2: { id: "e2", title: "Hero (Imported)" },
    };

    const draft = {
      type: "character",
      title: "Hero",
      content: "A third hero.",
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.createEntity).toHaveBeenCalledWith(
      "character",
      "Hero (Imported 2)",
      expect.anything(),
    );
  });

  it("should clear localStorage and return null if the payload is invalid", async () => {
    localStorage.setItem("__codex_pending_import", "invalid-json");

    const res = await service.checkAndHandlePendingImport();

    expect(res).toEqual({ status: "invalid" });
    expect(localStorage.getItem("__codex_pending_import")).toBeNull();
  });

  it("should successfully import multiple drafts from an array", async () => {
    const drafts = [
      {
        type: "character",
        title: "Barek Steeleye",
        content: "GM Hook: Barek is looking for a map.",
        labels: ["custom-char"],
      },
      {
        type: "faction",
        title: "The Iron Guild",
        content: "GM Hook: The guild opposes the crown.",
        labels: ["custom-fac"],
      },
    ];
    localStorage.setItem("__codex_pending_import", JSON.stringify(drafts));

    const res = await service.checkAndHandlePendingImport();

    expect(res).toMatchObject({ status: "imported", rootId: "e1", count: 2 });
    expect(mockVaultStore.createEntity).toHaveBeenCalledTimes(2);
    expect(mockVaultStore.createEntity).toHaveBeenNthCalledWith(
      1,
      "character",
      "Barek Steeleye",
      expect.objectContaining({
        content: "GM Hook: Barek is looking for a map.",
      }),
    );
    expect(mockVaultStore.createEntity).toHaveBeenNthCalledWith(
      2,
      "faction",
      "The Iron Guild",
      expect.objectContaining({
        content: "GM Hook: The guild opposes the crown.",
      }),
    );
    expect(localStorage.getItem("__codex_pending_import")).toBeNull();
  });

  it("should strip UTM query parameters if utm_source is present in search", async () => {
    const replaceState = vi.fn();
    const win = {
      location: {
        pathname: "/test-path",
        search: "?utm_source=generator-faction&utm_medium=save-to-vault",
        hash: "#test-hash",
      },
      history: {
        replaceState,
      },
    };
    const doc = {
      title: "Test Page",
    };

    const injectedService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      service["storage"],
      service["mapLinker"],
      win,
      doc,
    );

    const res = await injectedService.checkAndHandlePendingImport();
    expect(res).toEqual({ status: "none" });
    expect(replaceState).toHaveBeenCalledWith(
      {},
      "Test Page",
      "/test-path#test-hash",
    );
  });

  it("should not strip query parameters if utm_source is not present", async () => {
    const replaceState = vi.fn();
    const win = {
      location: {
        pathname: "/test-path",
        search: "?other_param=123",
        hash: "#test-hash",
      },
      history: {
        replaceState,
      },
    };

    const injectedService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      service["storage"],
      service["mapLinker"],
      win,
      undefined,
    );

    await injectedService.checkAndHandlePendingImport();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("should clear localStorage only after entity creation, not before", async () => {
    let removedBeforeCreate = false;
    const storage: Record<string, string> = {};
    const draft = { type: "character", title: "Erasmus", content: "A mage." };
    storage["__codex_pending_import"] = JSON.stringify(draft);

    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
    });

    mockVaultStore.createEntity = vi.fn().mockImplementation(async () => {
      // At point of creation the key should still be present
      if (!storage["__codex_pending_import"]) removedBeforeCreate = true;
      return "e1";
    });

    await service.checkAndHandlePendingImport();

    expect(removedBeforeCreate).toBe(false);
    expect(storage["__codex_pending_import"]).toBeUndefined();
  });

  it("should wire [[wiki link]] connections between imported entities", async () => {
    mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
    // createEntity returns unique IDs per call
    mockVaultStore.createEntity = vi
      .fn()
      .mockResolvedValueOnce("id-valen")
      .mockResolvedValueOnce("id-guild");

    const drafts = [
      {
        type: "character",
        title: "Valen Frost",
        content: "Member of [[The Iron Guild]].",
        labels: ["world-anvil-import"],
      },
      {
        type: "faction",
        title: "The Iron Guild",
        content: "A secret society.",
        labels: ["world-anvil-import"],
      },
    ];
    localStorage.setItem("__codex_pending_import", JSON.stringify(drafts));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.addConnection).toHaveBeenCalledWith(
      "id-valen",
      "id-guild",
      "references",
      "The Iron Guild",
    );
  });

  it("should not wire connection to self or unknown entities", async () => {
    mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
    mockVaultStore.createEntity = vi.fn().mockResolvedValue("id-solo");

    const draft = {
      type: "character",
      title: "Solo",
      content: "Mentions [[Solo]] and [[Unknown Entity]].",
      labels: [],
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.addConnection).not.toHaveBeenCalled();
  });

  it("reads and clears the pending import via an injected storage", async () => {
    const mem = new Map<string, string>([
      [
        "__codex_pending_import",
        JSON.stringify({ type: "note", title: "Injected", content: "hi" }),
      ],
    ]);
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const injectedService = new SeoImportService(
      mockVaultStore,
      mockRegistryStore,
      storage,
    );

    const id = await injectedService.checkAndHandlePendingImport();

    expect(id).toMatchObject({ status: "imported", rootId: "e1" });
    expect(mockVaultStore.createEntity).toHaveBeenCalled();
    // Consumed from the injected storage, not the stubbed global.
    expect(mem.has("__codex_pending_import")).toBe(false);
    expect(localStorage.getItem("__codex_pending_import")).toBeNull();
  });

  it("should wire explicit references to connections", async () => {
    mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
    mockVaultStore.createEntity = vi
      .fn()
      .mockResolvedValueOnce("id-elara")
      .mockResolvedValueOnce("id-king");

    const drafts = [
      {
        type: "character",
        title: "Elara",
        content: "A brave warrior.",
        references: ["Goblin King"],
      },
      {
        type: "character",
        title: "Goblin King",
        content: "The evil king.",
      },
    ];
    localStorage.setItem("__codex_pending_import", JSON.stringify(drafts));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.addConnection).toHaveBeenCalledWith(
      "id-elara",
      "id-king",
      "references",
      "Goblin King",
    );
  });

  it("should preserve typed relationships, hierarchy, and imported assets", async () => {
    mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
    mockVaultStore.createEntity = vi
      .fn()
      .mockResolvedValueOnce("id-parent")
      .mockResolvedValueOnce("id-quest");

    const drafts = [
      {
        type: "location",
        title: "Greyharbor",
        content: "A port city.",
      },
      {
        type: "quest",
        title: "Protect the Harbor",
        content: "Keep the gates closed.",
        parentReference: "Greyharbor",
        relationships: [
          { title: "Greyharbor", type: "related_to", label: "Protects" },
        ],
        assets: [
          {
            originalName: "harbor.png",
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,iVBORw==",
          },
        ],
      },
    ];
    localStorage.setItem("__codex_pending_import", JSON.stringify(drafts));

    await service.checkAndHandlePendingImport();

    expect(mockVaultStore.createEntity).toHaveBeenNthCalledWith(
      2,
      "quest",
      "Protect the Harbor",
      expect.objectContaining({ content: "Keep the gates closed." }),
    );
    expect(mockVaultStore.updateEntity).toHaveBeenCalledWith("id-quest", {
      parent: "id-parent",
    });
    expect(mockVaultStore.addConnection).toHaveBeenCalledWith(
      "id-quest",
      "id-parent",
      "related_to",
      "Protects",
    );
    expect(mockVaultStore.saveImageToVault).toHaveBeenCalledWith(
      expect.any(File),
      "id-quest",
      "harbor.png",
    );
  });

  describe("recoverable import", () => {
    const PENDING = "__codex_pending_import";
    const PROGRESS = "__codex_pending_import_progress";

    /** createEntity that registers entities like the real store. */
    function trackingCreate(failOn: number[] = []) {
      let n = 0;
      mockVaultStore.createEntity = vi
        .fn()
        .mockImplementation(async (type: string, title: string) => {
          n++;
          if (failOn.includes(n)) throw new Error("disk full");
          const id = `id-${title}`;
          mockVaultStore.entities[id] = { id, title, connections: [] };
          return id;
        });
    }

    const pair = [
      { type: "character", title: "Alpha", content: "a" },
      { type: "character", title: "Beta", content: "b" },
    ];

    it("keeps the payload on partial failure and retry creates only the rest", async () => {
      trackingCreate([2]);
      localStorage.setItem(PENDING, JSON.stringify(pair));

      const first = await service.checkAndHandlePendingImport();

      expect(first).toEqual({ status: "failed", message: "disk full" });
      expect(localStorage.getItem(PENDING)).not.toBeNull();
      expect(localStorage.getItem(PROGRESS)).not.toBeNull();

      trackingCreate();
      const second = await service.checkAndHandlePendingImport();

      expect(second).toMatchObject({ status: "imported", count: 2 });
      expect(mockVaultStore.createEntity).toHaveBeenCalledTimes(1);
      expect(mockVaultStore.createEntity).toHaveBeenCalledWith(
        "character",
        "Beta",
        expect.anything(),
      );
      expect(localStorage.getItem(PENDING)).toBeNull();
      expect(localStorage.getItem(PROGRESS)).toBeNull();
    });

    it("keeps the payload when switching or creating a vault throws", async () => {
      mockVaultStore.activeVaultId = null;
      mockRegistryStore.availableVaults = [{ id: "v1", name: "Vault 1" }];
      mockVaultStore.switchVault.mockRejectedValue(new Error("nope"));
      localStorage.setItem(PENDING, JSON.stringify(pair[0]));

      expect(await service.checkAndHandlePendingImport()).toMatchObject({
        status: "failed",
      });
      expect(localStorage.getItem(PENDING)).not.toBeNull();

      mockRegistryStore.availableVaults = [];
      mockRegistryStore.createVault.mockRejectedValue(new Error("nope"));
      expect(await service.checkAndHandlePendingImport()).toMatchObject({
        status: "failed",
      });
      expect(localStorage.getItem(PENDING)).not.toBeNull();
    });

    it("discardPendingImport removes the payload and progress", () => {
      localStorage.setItem(PENDING, "x");
      localStorage.setItem(PROGRESS, "y");

      service.discardPendingImport();

      expect(localStorage.getItem(PENDING)).toBeNull();
      expect(localStorage.getItem(PROGRESS)).toBeNull();
    });

    it("removes an empty array payload and reports it invalid", async () => {
      localStorage.setItem(PENDING, "[]");

      expect(await service.checkAndHandlePendingImport()).toEqual({
        status: "invalid",
      });
      expect(localStorage.getItem(PENDING)).toBeNull();
    });

    it("selects the Point Crawl master note rather than the last location", async () => {
      trackingCreate();
      mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
      const batch = [
        {
          type: "location",
          title: "Gate",
          relationships: [{ title: "Hall", type: "route" }],
        },
        {
          type: "location",
          title: "Hall",
          relationships: [{ title: "Gate", type: "route" }],
        },
        {
          type: "note",
          title: "Crawl",
          relationships: [
            { title: "Gate", type: "contains" },
            { title: "Hall", type: "contains" },
          ],
        },
        { type: "location", title: "Vault" },
      ];
      localStorage.setItem(PENDING, JSON.stringify(batch));

      const res = await service.checkAndHandlePendingImport();

      expect(res).toMatchObject({
        status: "imported",
        rootId: "id-Crawl",
        rootTitle: "Crawl",
        count: 4,
      });
      expect(mockVaultStore.selectedEntityId).toBe("id-Crawl");
    });

    it("shares one in-flight run between concurrent calls", async () => {
      trackingCreate();
      localStorage.setItem(PENDING, JSON.stringify(pair));

      const a = service.checkAndHandlePendingImport();
      const b = service.checkAndHandlePendingImport();

      expect(b).toBe(a);
      await a;
      expect(mockVaultStore.createEntity).toHaveBeenCalledTimes(2);
    });

    it("does not duplicate a connection already present on re-run", async () => {
      trackingCreate([2]);
      mockVaultStore.addConnection = vi.fn().mockResolvedValue(undefined);
      const linked = [
        { type: "character", title: "Alpha", content: "see [[Beta]]" },
        { type: "character", title: "Beta", content: "b" },
      ];
      localStorage.setItem(PENDING, JSON.stringify(linked));
      await service.checkAndHandlePendingImport();

      mockVaultStore.entities["id-Alpha"].connections = [
        { target: "id-Beta", type: "references", label: "Beta" },
      ];
      trackingCreate();
      await service.checkAndHandlePendingImport();

      expect(mockVaultStore.addConnection).not.toHaveBeenCalled();
    });

    it("ignores a progress record from a different payload", async () => {
      trackingCreate();
      mockVaultStore.entities["id-Alpha"] = { id: "id-Alpha", title: "Zed" };
      localStorage.setItem(
        PROGRESS,
        JSON.stringify({
          fingerprint: "other",
          vaultId: "v1",
          created: { 0: { id: "id-Alpha", title: "Alpha" } },
        }),
      );
      localStorage.setItem(PENDING, JSON.stringify(pair));

      await service.checkAndHandlePendingImport();

      expect(mockVaultStore.createEntity).toHaveBeenCalledTimes(2);
    });
  });
});
