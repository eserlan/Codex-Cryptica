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
    vi.stubGlobal("window", {});

    mockVaultStore = {
      isInitialized: true,
      activeVaultId: "v1",
      entities: {},
      init: vi.fn().mockResolvedValue(undefined),
      switchVault: vi.fn().mockResolvedValue(undefined),
      createEntity: vi.fn().mockResolvedValue("e1"),
      selectedEntityId: null,
    };

    mockRegistryStore = {
      availableVaults: [{ id: "v1", name: "Vault 1" }],
      init: vi.fn().mockResolvedValue(undefined),
      createVault: vi.fn().mockResolvedValue("new-v"),
      setActiveVault: vi.fn().mockResolvedValue(undefined),
    };

    service = new SeoImportService(mockVaultStore, mockRegistryStore);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return null if no pending import exists", async () => {
    const res = await service.checkAndHandlePendingImport();
    expect(res).toBeNull();
  });

  it("should parse, validate and import a valid draft and select the entity", async () => {
    const draft = {
      type: "character",
      title: "Valen Frost",
      content: "A brave elven warrior.",
      lore: "Strength: 18",
      labels: ["custom-label"],
    };
    localStorage.setItem("__codex_pending_import", JSON.stringify(draft));

    const res = await service.checkAndHandlePendingImport();

    expect(res).toBe("e1");
    expect(mockVaultStore.createEntity).toHaveBeenCalledWith(
      "character",
      "Valen Frost",
      {
        content: "A brave elven warrior.",
        lore: "Strength: 18",
        labels: ["custom-label"],
        status: "active",
      },
    );
    expect(mockVaultStore.selectedEntityId).toBe("e1");
    expect(localStorage.getItem("__codex_pending_import")).toBeNull();
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

    expect(res).toBeNull();
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

    expect(res).toBe("e1"); // mock createEntity resolves to e1
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
    vi.stubGlobal("window", {
      location: {
        pathname: "/test-path",
        search: "?utm_source=generator-faction&utm_medium=save-to-vault",
        hash: "#test-hash",
      },
      history: {
        replaceState,
      },
    });
    vi.stubGlobal("document", {
      title: "Test Page",
    });

    const res = await service.checkAndHandlePendingImport();
    expect(res).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(
      {},
      "Test Page",
      "/test-path#test-hash",
    );
  });

  it("should not strip query parameters if utm_source is not present", async () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        pathname: "/test-path",
        search: "?other_param=123",
        hash: "#test-hash",
      },
      history: {
        replaceState,
      },
    });

    await service.checkAndHandlePendingImport();
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

    expect(id).toBe("e1");
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
});
