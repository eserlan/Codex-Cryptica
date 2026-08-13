import { describe, expect, it, vi } from "vitest";
import { AppEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";
import { SearchIndexLifecycle } from "./search-index-lifecycle";
import { SearchProgressCoordinator } from "./search-progress-coordinator";

function makeCallbacks() {
  return {
    onVaultSwitch: vi.fn().mockResolvedValue(undefined),
    onCacheLoaded: vi.fn().mockResolvedValue(undefined),
    onSyncChunk: vi.fn().mockResolvedValue(undefined),
    onSyncComplete: vi.fn().mockResolvedValue(undefined),
    onEntityUpdated: vi.fn().mockResolvedValue(undefined),
    onEntityDeleted: vi.fn().mockResolvedValue(undefined),
    onBatchCreated: vi.fn().mockResolvedValue(undefined),
    onBatchUpdated: vi.fn().mockResolvedValue(undefined),
    onVisibilityHide: vi.fn(),
  };
}

function makeCoordinator(activeVaultId: string | null = null) {
  const coordinator = new SearchProgressCoordinator({
    debug: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any,
    timers: { setTimeout: vi.fn(), clearTimeout: vi.fn() } as any,
    windowRef: undefined,
    onScheduledSave: vi.fn().mockResolvedValue(undefined),
  });
  coordinator.activeVaultId = activeVaultId;
  return coordinator;
}

function makeHarness(activeVaultId: string | null = null) {
  const eventBus = new AppEventBus();
  const coordinator = makeCoordinator(activeVaultId);
  const callbacks = makeCallbacks();
  const windowRef = {
    addEventListener: vi.fn((type: string, listener: any) => {
      if (type === "visibilitychange") {
        (windowRef as any)._visibilityListener = listener;
      }
    }),
  } as unknown as Window;
  const documentRef = { visibilityState: "visible" } as Document;

  new SearchIndexLifecycle({
    eventBus,
    coordinator,
    callbacks,
    windowRef,
    documentRef,
  });

  function emit(type: string, vaultId: string, payload: any = {}) {
    eventBus.emit({
      type,
      domain: "vault",
      payload,
      metadata: { timestamp: Date.now(), vaultId },
    } as any);
  }

  async function flush() {
    await new Promise((r) => setTimeout(r, 0));
  }

  return { callbacks, coordinator, windowRef, documentRef, emit, flush };
}

describe("SearchIndexLifecycle — VAULT_OPENING", () => {
  it("calls onVaultSwitch when vault ID changes", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-a");
    emit(VAULT_EVENTS.VAULT_OPENING, "vault-b");
    await flush();
    expect(callbacks.onVaultSwitch).toHaveBeenCalledWith("vault-b");
  });

  it("does not call onVaultSwitch when vault ID is the same", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.VAULT_OPENING, "vault-1");
    await flush();
    expect(callbacks.onVaultSwitch).not.toHaveBeenCalled();
  });
});

describe("SearchIndexLifecycle — VAULT_SWITCHED", () => {
  it("calls onVaultSwitch when vault ID differs from active", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-a");
    emit(VAULT_EVENTS.VAULT_SWITCHED, "vault-b", { id: "vault-b" });
    await flush();
    expect(callbacks.onVaultSwitch).toHaveBeenCalledWith("vault-b");
  });

  it("does not call onVaultSwitch when vault ID already matches", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.VAULT_SWITCHED, "vault-1", { id: "vault-1" });
    await flush();
    expect(callbacks.onVaultSwitch).not.toHaveBeenCalled();
  });
});

describe("SearchIndexLifecycle — CACHE_LOADED", () => {
  it("calls onCacheLoaded with vault ID and entity array", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    const entities = [{ id: "e1" }, { id: "e2" }];
    emit(VAULT_EVENTS.CACHE_LOADED, "vault-1", { entities });
    await flush();
    expect(callbacks.onCacheLoaded).toHaveBeenCalledWith("vault-1", entities);
  });

  it("normalises an entity object map to an array", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.CACHE_LOADED, "vault-1", {
      entities: { a: { id: "a" }, b: { id: "b" } },
    });
    await flush();
    expect(callbacks.onCacheLoaded).toHaveBeenCalledWith(
      "vault-1",
      expect.arrayContaining([{ id: "a" }, { id: "b" }]),
    );
  });
});

describe("SearchIndexLifecycle — SYNC_CHUNK_READY", () => {
  it("calls onSyncChunk with entities", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    const entities = [{ id: "x" }];
    emit(VAULT_EVENTS.SYNC_CHUNK_READY, "vault-1", { entities });
    await flush();
    expect(callbacks.onSyncChunk).toHaveBeenCalledWith(entities);
  });

  it("does not call onSyncChunk when entity list is empty", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.SYNC_CHUNK_READY, "vault-1", { entities: [] });
    await flush();
    expect(callbacks.onSyncChunk).not.toHaveBeenCalled();
  });
});

