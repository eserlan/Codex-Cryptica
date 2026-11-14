import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const onlineState = vi.hoisted(() => ({ current: true }));
vi.mock("#lib/stores/online.svelte.js", () => ({
  onlineStatus: onlineState,
}));

import { CloudBackupStore } from "./cloud-backup.svelte";
import {
  createMemoryStorage,
  getLocalCloudBackupRecord,
} from "@codex/cloud-backup-sync";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";
import { CloudBackupBaseStore, memoryBaseStorage } from "./cloud-backup-base";
import type { CloudBackupRemoteDeps } from "./cloud-backup-types";

type Reply = { ok: boolean; status: number; body: unknown };
type Entity = { id: string; title: string; [key: string]: unknown };

const MANIFEST = {
  schemaVersion: 1,
  backupId: "b-1",
  vaultTitle: "The Saltmere Fens",
  sizeBytes: 512,
  createdAt: "2026-08-31T10:00:00.000Z",
  lastPushedAt: "t2",
  revision: 3,
};
const ok = (body: unknown): Reply => ({ ok: true, status: 200, body });
const NO_CHANGES = ok({
  status: "changes",
  revision: 1,
  entities: [],
  tombstones: [],
});
const DIVERGED: Reply = {
  ok: false,
  status: 409,
  body: { error: { code: "diverged", lastPushedAt: "t1" } },
};
const feed = (
  revision: number,
  entities: Entity[],
  tombstones: unknown[] = [],
) =>
  ok({
    status: "changes",
    revision,
    entities: entities.map((entity) => ({ entity })),
    tombstones,
  });

async function setup(
  routes: Record<string, Reply[]> = {},
  recordOverrides: Record<string, unknown> = {},
  extraDeps: Record<string, unknown> = {},
) {
  const { remote: remoteOverrides, ...dependencyOverrides } = extraDeps;
  const calls: { tail: string; method: string }[] = [];
  const local = new Map<string, Entity>();
  const editing = new Set<string>();
  const released = new Set<() => void>();
  const writes: string[] = [];
  let activeVaultId = "v-1";
  let copies = 0;
  const storage = createMemoryStorage();
  await storage.write("v-1", {
    vaultId: "v-1",
    backupId: "b-1",
    ownerCode: "code-1",
    enabled: true,
    status: "idle",
    lastPushedAt: "t0",
    consentedAt: "2026-08-31T10:00:00.000Z",
    revision: 1,
    ...recordOverrides,
  });
  const dirty = new CloudBackupDirtyStore(memoryDirtyStorage());
  const base = new CloudBackupBaseStore(memoryBaseStorage());
  const defaults: Record<string, Reply> = {
    status: ok({ lastPushedAt: "t0" }),
    changes: NO_CHANGES,
    delta: ok({ manifest: MANIFEST }),
    commit: ok({ manifest: MANIFEST }),
    bundle: ok({ manifest: MANIFEST, bundle: { entities: [] } }),
  };
  const store = new CloudBackupStore();
  store.configure({
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      fetch: (async (url: string, init?: { method?: string }) => {
        const tail = url.split("?")[0].split("/").pop()!;
        calls.push({ tail, method: init?.method ?? "GET" });
        const next = routes[tail]?.shift() ?? defaults[tail];
        return {
          ok: next.ok,
          status: next.status,
          json: async () => next.body,
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }) as never,
    },
    buildPayload: async () => ({ vaultTitle: "T", bundle: { entities: [] } }),
    activeVaultId: () => activeVaultId,
    dirty,
    base,
    debounceMs: 20,
    retryMs: 100_000,
    buildDelta: async (_vaultId: string, rows: readonly any[]) => ({
      vaultTitle: "T",
      upserts: rows
        .filter((row) => row.kind === "entity" && !row.deleted)
        .map((row) => local.get(row.id)!),
      deletes: rows.filter((row) => row.deleted).map((row) => row.id),
      assetIds: [],
    }),
    remote: {
      readLocal: async (_vaultId: string, ids: readonly string[] | null) =>
        Object.fromEntries(
          [...local]
            .filter(([id]) => !ids || ids.includes(id))
            .map(([id, entity]) => [id, structuredClone(entity)]),
        ),
      apply: async (_vaultId: string, { updates, creates, deletes }: any) => {
        for (const entity of [...updates, ...creates]) {
          local.set(entity.id, entity);
          writes.push(entity.id);
        }
        for (const id of deletes) local.delete(id);
      },
      ensureAssets: async () => ({}),
      ...(remoteOverrides as Partial<CloudBackupRemoteDeps> | undefined),
      isEditing: (id: string) => editing.has(id),
      onEditingReleased: (listener: () => void) => {
        released.add(listener);
        return () => released.delete(listener);
      },
      newId: () => `copy-${++copies}`,
    },
    ...dependencyOverrides,
  } as never);
  const start = async () => {
    await store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    calls.length = 0;
  };
  const count = (tail: string) => calls.filter((c) => c.tail === tail).length;
  const record = () => getLocalCloudBackupRecord({ storage } as never, "v-1");
  return {
    store,
    calls,
    local,
    editing,
    released,
    writes,
    dirty,
    base,
    start,
    count,
    record,
    storage,
    setActiveVault: (vaultId: string) => {
      activeVaultId = vaultId;
    },
  };
}

