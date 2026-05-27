import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";
import { SearchService } from "./search.svelte";
import { createStaleGuard } from "../stores/vault/utils";

// ---------------------------------------------------------------------------
// Minimal mock API — stands in for the Comlink-wrapped SearchEngine worker.
// ---------------------------------------------------------------------------
function makeApi() {
  return {
    setLogger: vi.fn().mockResolvedValue(undefined),
    setChangeCallback: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    addBatch: vi.fn().mockResolvedValue(undefined),
    addBatchProgressive: vi.fn().mockResolvedValue({
      runId: "legacy",
      vaultId: "vault-1",
      acceptedCount: 0,
      failedIds: [],
    }),
    remove: vi.fn().mockResolvedValue(undefined),
    searchOptimized: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    exportIndex: vi.fn().mockResolvedValue({}),
    importIndex: vi.fn().mockResolvedValue(undefined),
  };
}

function makeEntity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Entity ${id}`,
    type: "character",
    content: "",
    lore: "",
    labels: [],
    aliases: [],
    connections: [],
    metadata: {},
    status: "active",
    _path: [`${id}.md`],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeWindowRef() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Window;
}

function makeService(api = makeApi(), eventBus = new AppEventBus()) {
  const db = {
    searchIndex: { get: vi.fn().mockResolvedValue(null) },
    graphEntities: {
      where: vi.fn().mockReturnValue({
        equals: vi
          .fn()
          .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
    },
    entityContent: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          count: vi.fn().mockResolvedValue(0),
          offset: vi.fn().mockReturnThis(),
          limit: vi
            .fn()
            .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    },
  } as any;

  const debug = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as any;

  const service = new SearchService({
    api,
    db,
    eventBus,
    debug,
    windowRef: makeWindowRef(),
    documentRef: undefined,
  });

  return { service, api, eventBus };
}

function emitVaultEvent(
  eventBus: AppEventBus,
  type: string,
  payload: Record<string, unknown>,
  vaultId = "vault-1",
) {
  eventBus.emit({
    type,
    domain: "vault",
    payload,
    metadata: { timestamp: Date.now(), vaultId },
  } as any);
}

async function flush() {
  // Let microtasks and promise chains drain.
  await new Promise((r) => setTimeout(r, 0));
}

// ---------------------------------------------------------------------------
// Tests: BATCH_UPDATED handler
// ---------------------------------------------------------------------------
describe("SearchService — BATCH_UPDATED", () => {
  let api: ReturnType<typeof makeApi>;
  let eventBus: AppEventBus;
  let _service: SearchService;

  beforeEach(async () => {
    ({ api, eventBus, service: _service } = makeService());

    // Bring the service to an active state for vault-1.
    emitVaultEvent(eventBus, VAULT_EVENTS.VAULT_OPENING, {}, "vault-1");
    await flush();
  });

  it("calls indexBatch when BATCH_UPDATED arrives with entities", async () => {
    const entities = [makeEntity("e-1"), makeEntity("e-2")];

    emitVaultEvent(eventBus, VAULT_EVENTS.BATCH_UPDATED, {
      entities,
      patches: {},
    });
    await flush();

    expect(api.addBatch).toHaveBeenCalledTimes(1);
    const sentEntries = api.addBatch.mock.calls[0][0] as any[];
    expect(sentEntries).toHaveLength(2);
    expect(sentEntries.map((e: any) => e.id)).toEqual(
      expect.arrayContaining(["e-1", "e-2"]),
    );
  });

  it("does not call indexBatch when BATCH_UPDATED payload is empty", async () => {
    emitVaultEvent(eventBus, VAULT_EVENTS.BATCH_UPDATED, {
      entities: [],
      patches: {},
    });
    await flush();

    expect(api.addBatch).not.toHaveBeenCalled();
  });

  it("normalises an entity map to an array before indexing", async () => {
    const entitiesMap = {
      "e-3": makeEntity("e-3"),
      "e-4": makeEntity("e-4"),
    };

    emitVaultEvent(eventBus, VAULT_EVENTS.BATCH_UPDATED, {
      entities: entitiesMap,
      patches: {},
    });
    await flush();

    expect(api.addBatch).toHaveBeenCalledTimes(1);
    expect(api.addBatch.mock.calls[0][0]).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: BATCH_CREATED handler (regression guard)
// ---------------------------------------------------------------------------
describe("SearchService — BATCH_CREATED", () => {
  it("calls indexBatch when BATCH_CREATED arrives with entities", async () => {
    const { api, eventBus } = makeService();
    emitVaultEvent(eventBus, VAULT_EVENTS.VAULT_OPENING, {}, "vault-1");
    await flush();

    emitVaultEvent(eventBus, VAULT_EVENTS.BATCH_CREATED, {
      entities: [makeEntity("e-5")],
    });
    await flush();

    expect(api.addBatch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: ENTITY_UPDATED — connection-only patch must NOT trigger indexing
// ---------------------------------------------------------------------------
describe("SearchService — ENTITY_UPDATED with connection-only patch", () => {
  it("skips indexing when only connections changed", async () => {
    const { api, eventBus } = makeService();
    emitVaultEvent(eventBus, VAULT_EVENTS.VAULT_OPENING, {}, "vault-1");
    await flush();

    const entity = makeEntity("e-6");
    emitVaultEvent(eventBus, VAULT_EVENTS.ENTITY_UPDATED, {
      id: "e-6",
      entity,
      patch: { connections: [] },
    });
    await flush();

    expect(api.add).not.toHaveBeenCalled();
    expect(api.addBatch).not.toHaveBeenCalled();
  });

  it("indexes when title changes alongside connections", async () => {
    const { api, eventBus } = makeService();
    emitVaultEvent(eventBus, VAULT_EVENTS.VAULT_OPENING, {}, "vault-1");
    await flush();

    const entity = makeEntity("e-7", { title: "New Title" });
    emitVaultEvent(eventBus, VAULT_EVENTS.ENTITY_UPDATED, {
      id: "e-7",
      entity,
      patch: { title: "New Title", connections: [] },
    });
    await flush();

    expect(api.add).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: createStaleGuard
// ---------------------------------------------------------------------------
describe("createStaleGuard", () => {
  it("returns false when vault and signal are unchanged", () => {
    const vaultId = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    expect(isStale()).toBe(false);
  });

  it("returns true when vault ID changes after creation", () => {
    let vaultId: string | null = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    vaultId = "vault-b";
    expect(isStale()).toBe(true);
  });

  it("returns true when vault ID becomes null after creation", () => {
    let vaultId: string | null = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    vaultId = null;
    expect(isStale()).toBe(true);
  });

  it("returns true when the AbortSignal is aborted", () => {
    const vaultId = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    const controller = new AbortController();
    controller.abort();
    expect(isStale(controller.signal)).toBe(true);
  });

  it("returns false when signal is present but not aborted", () => {
    const vaultId = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    const controller = new AbortController();
    expect(isStale(controller.signal)).toBe(false);
  });

  it("returns true when both vault changed and signal is aborted", () => {
    let vaultId: string | null = "vault-a";
    const isStale = createStaleGuard(() => vaultId);
    vaultId = "vault-b";
    const controller = new AbortController();
    controller.abort();
    expect(isStale(controller.signal)).toBe(true);
  });
});
