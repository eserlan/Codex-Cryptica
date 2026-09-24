import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const onlineState = vi.hoisted(() => ({ current: true }));
vi.mock("$lib/stores/online.svelte", () => ({
  onlineStatus: onlineState,
}));

vi.mock("./vault/events.svelte", () => {
  const listeners: ((event: unknown) => void)[] = [];
  return {
    vaultEventBus: {
      subscribe: (fn: (event: unknown) => void) => {
        listeners.push(fn);
        return () => {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      emit: (event: unknown) => listeners.forEach((fn) => fn(event)),
      __listeners: listeners,
    },
  };
});

import { CloudBackupStore } from "./cloud-backup.svelte";
import { vaultEventBus } from "./vault/events.svelte";
import { createMemoryStorage } from "@codex/cloud-backup-sync";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";

const MANIFEST = {
  schemaVersion: 1,
  backupId: "b-1",
  vaultTitle: "The Saltmere Fens",
  sizeBytes: 512,
  createdAt: "2026-08-31T10:00:00.000Z",
  lastPushedAt: "2026-08-31T10:00:00.000Z",
};

function harness(
  responses: { ok: boolean; status: number; body: unknown }[] = [],
  extraDeps: Record<string, unknown> = {},
  statusResponses: { ok: boolean; status: number; body: unknown }[] = [],
) {
  const calls: string[] = [];
  const queue = [...responses];
  const statusQueue = [...statusResponses];
  const storage = createMemoryStorage();
  const restoreLog: string[] = [];
  const store = new CloudBackupStore();

  store.configure({
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      fetch: (async (url: string) => {
        calls.push(url);
        // Guard reads hit /status: default to a matching stamp so
        // conflict-guard tests opt into divergence explicitly.
        const next =
          url.endsWith("/status") && !url.includes("/assets/")
            ? (statusQueue.shift() ?? {
                ok: true,
                status: 200,
                body: { lastPushedAt: MANIFEST.lastPushedAt },
              })
            : (queue.shift() ?? {
                ok: true,
                status: 200,
                body: { manifest: MANIFEST },
              });
        return {
          ok: next.ok,
          status: next.status,
          json: async () => next.body,
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }) as any,
    },
    buildPayload: async () => ({
      vaultTitle: "The Saltmere Fens",
      bundle: { entities: [] },
    }),
    activeVaultId: () => "v-1",
    ...extraDeps,
    restore: {
      createVault: async (name: string) => {
        restoreLog.push(`createVault:${name}`);
        return "new-vault-id";
      },
      importEntities: async (vaultId: string, entities: unknown[]) => {
        restoreLog.push(`importEntities:${vaultId}:${entities.length}`);
      },
      importMaps: async (vaultId: string, maps: unknown[]) => {
        restoreLog.push(`importMaps:${vaultId}:${maps.length}`);
      },
      importCanvases: async (vaultId: string, canvases: unknown[]) => {
        restoreLog.push(`importCanvases:${vaultId}:${canvases.length}`);
      },
    },
  });

  return { store, calls, storage, queue, restoreLog };
}

const ENABLE = {
  ok: true,
  status: 201,
  body: { backupId: "b-1", ownerCode: "code-1", manifest: MANIFEST },
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  (vaultEventBus as any).__listeners.length = 0;
});

describe("privacy gates", () => {
  it("stays off and silent for a vault that never consented", async () => {
    // FR-001, FR-003, SC-002: the machinery must be off, not just the UI.
    const { store, calls } = harness();
    await store.hydrate("v-1");

    expect(store.status).toBe("off");
    expect(store.consented).toBe(false);
    expect(calls).toEqual([]);
    expect((vaultEventBus as any).__listeners).toHaveLength(0);
  });

  it("sends nothing while editing with backup off", async () => {
    const { store, calls } = harness();
    await store.hydrate("v-1");

    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(30_000);

    expect(calls).toEqual([]);
  });

  it("distinguishes never-consented from consented-then-disabled", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");
    await store.disable("v-1");

    // Consent is remembered, so re-enabling does not re-prompt (FR-020).
    expect(store.status).toBe("off");
    expect(store.consented).toBe(true);
  });

  it("sends no request while disabled, even if Save is pressed", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    await store.disable("v-1");
    calls.length = 0;

    expect(await store.backUpNow()).toBe(false);
    expect(calls).toEqual([]);
  });

  it("only ever talks to the cloud-backup endpoints", async () => {
    // FR-004: vault content must not reach analytics or any other destination.
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    await store.backUpNow();

    expect(calls.length).toBeGreaterThan(0);
    for (const url of calls) {
      expect(url.startsWith("https://worker.test/api/cloud-backup/")).toBe(
        true,
      );
    }
  });
});