describe("SearchIndexLifecycle — SYNC_COMPLETE", () => {
  it("calls onSyncComplete with vault ID", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.SYNC_COMPLETE, "vault-1");
    await flush();
    expect(callbacks.onSyncComplete).toHaveBeenCalledWith("vault-1");
  });
});

describe("SearchIndexLifecycle — ENTITY_UPDATED", () => {
  it("calls onEntityUpdated with entity and patch", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    const entity = { id: "e1", title: "New Title" };
    const patch = { title: "New Title" };
    emit(VAULT_EVENTS.ENTITY_UPDATED, "vault-1", { entity, patch });
    await flush();
    expect(callbacks.onEntityUpdated).toHaveBeenCalledWith(entity, patch);
  });
});

describe("SearchIndexLifecycle — ENTITY_DELETED", () => {
  it("calls onEntityDeleted with entityId", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.ENTITY_DELETED, "vault-1", { entityId: "e1" });
    await flush();
    expect(callbacks.onEntityDeleted).toHaveBeenCalledWith("e1");
  });
});

describe("SearchIndexLifecycle — BATCH_CREATED", () => {
  it("calls onBatchCreated with entities", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    const entities = [{ id: "a" }, { id: "b" }];
    emit(VAULT_EVENTS.BATCH_CREATED, "vault-1", { entities });
    await flush();
    expect(callbacks.onBatchCreated).toHaveBeenCalledWith(entities);
  });
});

describe("SearchIndexLifecycle — BATCH_UPDATED patch filter", () => {
  it("calls onBatchUpdated only for entities with search-field patches", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    const entities = [{ id: "a" }, { id: "b" }];
    const patches = {
      a: { title: "new title" },
      b: { position: { x: 0 } },
    };
    emit(VAULT_EVENTS.BATCH_UPDATED, "vault-1", { entities, patches });
    await flush();
    expect(callbacks.onBatchUpdated).toHaveBeenCalledWith([{ id: "a" }]);
  });

  it("skips all entities when no patch touches a search field", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.BATCH_UPDATED, "vault-1", {
      entities: [{ id: "a" }],
      patches: { a: { position: { x: 0 } } },
    });
    await flush();
    expect(callbacks.onBatchUpdated).not.toHaveBeenCalled();
  });

  it("re-indexes conservatively when entity has no patch entry", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.BATCH_UPDATED, "vault-1", {
      entities: [{ id: "a" }],
      patches: {},
    });
    await flush();
    expect(callbacks.onBatchUpdated).toHaveBeenCalledWith([{ id: "a" }]);
  });

  it("does not call onBatchUpdated when entity list is empty", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.BATCH_UPDATED, "vault-1", { entities: [] });
    await flush();
    expect(callbacks.onBatchUpdated).not.toHaveBeenCalled();
  });
});

describe("SearchIndexLifecycle — stale-vault guard", () => {
  it("ignores sync events from a different vault than the active one", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.SYNC_CHUNK_READY, "vault-2", {
      entities: [{ id: "x" }],
    });
    await flush();
    expect(callbacks.onSyncChunk).not.toHaveBeenCalled();
  });

  it("ignores CACHE_LOADED from a stale vault", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.CACHE_LOADED, "vault-2", { entities: [] });
    await flush();
    expect(callbacks.onCacheLoaded).not.toHaveBeenCalled();
  });

  it("does not guard VAULT_OPENING — always routes the transition", async () => {
    const { callbacks, emit, flush } = makeHarness("vault-1");
    emit(VAULT_EVENTS.VAULT_OPENING, "vault-2");
    await flush();
    expect(callbacks.onVaultSwitch).toHaveBeenCalledWith("vault-2");
  });
});

describe("SearchIndexLifecycle — visibilitychange listener", () => {
  it("calls onVisibilityHide when page becomes hidden", () => {
    const { callbacks, windowRef, documentRef } = makeHarness("vault-1");
    (documentRef as any).visibilityState = "hidden";
    const listener = (windowRef as any)._visibilityListener;
    listener();
    expect(callbacks.onVisibilityHide).toHaveBeenCalled();
  });

  it("does not call onVisibilityHide when page is still visible", () => {
    const { callbacks, windowRef, documentRef } = makeHarness("vault-1");
    (documentRef as any).visibilityState = "visible";
    const listener = (windowRef as any)._visibilityListener;
    listener();
    expect(callbacks.onVisibilityHide).not.toHaveBeenCalled();
  });

  it("does not register listeners when windowRef is absent", () => {
    const eventBus = new AppEventBus();
    const coordinator = makeCoordinator("vault-1");
    const callbacks = makeCallbacks();
    const subscribeSpy = vi.spyOn(eventBus, "subscribe");

    new SearchIndexLifecycle({
      eventBus,
      coordinator,
      callbacks,
      windowRef: undefined,
    });

    expect(subscribeSpy).not.toHaveBeenCalled();
  });
});
