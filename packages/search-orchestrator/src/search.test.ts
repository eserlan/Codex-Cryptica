import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchService } from "./search.svelte";
import { VAULT_EVENTS } from "@codex/vault-engine";

function createCollection(records: any[]) {
  return {
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue(records),
        count: vi.fn().mockResolvedValue(records.length),
        offset: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue(records),
          })),
        })),
      })),
    })),
  };
}

function createDb(
  options: {
    savedIndex?: any;
    graphEntities?: any[];
    entityContent?: any[];
  } = {},
) {
  return {
    searchIndex: {
      get: vi.fn().mockResolvedValue(options.savedIndex ?? undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    graphEntities: createCollection(options.graphEntities ?? []),
    entityContent: createCollection(options.entityContent ?? []),
  } as any;
}

function createApi() {
  return {
    setLogger: vi.fn(),
    setChangeCallback: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
    addBatch: vi.fn().mockResolvedValue(undefined),
    addBatchProgressive: vi
      .fn()
      .mockImplementation(async (entries, options) => ({
        runId: options.runId,
        vaultId: options.vaultId,
        acceptedCount: entries.length,
        failedIds: [],
      })),
    remove: vi.fn().mockResolvedValue(undefined),
    searchOptimized: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    exportIndex: vi
      .fn()
      .mockResolvedValue({ _docIds: ["one"], segment: "data" }),
    importIndex: vi.fn().mockResolvedValue(undefined),
  };
}

function createHarness(
  options: {
    api?: ReturnType<typeof createApi>;
    db?: any;
  } = {},
) {
  let handler: ((event: any) => Promise<void>) | null = null;
  const eventBus = {
    subscribe: vi.fn((_, callback) => {
      handler = callback;
      return () => {};
    }),
  };
  const debug = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const timers = {
    setTimeout: vi.fn((callback: any) => {
      if (typeof callback === "function") callback();
      return 1 as any;
    }),
    clearTimeout: vi.fn(),
  };
  const windowRef = {
    addEventListener: vi.fn(),
  } as any;
  const service = new SearchService({
    api: options.api ?? createApi(),
    db: options.db ?? createDb(),
    eventBus: eventBus as any,
    debug: debug as any,
    timers: timers as any,
    windowRef,
    documentRef: { visibilityState: "visible" } as any,
  });

  return { service, handler: () => handler!, eventBus, debug, timers };
}

function vaultEvent(type: string, vaultId: string, payload: any = {}) {
  return {
    type,
    metadata: { vaultId },
    payload,
  };
}

describe("SearchService progressive indexing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes idle progress immediately and unsubscribes listeners", () => {
    const { service } = createHarness();
    const listener = vi.fn();

    const unsubscribe = service.subscribeIndexProgress(listener);
    unsubscribe();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: "idle", isPartial: false }),
    );
  });

  it("uses constructor-injected api and database dependencies", async () => {
    const api = createApi();
    const db = createDb({ graphEntities: [{ id: "one", title: "One" }] });
    const { service, handler } = createHarness({ api, db });

    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", {
        entities: [{ id: "one", title: "One" }],
      }),
    );

    expect(api.addBatchProgressive).toHaveBeenCalled();
    expect(db.searchIndex.put).not.toHaveBeenCalled();
    expect(service.getIndexProgress().status).toBe("partial");
  });

  it("reports partial progress while indexing cold metadata chunks", async () => {
    const entities = Array.from({ length: 125 }, (_, index) => ({
      id: `entity-${index}`,
      title: `Entity ${index}`,
    }));
    const api = createApi();
    const { service, handler } = createHarness({
      api,
      db: createDb({ graphEntities: entities }),
    });
    const progress = vi.fn();
    service.subscribeIndexProgress(progress);

    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", { entities }),
    );

    expect(api.addBatchProgressive).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "partial",
        indexedCount: 100,
        totalCount: 125,
      }),
    );
    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "partial", indexedCount: 125 }),
    );
  });

  it("fails with retry enabled when worker batch indexing rejects", async () => {
    const api = createApi();
    api.addBatchProgressive.mockRejectedValueOnce(new Error("worker failed"));
    const { service, handler } = createHarness({ api });

    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", {
        entities: [{ id: "one", title: "One" }],
      }),
    );

    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({
        status: "failed",
        canRetry: true,
        error: "worker failed",
      }),
    );
  });

  it("keeps the queue usable after a progressive batch failure so retry can index", async () => {
    const api = createApi();
    api.addBatchProgressive
      .mockRejectedValueOnce(new Error("worker failed"))
      .mockImplementation(async (entries, options) => ({
        runId: options.runId,
        vaultId: options.vaultId,
        acceptedCount: entries.length,
        failedIds: [],
      }));
    const { service, handler } = createHarness({ api });

    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", {
        entities: [{ id: "one", title: "One" }],
      }),
    );
    await service.retryIndexing();

    expect(api.addBatchProgressive).toHaveBeenCalledTimes(2);
    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "ready", canRetry: false }),
    );
  });

  it("retries the full content sweep after content indexing fails", async () => {
    const api = createApi();
    const metadata = [{ id: "one", title: "One" }];
    const contentRecords = [
      {
        entityId: "one",
        vaultId: "vault-1",
        content: "full searchable body",
        lore: "deep lore",
      },
    ];
    let failContentRead = true;
    let contentReads = 0;
    const db = createDb({ graphEntities: metadata });
    db.entityContent.where = vi.fn((field) => {
      if (failContentRead) {
        throw new Error("content read failed");
      }
      if (field === "vaultId") {
        return {
          equals: vi.fn(() => ({
            count: vi.fn().mockResolvedValue(contentRecords.length),
          })),
        } as any;
      }
      return {
        between: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn().mockImplementation(async () => {
              contentReads += 1;
              return contentReads === 1 ? contentRecords : [];
            }),
          })),
        })),
      } as any;
    });
    const { service, handler } = createHarness({ api, db });

    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", { entities: metadata }),
    );

    await (service as any).indexContentInBackground("vault-1");
    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "failed", canRetry: true }),
    );

    failContentRead = false;
    await service.retryIndexing();

    expect(db.entityContent.where).toHaveBeenCalled();
    expect(api.addBatchProgressive).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          id: "one",
          content: "full searchable body",
          keywords: "deep lore",
        }),
      ],
      expect.objectContaining({ vaultId: "vault-1" }),
    );
    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "ready", isPartial: false }),
    );
    expect(db.searchIndex.put).toHaveBeenCalled();
  });

  it("cancels active runs on vault switch", async () => {
    const { service, handler } = createHarness();
    await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-a"));
    await handler()(
      vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-a", {
        entities: [{ id: "one", title: "One" }],
      }),
    );

    await handler()({
      type: VAULT_EVENTS.VAULT_SWITCHED,
      metadata: { vaultId: "vault-b" },
      payload: { id: "vault-b" },
    });

    expect(service.getIndexProgress()).toEqual(
      expect.objectContaining({
        status: "cancelled",
        vaultId: "vault-a",
      }),
    );
  });

  it("uses requestIdleCallback to schedule yielding during background indexing", async () => {
    const originalRequestIdleCallback = globalThis.requestIdleCallback;
    const idleSpy = vi.fn((cb: any) => cb());
    globalThis.requestIdleCallback = idleSpy as any;

    try {
      const api = createApi();
      const metadata = [{ id: "one", title: "One" }];

      const db = createDb({ graphEntities: metadata });
      let callCount = 0;
      db.entityContent.where = vi.fn((field) => {
        if (field === "vaultId") {
          return {
            equals: vi.fn(() => ({
              count: vi.fn().mockResolvedValue(100),
            })),
          } as any;
        }
        return {
          between: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                  return Array.from({ length: 100 }, (_, i) => ({
                    entityId: `entity-${i}`,
                    vaultId: "vault-1",
                    content: "dummy",
                    lore: "dummy",
                  }));
                }
                return [];
              }),
            })),
          })),
        } as any;
      });

      const { service, handler } = createHarness({ api, db });

      await handler()(vaultEvent(VAULT_EVENTS.VAULT_OPENING, "vault-1"));
      await handler()(
        vaultEvent(VAULT_EVENTS.CACHE_LOADED, "vault-1", {
          entities: metadata,
        }),
      );

      await (service as any).indexContentInBackground("vault-1");

      expect(idleSpy).toHaveBeenCalled();
    } finally {
      globalThis.requestIdleCallback = originalRequestIdleCallback;
    }
  });
});