describe("review fixes", () => {
  it("resolves rather than throwing when the payload builder fails", async () => {
    // A throw here would escape to the consent dialog and leave it stuck.
    const { store } = harness([ENABLE]);
    (store as any).deps.buildPayload = async () => {
      throw new Error("vault unreadable");
    };
    await expect(store.enable("v-1")).resolves.toBe(false);
    expect(store.status).toBe("error");
    expect(store.errorMessage).toBe("vault unreadable");
  });

  it("shows the newly-opened vault's state after a switch", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");
    expect(store.status).toBe("idle");

    await store.hydrate("v-2");
    expect(store.status).toBe("off");
    expect(store.lastPushedAt).toBeNull();
  });

  it("clears a stale error when switching to a vault with no backup", async () => {
    const { store } = harness([
      { ok: false, status: 500, body: { error: { message: "Offline" } } },
    ]);
    await store.enable("v-1");
    expect(store.errorMessage).toBe("Offline");

    await store.hydrate("v-2");
    expect(store.errorMessage).toBeNull();
    expect(store.status).toBe("off");
  });
});

describe("enable", () => {
  it("backs up and reports a last-backed-up time", async () => {
    const { store } = harness([ENABLE]);
    const ok = await store.enable("v-1");
    expect(ok).toBe(true);
    expect(store.status).toBe("idle");
    expect(store.lastPushedAt).toBe(MANIFEST.lastPushedAt);
  });

  it("surfaces a failure as an error rather than a silent success", async () => {
    const { store } = harness([
      { ok: false, status: 413, body: { error: { message: "Too large" } } },
    ]);
    const ok = await store.enable("v-1");
    expect(ok).toBe(false);
    expect(store.status).toBe("error");
    expect(store.errorMessage).toBe("Too large");
  });

  it("rehydrates an enabled vault on load without re-prompting", async () => {
    const { store, storage } = harness();
    await storage.write("v-1", {
      vaultId: "v-1",
      backupId: "b-1",
      ownerCode: "code-1",
      enabled: true,
      status: "idle",
      lastPushedAt: MANIFEST.lastPushedAt,
      consentedAt: "2026-08-31T10:00:00.000Z",
    });

    await store.hydrate("v-1");
    expect(store.status).toBe("idle");
    expect(store.consented).toBe(true);
    expect(store.lastPushedAt).toBe(MANIFEST.lastPushedAt);
  });
});

describe("saving is explicit", () => {
  it("uploads when the user asks, and reports success", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    expect(await store.backUpNow()).toBe(true);
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(1);
    expect(store.status).toBe("idle");
  });

  it("never uploads on its own — no timer, no save hook", async () => {
    // The whole point of the manual model: nothing goes up unasked.
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    (vaultEventBus as any).emit({ type: "BATCH_UPDATED", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(calls).toEqual([]);
  });

  it("subscribes to nothing at all", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");
    expect((vaultEventBus as any).__listeners).toHaveLength(0);
  });

  it("does nothing when the vault is not enabled", async () => {
    const { store, calls } = harness();
    await store.hydrate("v-1");
    expect(await store.backUpNow()).toBe(false);
    expect(calls).toEqual([]);
  });

  it("shows an error state when a save fails, and never throws", async () => {
    const { store, queue } = harness([ENABLE]);
    await store.enable("v-1");
    queue.push({
      ok: false,
      status: 500,
      body: { error: { message: "Offline" } },
    });

    await expect(store.backUpNow()).resolves.toBe(false);
    expect(store.status).toBe("error");
    expect(store.errorMessage).toBe("Offline");
  });

  it("survives a payload builder that throws", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");
    (store as any).deps.buildPayload = async () => {
      throw new Error("vault unreadable");
    };

    await expect(store.backUpNow()).resolves.toBe(false);
    expect(store.status).toBe("error");
  });

  it("ignores a second save while one is in flight", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    const first = store.backUpNow();
    const second = store.backUpNow();
    expect(await second).toBe(false);
    await first;
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(1);
  });
});

