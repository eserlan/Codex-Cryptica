import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

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
) {
  const calls: string[] = [];
  const queue = [...responses];
  const storage = createMemoryStorage();
  const restoreLog: string[] = [];
  const store = new CloudBackupStore();

  store.configure({
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      fetch: (async (url: string) => {
        calls.push(url);
        const next = queue.shift() ?? {
          ok: true,
          status: 200,
          body: { manifest: MANIFEST },
        };
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
    restore: {
      createVault: async (name: string) => {
        restoreLog.push(`createVault:${name}`);
        return "new-vault-id";
      },
      importEntities: async (vaultId: string, entities: unknown[]) => {
        restoreLog.push(`importEntities:${vaultId}:${entities.length}`);
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

  it("sends nothing when saves happen with backup off", async () => {
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

  it("sends no request while disabled, even as saves keep arriving", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    await store.disable("v-1");
    calls.length = 0;

    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toEqual([]);
  });

  it("only ever talks to the cloud-backup endpoints", async () => {
    // FR-004: vault content must not reach analytics or any other destination.
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(6_000);

    expect(calls.length).toBeGreaterThan(0);
    for (const url of calls) {
      expect(url.startsWith("https://worker.test/api/cloud-backup/")).toBe(
        true,
      );
    }
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

describe("push on save", () => {
  it("pushes after a save once backup is on", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(6_000);

    expect(calls.some((url) => url.endsWith("/push"))).toBe(true);
  });

  it("collapses a burst of saves into a single push", async () => {
    // The snapshot is the whole vault; one upload per keystroke would be absurd.
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    for (let i = 0; i < 10; i += 1) {
      (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.advanceTimersByTimeAsync(6_000);

    expect(calls.filter((url) => url.endsWith("/push"))).toHaveLength(1);
  });

  it("does not schedule anything for events that are not content changes", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    (vaultEventBus as any).emit({ type: "VAULT_OPENING", vaultId: "v-1" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toEqual([]);
  });

  it("never pushes on a timer without a save (FR-018: no polling)", async () => {
    const { store, calls } = harness([ENABLE]);
    await store.enable("v-1");
    calls.length = 0;

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(calls).toEqual([]);
  });

  it("shows an error state when a push fails, and never throws", async () => {
    const { store, queue } = harness([ENABLE]);
    await store.enable("v-1");
    queue.push({
      ok: false,
      status: 500,
      body: { error: { message: "Offline" } },
    });

    (vaultEventBus as any).emit({ type: "ENTITY_UPDATED", vaultId: "v-1" });
    await expect(vi.advanceTimersByTimeAsync(6_000)).resolves.not.toThrow();

    expect(store.status).toBe("error");
    expect(store.errorMessage).toBe("Offline");
  });

  it("survives a payload builder that throws, without breaking the save path", async () => {
    const { store } = harness([ENABLE]);
    await store.enable("v-1");
    (store as any).deps.buildPayload = async () => {
      throw new Error("vault unreadable");
    };

    await expect(store.pushNow()).resolves.toBeUndefined();
    expect(store.status).toBe("error");
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
    });
    // Download first, then create — a failed fetch must not leave a stub vault.
    expect(restoreLog).toEqual([
      "createVault:The Saltmere Fens",
      "importEntities:new-vault-id:2",
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