const e = (
  id: string,
  title: string,
  over: Record<string, unknown> = {},
): Entity => ({
  id,
  title,
  content: "x",
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  onlineState.current = true;
});
afterEach(() => vi.useRealTimers());

describe("pull, merge and retry", () => {
  it("pulls, merges and pushes again after a rejected delta", async () => {
    const h = await setup({
      delta: [DIVERGED],
      changes: [NO_CHANGES, feed(2, [e("b", "Remote B")])],
    });
    await h.start();
    h.local.set("a", e("a", "A", { content: "mine" }));
    await h.base.recordSent("v-1", [e("a", "A")], []);

    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.local.get("b")?.title).toBe("Remote B");
    expect(h.calls.map((c) => c.tail)).toEqual([
      "delta",
      "status",
      "changes",
      "delta",
    ]);
    expect(h.store.autoState).toBe("saved");
    expect(await h.dirty.snapshot("v-1")).toEqual([]);
    expect((await h.record())?.foreignCommitSeen).toBe(true);
  });

  it("gives up after four rejected pushes and keeps every dirty row", async () => {
    const h = await setup({ delta: [DIVERGED, DIVERGED, DIVERGED, DIVERGED] });
    await h.start();
    h.local.set("a", e("a", "A", { content: "mine" }));

    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(4);
    expect(h.store.autoState).toBe("retrying");
    expect((await h.dirty.snapshot("v-1")).map((row) => row.id)).toEqual(["a"]);
  });

  it("stops without a failure when an open editor holds the pull back", async () => {
    const h = await setup({
      delta: [DIVERGED],
      changes: [NO_CHANGES, feed(2, [e("b", "Remote B")])],
    });
    await h.start();
    h.local.set("a", e("a", "A", { content: "mine" }));
    h.editing.add("b");

    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(1);
    expect(h.store.autoState).toBe("pending");
    expect((await h.dirty.snapshot("v-1")).length).toBe(1);
  });

  it("loads the bundle on resync and keeps a local-only entity", async () => {
    const h = await setup({
      changes: [ok({ status: "resync", revision: 5 })],
      bundle: [
        ok({
          manifest: { ...MANIFEST, revision: 5, lastPushedAt: "t5" },
          bundle: { entities: [e("r1", "From bundle")] },
        }),
      ],
    });
    h.local.set("fresh", e("fresh", "Never pushed"));

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.count("bundle")).toBe(1);
    expect([...h.local.keys()].sort()).toEqual(["fresh", "r1"]);
    expect((await h.record())?.revision).toBe(5);
    expect(h.store.lastPushedAt).toBe("t5");
    expect(await h.base.get("v-1", "r1")).toMatchObject({
      title: "From bundle",
    });
  });

  it("does not apply a feed when the active vault changes during asset fetch", async () => {
    let handle: Awaited<ReturnType<typeof setup>>;
    const h = (handle = await setup(
      {
        changes: [
          feed(2, [e("remote", "Remote", { image: "images/remote.png" })]),
        ],
      },
      {},
      {
        remote: {
          ensureAssets: async () => {
            handle.setActiveVault("v-2");
            return {};
          },
        },
      },
    ));

    await h.start();

    expect(h.writes).toEqual([]);
    expect(h.local.has("remote")).toBe(false);
    expect(await h.base.get("v-1", "remote")).toBeUndefined();
  });

  it("makes no request while offline, and one after coming online", async () => {
    onlineState.current = false;
    const h = await setup();
    await h.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.count("changes")).toBe(0);

    onlineState.current = true;
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(1);
    expect(h.count("changes")).toBe(1);
  });

  it("holds back an entity that is open in an editor", async () => {
    const h = await setup({
      changes: [
        feed(2, [e("a", "Remote A", { content: "theirs" }), e("c", "C")]),
      ],
    });
    h.local.set("a", e("a", "A"));
    await h.base.recordSent("v-1", [e("a", "A")], []);
    h.editing.add("a");

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.local.get("a")?.title).toBe("A");
    expect(await h.base.get("v-1", "a")).toMatchObject({ title: "A" });
    expect(h.local.get("c")?.title).toBe("C");
    expect((await h.record())?.revision).toBe(1);
  });

  it("pulls again when the last editor closes", async () => {
    const h = await setup();
    await h.start();
    h.local.set("a", e("a", "A"));
    await h.base.recordSent("v-1", [e("a", "A")], []);
    h.editing.add("a");
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    h.calls.length = 0;

    h.editing.clear();
    h.released.forEach((listener) => listener());
    await vi.advanceTimersByTimeAsync(1);
    expect(h.count("changes")).toBe(1);
  });

  it("pauses when the change feed is unsupported, and keep-mine still works", async () => {
    const h = await setup({
      delta: [DIVERGED],
      changes: [NO_CHANGES, { ok: false, status: 404, body: {} }],
    });
    await h.start();
    h.local.set("a", e("a", "A", { content: "mine" }));

    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.store.autoState).toBe("conflict");
    expect(h.count("delta")).toBe(1);

    expect(await h.store.resolveConflictKeepMine()).toBe(true);
    expect(h.count("commit")).toBe(1);
    expect(h.store.autoState).toBe("saved");
    expect((await h.record())?.foreignCommitSeen).toBeUndefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.count("changes")).toBe(1);
  });

  it("does not send an upsert that equals its merge base", async () => {
    const h = await setup();
    await h.start();
    h.local.set("a", e("a", "A", { updatedAt: 9 }));
    await h.base.recordSent("v-1", [e("a", "A", { updatedAt: 1 })], []);

    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(0);
    expect(await h.dirty.snapshot("v-1")).toEqual([]);
    expect(h.store.autoState).toBe("saved");
  });

  it("pauses a whole-item push once another device has committed", async () => {
    const h = await setup({}, { foreignCommitSeen: true });
    await h.start();

    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(0);
    expect(h.count("commit")).toBe(0);
    expect(h.store.autoState).toBe("conflict");
  });

  it("keeps both versions on a same-field clash and says so", async () => {
    const h = await setup({
      changes: [feed(2, [e("a", "Theirs")])],
    });
    h.local.set("a", e("a", "Mine"));
    await h.base.recordSent("v-1", [e("a", "Orig")], []);

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.local.get("a")?.title).toBe("Theirs");
    expect(h.local.get("copy-1")).toMatchObject({
      title: "Mine (this device's version)",
    });
    expect(h.store.mergeNotice).toEqual({ merged: 1, copies: ["Mine"] });
  });

  it("pulls every 30 seconds, but not while a push is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const h = await setup(
      {},
      {},
      {
        buildDelta: async () => {
          await gate;
          return { vaultTitle: "T", upserts: [], deletes: [], assetIds: [] };
        },
      },
    );
    await h.start();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(h.count("changes")).toBe(1);

    await h.store.recordLocalChange(
      "v-1",
      { kind: "entity", ids: ["a"] },
      { schedule: false },
    );
    const push = h.store.flushAutoSync();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(h.count("changes")).toBe(1);

    release();
    await push;
  });
});