describe("disable, delete and restore", () => {
  it("disables locally without contacting the server", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    await store.disable("v-1");
    expect(calls).toEqual([]);
    expect(store.status).toBe("off");
  });

  it("clears state once deletion succeeds", async () => {
    const { store, queue } = harness([ENABLE]);
    await store.enable("v-1");
    queue.push({ ok: true, status: 200, body: { deleted: true } });

    expect(await store.deleteBackup("v-1")).toBe(true);
    expect(store.status).toBe("off");
    expect(store.consented).toBe(false);
    expect(store.ownerCode).toBeNull();
  });

  it("keeps state and reports an error when deletion fails", async () => {
    const { store, queue } = harness([ENABLE]);
    await store.enable("v-1");
    queue.push({
      ok: false,
      status: 500,
      body: { error: { message: "Nope" } },
    });

    expect(await store.deleteBackup("v-1")).toBe(false);
    expect(store.status).toBe("error");
    expect(store.consented).toBe(true);
  });

  it("fetches a backup for restore without writing to the open vault", async () => {
    // FR-006/FR-006a: restore is explicit, and never replaces what is open.
    const { store } = harness([
      {
        ok: true,
        status: 200,
        body: { manifest: MANIFEST, bundle: { entities: [1] } },
      },
    ]);
    const material = await store.fetchForRestore("b-1", "code-1");

    expect(material?.manifest.vaultTitle).toBe("The Saltmere Fens");
    expect(store.status).toBe("off");
    expect(store.consented).toBe(false);
  });

  it("never restores automatically — only when explicitly asked", async () => {
    const { store, calls } = harness();
    await store.hydrate("v-1");
    (vaultEventBus as any).emit({ type: "VAULT_OPENING", vaultId: "v-1" });
    (vaultEventBus as any).emit({ type: "SYNC_COMPLETE", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(30_000);

    expect(calls.some((url) => url.endsWith("/bundle"))).toBe(false);
  });

  it("restores into a new vault, leaving the open one untouched", async () => {
    // FR-006a: the vault currently open is never silently replaced.
    const { store, restoreLog } = harness([
      {
        ok: true,
        status: 200,
        body: {
          manifest: MANIFEST,
          bundle: { entities: [{ id: "e1" }, { id: "e2" }] },
        },
      },
    ]);

    const result = await store.restoreIntoNewVault("b-1", "code-1");
    expect(result).toEqual({
      vaultId: "new-vault-id",
      vaultTitle: "The Saltmere Fens",
      missingAssets: 0,
    });
    // Download first, then create — a failed fetch must not leave a stub vault.
    expect(restoreLog).toEqual([
      "createVault:The Saltmere Fens",
      "importEntities:new-vault-id:2",
    ]);
  });

  it("restores maps and canvases, not just entities", async () => {
    // A vault is more than its entities; a restore that dropped maps and
    // canvases would look successful while losing work.
    const { store, restoreLog } = harness([
      {
        ok: true,
        status: 200,
        body: {
          manifest: MANIFEST,
          bundle: {
            entities: [{ id: "e1" }],
            maps: [{ id: "m1" }, { id: "m2" }],
            canvases: [{ id: "c1" }],
          },
        },
      },
    ]);

    await store.restoreIntoNewVault("b-1", "code-1");
    expect(restoreLog).toEqual([
      "createVault:The Saltmere Fens",
      "importEntities:new-vault-id:1",
      "importMaps:new-vault-id:2",
      "importCanvases:new-vault-id:1",
    ]);
  });

  it("creates no vault at all when the download fails", async () => {
    const { store, restoreLog } = harness([
      {
        ok: false,
        status: 404,
        body: { error: { message: "Backup not found" } },
      },
    ]);
    expect(await store.restoreIntoNewVault("b-1", "wrong")).toBeNull();
    expect(restoreLog).toEqual([]);
  });

  it("reports a vault-write failure without throwing", async () => {
    const { store } = harness([
      {
        ok: true,
        status: 200,
        body: { manifest: MANIFEST, bundle: { entities: [] } },
      },
    ]);
    (store as any).deps.restore.createVault = async () => {
      throw new Error("disk full");
    };
    expect(await store.restoreIntoNewVault("b-1", "code-1")).toBeNull();
    expect(store.errorMessage).toBe("disk full");
  });

  it("reports a failed restore rather than returning empty material", async () => {
    const { store } = harness([
      {
        ok: false,
        status: 404,
        body: { error: { message: "Backup not found" } },
      },
    ]);
    expect(await store.fetchForRestore("b-1", "wrong")).toBeNull();
    expect(store.errorMessage).toBe("Backup not found");
  });
});

describe("recovery key", () => {
  it("reveals a key carrying both halves a restore needs", async () => {
    // Showing only the code left users unable to restore: the backup id was
    // never surfaced anywhere, and restore requires it.
    const { store } = harness([ENABLE]);
    await store.enable("v-1");

    const key = await store.revealRecoveryKey("v-1");
    expect(key).toBe("b-1:code-1");
    expect(store.recoveryKey).toBe("b-1:code-1");
  });

  it("returns nothing for a vault with no backup", async () => {
    const { store } = harness();
    expect(await store.revealRecoveryKey("never-enabled")).toBeNull();
  });

  it("lists the backups this device can restore without a typed key", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");

    await store.loadKnownBackups();
    expect(store.knownBackups).toHaveLength(1);
    expect(store.knownBackups[0].recoveryKey).toBe("b-1:code-1");
    expect(store.knownBackups[0].vaultId).toBe("v-1");
  });

  it("has no known backups before anything is enabled", async () => {
    const { store } = harness();
    await store.loadKnownBackups();
    expect(store.knownBackups).toEqual([]);
  });
});

describe("automatic background sync (#3189)", () => {
  beforeEach(() => {
    onlineState.current = true;
    localStorage.clear();
  });

  /** Enables backup, then wires tiny debounce/retry windows for tests. */
  async function enabledHarness(
    responses: { ok: boolean; status: number; body: unknown }[] = [],
    statusResponses: { ok: boolean; status: number; body: unknown }[] = [],
  ) {
    const h = harness(
      [ENABLE, ...responses],
      {
        debounceMs: 20,
        retryMs: 30,
      },
      statusResponses,
    );
    await h.store.enable("v-1");
    return h;
  }

  it("pushes a debounced guarded sync after a local change", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;

    store.notifyLocalChange("v-1");
    expect(store.autoState).toBe("pending");
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(50);

    expect(calls.some((url) => url.endsWith("/commit"))).toBe(true);
    expect(store.autoState).toBe("saved");
  });

  it("coalesces rapid changes into a single push", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;

    store.notifyLocalChange("v-1");
    store.notifyLocalChange("v-1");
    store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(50);

    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(1);
  });

  it("sends nothing while backup is off, even when notified", async () => {
    const { store, calls } = harness();
    await store.hydrate("v-1");

    store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(100);

    expect(store.status).toBe("off");
    expect(store.autoState).toBe("idle");
    expect(calls).toEqual([]);
  });

  it("waits offline and syncs on reconnect without losing the change", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;
    onlineState.current = false;

    store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(50);

    expect(store.autoState).toBe("offline");
    expect(calls).toEqual([]);

    onlineState.current = true;
    await store.flushAutoSync();

    expect(calls.some((url) => url.endsWith("/commit"))).toBe(true);
    expect(store.autoState).toBe("saved");
  });

  it("retries a failed push with backoff and keeps local data", async () => {
    const { store, calls } = await enabledHarness(
      [],
      [{ ok: false, status: 503, body: {} }],
    );
    calls.length = 0;

    store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(25);

    expect(store.autoState).toBe("retrying");
    const firstAttempts = calls.filter((url) => url.endsWith("/commit")).length;

    await vi.advanceTimersByTimeAsync(100);

    expect(
      calls.filter((url) => url.endsWith("/commit")).length,
    ).toBeGreaterThan(firstAttempts);
    expect(store.autoState).toBe("saved");
  });

  it("pauses on a newer remote without uploading, and keep-mine resolves", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;

    // Guard read reports a newer remote commit from another device.
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ lastPushedAt: "2026-09-01T10:00:00.000Z" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ manifest: MANIFEST }),
      };
    });
    (store as any).deps.runtime.fetch = fetchMock;

    await store.flushAutoSync();

    expect(store.autoState).toBe("conflict");
    expect(store.autoConflictRemoteAt).toBe("2026-09-01T10:00:00.000Z");
    expect(calls.filter((url) => url.includes("/assets/"))).toHaveLength(0);
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(0);

    // Further edits must not queue an overwrite while paused.
    store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(100);
    expect(store.autoState).toBe("conflict");
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(0);

    // Explicit keep-mine pushes unguarded and resumes automation.
    const kept = await store.resolveConflictKeepMine();
    expect(kept).toBe(true);
    expect(store.autoState).toBe("saved");
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(1);
  });

  it("retries a failed keep-mine instead of stranding the retrying label", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;

    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ lastPushedAt: "2026-09-01T10:00:00.000Z" }),
        };
      }
      if (url.endsWith("/commit")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ manifest: MANIFEST }),
      };
    });
    (store as any).deps.runtime.fetch = fetchMock;

    await store.flushAutoSync();
    expect(store.autoState).toBe("conflict");

    // The choice stands but the commit fails: automation must stay pending
    // with a real retry scheduled.
    const kept = await store.resolveConflictKeepMine();
    expect(kept).toBe(false);
    expect(store.autoState).toBe("retrying");

    const commitsBefore = calls.filter((url) => url.endsWith("/commit")).length;
    await vi.advanceTimersByTimeAsync(50);

    // The retry re-guards, sees the still-newer remote, and pauses again —
    // nothing uploaded, and no retry storm follows.
    expect(store.autoState).toBe("conflict");
    expect(calls.filter((url) => url.endsWith("/commit"))).toHaveLength(
      commitsBefore,
    );
    expect(
      calls.filter((url) => url.endsWith("/status")).length,
    ).toBeGreaterThan(1);
  });

  it("skips close-time flushes when nothing is pending", async () => {
    const { store, calls } = await enabledHarness();
    store.startAutoSyncListeners();
    try {
      calls.length = 0;
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(0);
      // No pending queue: no guard read, no commit — closing the tab must
      // not manufacture a fresh remote timestamp for other devices to trip
      // over.
      expect(calls).toEqual([]);

      // A pending queue still flushes on close.
      (store as any).autoPending = true;
      window.dispatchEvent(new Event("pagehide"));
      await vi.advanceTimersByTimeAsync(50);
      expect(calls.some((url) => url.endsWith("/status"))).toBe(true);
    } finally {
      store.stopAutoSyncListeners();
    }
  });

  it("manual save satisfies pending autosync and clears conflict", async () => {
    const { store, calls } = await enabledHarness();
    (store as any).autoState = "conflict";
    (store as any).autoPending = true;
    calls.length = 0;

    const ok = await store.backUpNow();

    expect(ok).toBe(true);
    expect(store.autoState).toBe("saved");
    expect(store.autoConflictRemoteAt).toBeNull();
  });

  it("builds nothing and stops retrying when the record is disabled", async () => {
    const buildPayload = vi.fn(async () => ({
      vaultTitle: "The Saltmere Fens",
      bundle: { entities: [] },
    }));
    const h = harness([ENABLE], { debounceMs: 20, retryMs: 30, buildPayload });
    await h.store.enable("v-1");
    buildPayload.mockClear();
    h.calls.length = 0;
    // Disabled elsewhere (another tab, or a stale in-memory status).
    const record = await h.storage.read("v-1");
    await h.storage.write("v-1", { ...(record as object), enabled: false });

    h.store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(500);

    expect(buildPayload).not.toHaveBeenCalled();
    expect(h.calls).toEqual([]);
    expect(h.store.status).toBe("off");
    expect(h.store.autoState).toBe("idle");
  });

  it("aborts an in-flight build on disable and stays off", async () => {
    let buildSignal: AbortSignal | undefined;
    let finishBuild: () => void = () => {};
    const buildPayload = vi.fn(
      async (_vaultId: string, signal?: AbortSignal) => {
        buildSignal = signal;
        await new Promise<void>((resolve) => (finishBuild = resolve));
        return { vaultTitle: "The Saltmere Fens", bundle: { entities: [] } };
      },
    );
    const h = harness([ENABLE], { debounceMs: 20, retryMs: 30 });
    await h.store.enable("v-1");
    h.calls.length = 0;
    (h.store as any).deps.buildPayload = buildPayload;

    const saving = h.store.backUpNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(buildPayload).toHaveBeenCalledTimes(1);

    await h.store.disable("v-1");
    expect(buildSignal?.aborted).toBe(true);
    finishBuild();

    expect(await saving).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(h.store.status).toBe("off");
    expect(h.calls.some((url) => url.endsWith("/commit"))).toBe(false);
  });

  it("disable() cancels pending automation cold", async () => {
    const { store, calls } = await enabledHarness();
    calls.length = 0;

    store.notifyLocalChange("v-1");
    await store.disable("v-1");
    await vi.advanceTimersByTimeAsync(200);

    expect(store.autoState).toBe("idle");
    expect(calls).toEqual([]);
  });
});

describe("changed-item tracking (#3354)", () => {
  beforeEach(() => {
    onlineState.current = true;
    localStorage.clear();
  });

  const rowsOf = async (dirty: CloudBackupDirtyStore) =>
    (await dirty.snapshot("v-1")).map((row) => `${row.kind}:${row.id}`).sort();

  function trackedHarness(extra: Record<string, unknown> = {}) {
    const dirty = new CloudBackupDirtyStore(memoryDirtyStorage());
    const h = harness([ENABLE], {
      debounceMs: 20,
      retryMs: 30,
      dirty,
      ...extra,
    });
    return { ...h, dirty };
  }

  it("records nothing and sends nothing while backup is off", async () => {
    const { store, calls, dirty } = trackedHarness();
    await store.hydrate("v-1");

    await store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(await rowsOf(dirty)).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("clears what a push sent, keeping an edit made mid-push", async () => {
    let releaseBuild: () => void = () => {};
    let building = false;
    const buildPayload = vi.fn(async () => {
      if (building) await new Promise<void>((r) => (releaseBuild = r));
      return { vaultTitle: "The Saltmere Fens", bundle: { entities: [] } };
    });
    const { store, dirty } = trackedHarness({ buildPayload });
    await store.enable("v-1");

    await store.recordLocalChange(
      "v-1",
      { kind: "entity", ids: ["a", "b"] },
      { schedule: false },
    );
    building = true;
    const saving = store.backUpNow();
    await vi.advanceTimersByTimeAsync(0);
    // "b" is edited again while the snapshot is being built.
    await store.recordLocalChange(
      "v-1",
      { kind: "entity", ids: ["b"] },
      { schedule: false },
    );
    releaseBuild();
    expect(await saving).toBe(true);

    expect(await rowsOf(dirty)).toEqual(["entity:b"]);
  });

  it("clears pending changes when backup is turned off", async () => {
    const { store, dirty } = trackedHarness();
    await store.enable("v-1");
    await store.recordLocalChange(
      "v-1",
      { kind: "entity", ids: ["a"] },
      { schedule: false },
    );

    await store.disable("v-1");

    expect(await rowsOf(dirty)).toEqual([]);
  });

  it("tracks edits made while the first backup is being built", async () => {
    const ref: { store?: CloudBackupStore } = {};
    const buildPayload = vi.fn(async () => {
      await ref.store!.recordLocalChange(
        "v-1",
        { kind: "entity", ids: ["mid-enable"] },
        { schedule: false },
      );
      return { vaultTitle: "The Saltmere Fens", bundle: { entities: [] } };
    });
    const h = trackedHarness({ buildPayload });
    ref.store = h.store;

    expect(await h.store.enable("v-1")).toBe(true);
    expect(await rowsOf(h.dirty)).toEqual(["entity:mid-enable"]);
  });

  it("schedules an upload for edits but not for files re-read from disk", async () => {
    const { store, calls } = trackedHarness();
    await store.enable("v-1");
    calls.length = 0;

    await store.recordLocalChange(
      "v-1",
      { kind: "entity", ids: ["from-disk"] },
      { schedule: false },
    );
    await vi.advanceTimersByTimeAsync(200);
    expect(calls.some((url) => url.endsWith("/commit"))).toBe(false);

    await store.recordLocalChange("v-1", { kind: "entity", ids: ["edited"] });
    await vi.advanceTimersByTimeAsync(200);
    expect(calls.some((url) => url.endsWith("/commit"))).toBe(true);
  });
});
