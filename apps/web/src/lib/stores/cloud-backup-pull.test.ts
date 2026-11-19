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
  const calls: { tail: string; method: string; body?: any }[] = [];
  const local = new Map<string, Entity>();
  const wholeLocal = {
    map: new Map<string, Entity>(),
    canvas: new Map<string, Entity>(),
  };
  const wholeApplied: { kind: string; changes: any }[] = [];
  const wholeDownloads: string[] = [];
  const wholeOpen = new Set<string>();
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
      fetch: (async (
        url: string,
        init?: { method?: string; body?: string },
      ) => {
        const tail = url.split("?")[0].split("/").pop()!;
        calls.push({
          tail,
          method: init?.method ?? "GET",
          body: init?.body ? JSON.parse(init.body) : undefined,
        });
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
      readLocalWhole: async (
        _vaultId: string,
        kind: "map" | "canvas",
        ids: readonly string[] | null,
      ) =>
        Object.fromEntries(
          [...wholeLocal[kind]]
            .filter(([id]) => !ids || ids.includes(id))
            .map(([id, item]) => [id, structuredClone(item)]),
        ),
      applyWhole: async (
        _vaultId: string,
        kind: "map" | "canvas",
        changes: any,
        download: (assetId: string) => Promise<Uint8Array | null>,
      ) => {
        wholeApplied.push({ kind, changes });
        const hashes: Record<string, string> = {};
        const failed: string[] = [];
        for (const { copy } of changes.copies)
          wholeLocal[kind].set(copy.id, copy);
        for (const { item, assets } of changes.writes) {
          for (const asset of assets ?? []) {
            wholeDownloads.push(asset.assetId);
            if (await download(asset.assetId)) hashes[asset.assetId] = "h";
            else failed.push(asset.assetId);
          }
          wholeLocal[kind].set(item.id, item);
        }
        for (const id of changes.deletes) wholeLocal[kind].delete(id);
        return { hashes, failed };
      },
      isWholeOpen: (kind: string, id: string) => wholeOpen.has(`${kind}:${id}`),
      ...(remoteOverrides as Partial<CloudBackupRemoteDeps> | undefined),
      isEditing: (id: string) => editing.has(id),
      onEditingReleased: (listener: () => void) => {
        released.add(listener);
        return () => released.delete(listener);
      },
      newId: () => `copy-${++copies}`,
      newWholeId: () => `00000000-0000-4000-8000-00000000000${++copies}`,
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
    wholeLocal,
    wholeApplied,
    wholeDownloads,
    wholeOpen,
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

  it("sends a map push even once another device has committed", async () => {
    const h = await setup(
      {},
      { foreignCommitSeen: true },
      {
        buildDelta: async () => ({
          vaultTitle: "T",
          upserts: [],
          deletes: [],
          assetIds: [],
          mapUpserts: [{ item: { id: "m" }, assets: [] }],
        }),
      },
    );
    await h.start();

    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(1);
    expect(h.calls.find((c) => c.tail === "delta")?.body.mapUpserts).toEqual([
      { item: { id: "m" }, assets: [] },
    ]);
    expect(h.count("commit")).toBe(0);
    expect(h.store.autoState).not.toBe("conflict");
  });

  it("still pauses a full snapshot once another device has committed", async () => {
    const h = await setup(
      {},
      { foreignCommitSeen: true },
      { buildDelta: async () => null },
    );
    await h.start();

    await h.store.recordLocalChange("v-1");
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

describe("delete notices", () => {
  const tomb = (id: string, title: string, deletedBy = "Mara") => ({
    id,
    rev: 2,
    deletedBy,
    deletedAt: "2026-09-01T00:00:00.000Z",
    title,
  });

  it("tells the user about a delete the pull applied", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      { changes: [feed(2, [], [tomb("a", "Old Dock")])] },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old Dock"));
    await h.base.recordSent("v-1", [e("a", "Old Dock")], []);

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.local.has("a")).toBe(false);
    expect(notifyDeletes).toHaveBeenCalledWith("v-1", [
      expect.objectContaining({
        id: "a",
        title: "Old Dock",
        deletedBy: "Mara",
      }),
    ]);
  });

  it("stays quiet for a delete of something this device no longer has", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      { changes: [feed(2, [], [tomb("gone", "Gone")])] },
      {},
      { notifyDeletes },
    );
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(notifyDeletes).not.toHaveBeenCalled();
  });

  it("stays quiet when an open editor holds the delete back", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      { changes: [feed(2, [], [tomb("a", "Old Dock")])] },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old Dock"));
    h.editing.add("a");
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.local.has("a")).toBe(true);
    expect(notifyDeletes).not.toHaveBeenCalled();
  });

  it("stays quiet on a resync", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      {
        changes: [ok({ status: "resync", revision: 5 })],
        bundle: [
          ok({
            manifest: { ...MANIFEST, revision: 5, lastPushedAt: "t5" },
            bundle: { entities: [] },
          }),
        ],
      },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old Dock"));
    await h.base.recordSent("v-1", [e("a", "Old Dock")], []);
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(notifyDeletes).not.toHaveBeenCalled();
  });

  it("keeps an entity edited before the delete arrived, and does not notify", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      { changes: [feed(2, [], [tomb("a", "Old Dock")])] },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old Dock", { content: "edited" }));
    await h.base.recordSent("v-1", [e("a", "Old Dock")], []);
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.local.get("a")?.content).toBe("edited");
    expect(notifyDeletes).not.toHaveBeenCalled();
  });

  it("keeps a restored entity (no merge base) when a stale pull carries its tombstone", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      { changes: [feed(2, [], [tomb("a", "Old Dock")])] },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old Dock"));
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.local.has("a")).toBe(true);
    expect(notifyDeletes).not.toHaveBeenCalled();
  });

  it("keeps a member's unsynced edits through an owner rollback", async () => {
    const notifyDeletes = vi.fn();
    const h = await setup(
      {
        // The rollback's feed: one entity back at the point's title, and one
        // the point did not have, now a tombstone.
        changes: [
          feed(4, [e("a", "Rolled back")], [tomb("d", "Newer entity")]),
        ],
      },
      {},
      { notifyDeletes },
    );
    h.local.set("a", e("a", "Old title", { content: "my edit" }));
    await h.base.recordSent("v-1", [e("a", "Old title")], []);
    h.local.set("d", e("d", "Newer entity", { content: "my edit" }));
    await h.base.recordSent("v-1", [e("d", "Newer entity")], []);
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    // Their title lands, my edit to another field stays.
    expect(h.local.get("a")).toMatchObject({
      title: "Rolled back",
      content: "my edit",
    });
    // An edited entity survives the tombstone and is not announced as deleted.
    expect(h.local.get("d")?.content).toBe("my edit");
    expect(notifyDeletes).not.toHaveBeenCalled();
  });
});

describe("maps and canvases as whole items", () => {
  const MAP_ID = "11111111-1111-4111-8111-111111111111";
  const asset = (path: string, assetId: string) => ({
    path,
    assetId,
    mimeType: "image/png",
  });
  const map = (over: Record<string, unknown> = {}): Entity => ({
    id: MAP_ID,
    title: "",
    name: "Atlas",
    assetPath: "maps/a.webp",
    pins: [],
    ...over,
  });
  const wholeFeed = (
    revision: number,
    maps: { item: Entity; assets?: unknown[] }[],
    tombstones: unknown[] = [],
    canvases: { item: Entity }[] = [],
  ) =>
    ok({
      status: "changes",
      revision,
      entities: [],
      maps: maps.map(({ item, assets }) => ({
        item,
        ...(assets ? { meta: { rev: revision, assets } } : {}),
      })),
      canvases,
      tombstones,
    });
  const mapTomb = (id: string, kind = "map") => ({
    id,
    rev: 2,
    deletedBy: "Mara",
    deletedAt: "2026-09-01T00:00:00.000Z",
    title: "Atlas",
    kind,
  });
  const pull = async (h: Awaited<ReturnType<typeof setup>>) => {
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
  };

  it("creates a map another member added and keeps it as the base", async () => {
    const h = await setup({ changes: [wholeFeed(2, [{ item: map() }])] });
    await pull(h);
    expect(h.wholeLocal.map.get(MAP_ID)).toMatchObject({ name: "Atlas" });
    expect(await h.base.getWhole("v-1", "map", MAP_ID)).toMatchObject({
      name: "Atlas",
    });
    expect(h.store.mergeNotice).toEqual({ merged: 1, copies: [] });
    expect((await h.record())?.revision).toBe(2);
  });

  it("updates a map that only they changed", async () => {
    const h = await setup({
      changes: [wholeFeed(2, [{ item: map({ pins: ["p"] }) }])],
    });
    h.wholeLocal.map.set(MAP_ID, map());
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    await pull(h);
    expect(h.wholeLocal.map.get(MAP_ID)?.pins).toEqual(["p"]);
  });

  it("keeps theirs and a named copy when both changed the same map", async () => {
    const h = await setup(
      { changes: [wholeFeed(2, [{ item: map({ pins: ["theirs"] }) }])] },
      {},
      { displayName: () => "Zed" },
    );
    h.wholeLocal.map.set(MAP_ID, map({ pins: ["mine"] }));
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    await pull(h);

    expect(h.wholeLocal.map.get(MAP_ID)?.pins).toEqual(["theirs"]);
    const copy = [...h.wholeLocal.map.values()].find((m) => m.id !== MAP_ID)!;
    expect(copy.id).toMatch(/^0{8}-0000-4000-8000-/);
    expect(copy.pins).toEqual(["mine"]);
    expect(copy.name).toMatch(/^Atlas \(.+'s version\)$/);
    expect(h.store.mergeNotice).toEqual({ merged: 1, copies: ["Atlas"] });
  });

  it("treats a fog edit as a local change that clashes with theirs", async () => {
    const h = await setup({
      changes: [wholeFeed(2, [{ item: map({ pins: ["theirs"] }) }])],
    });
    h.wholeLocal.map.set(MAP_ID, map());
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    await h.dirty.record("v-1", { kind: "maps", ids: [MAP_ID] });
    await pull(h);
    expect(h.wholeApplied[0].changes.copies).toHaveLength(1);
    expect(h.wholeLocal.map.get(MAP_ID)?.pins).toEqual(["theirs"]);
  });

  it("downloads a received map's files by the ids its commit recorded", async () => {
    const assets = [
      asset("maps/a.webp", "maps_a.webp--aaaa"),
      asset("maps/m_mask.png", "maps_m_mask.png--bbbb"),
    ];
    const h = await setup({
      changes: [wholeFeed(2, [{ item: map(), assets }])],
    });
    await pull(h);
    expect(h.wholeDownloads).toEqual([
      "maps_a.webp--aaaa",
      "maps_m_mask.png--bbbb",
    ]);
  });

  it("still applies a map when a file cannot be downloaded", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const assets = [asset("maps/a.webp", "maps_a.webp--aaaa")];
    const h = await setup(
      { changes: [wholeFeed(2, [{ item: map(), assets }])] },
      {},
      {
        remote: {
          applyWhole: async () => ({
            hashes: {},
            failed: ["maps_a.webp--aaaa"],
          }),
        },
      },
    );
    await pull(h);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("map files"), [
      "maps_a.webp--aaaa",
    ]);
    expect((await h.record())?.revision).toBe(2);
    warn.mockRestore();
  });

  it("removes an unchanged map and canvas a tombstone names, with the delete notice", async () => {
    const notifyDeletes = vi.fn();
    const canvas = { id: "c1", title: "", name: "Plot" };
    const h = await setup(
      {
        changes: [wholeFeed(2, [], [mapTomb(MAP_ID), mapTomb("c1", "canvas")])],
      },
      {},
      { notifyDeletes },
    );
    h.wholeLocal.map.set(MAP_ID, map());
    h.wholeLocal.canvas.set("c1", canvas);
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    await h.base.recordSentWhole("v-1", "canvas", [canvas], []);
    await pull(h);
    expect(h.wholeLocal.map.size).toBe(0);
    expect(h.wholeLocal.canvas.size).toBe(0);
    expect(await h.base.getWhole("v-1", "map", MAP_ID)).toBeUndefined();
    expect(notifyDeletes).toHaveBeenCalledTimes(2);
    expect(h.local.size).toBe(0);
  });

  it("keeps a map edited before the delete arrived", async () => {
    const h = await setup({ changes: [wholeFeed(2, [], [mapTomb(MAP_ID)])] });
    h.wholeLocal.map.set(MAP_ID, map({ pins: ["mine"] }));
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    await pull(h);
    expect(h.wholeLocal.map.has(MAP_ID)).toBe(true);
  });

  it("holds a map that is open and does not advance the revision", async () => {
    const h = await setup({
      changes: [wholeFeed(2, [{ item: map({ pins: ["theirs"] }) }])],
    });
    h.wholeLocal.map.set(MAP_ID, map());
    await h.base.recordSentWhole("v-1", "map", [map()], []);
    h.wholeOpen.add(`map:${MAP_ID}`);
    await pull(h);
    expect(h.wholeLocal.map.get(MAP_ID)?.pins).toEqual([]);
    expect(h.wholeApplied).toEqual([]);
    expect((await h.record())?.revision).toBe(1);
  });

  it("takes maps from the bundle on a resync, with their files from the manifest", async () => {
    const h = await setup({
      changes: [ok({ status: "resync", revision: 5 })],
      bundle: [
        ok({
          manifest: { ...MANIFEST, revision: 5, lastPushedAt: "t5" },
          bundle: {
            entities: [],
            maps: [map()],
            canvases: [],
            assetManifest: [
              asset("maps/a.webp", "maps_a.webp--aaaa"),
              asset("images/other.png", "images_other.png"),
            ],
          },
        }),
      ],
    });
    await pull(h);
    expect(h.wholeLocal.map.has(MAP_ID)).toBe(true);
    expect(h.wholeDownloads).toEqual(["maps_a.webp--aaaa"]);
    expect(await h.base.getWhole("v-1", "map", MAP_ID)).toBeTruthy();
  });

  it("pulls, merges and retries a map push that another device beat", async () => {
    const h = await setup(
      {
        delta: [DIVERGED],
        changes: [
          NO_CHANGES,
          wholeFeed(2, [{ item: map({ name: "Theirs" }) }]),
        ],
      },
      {},
      {
        buildDelta: async () => ({
          vaultTitle: "T",
          upserts: [],
          deletes: [],
          assetIds: [],
          mapUpserts: [{ item: { id: "other" }, assets: [] }],
        }),
      },
    );
    await h.start();
    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(2);
    expect(h.wholeLocal.map.get(MAP_ID)?.name).toBe("Theirs");
    expect(h.store.autoState).toBe("saved");
    expect(await h.dirty.snapshot("v-1")).toEqual([]);
  });

  it("records the maps and canvases a push sent as their bases", async () => {
    const h = await setup(
      {},
      {},
      {
        buildDelta: async () => ({
          vaultTitle: "T",
          upserts: [],
          deletes: [],
          assetIds: [],
          mapUpserts: [{ item: { id: "m", name: "Atlas" }, assets: [] }],
          canvasUpserts: [{ item: { id: "c", name: "Plot" } }],
          canvasDeletes: ["gone"],
        }),
      },
    );
    await h.start();
    await h.base.recordSentWhole(
      "v-1",
      "canvas",
      [{ id: "gone", name: "G" }],
      [],
    );
    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);
    expect(await h.base.getWhole("v-1", "map", "m")).toEqual({
      id: "m",
      name: "Atlas",
    });
    expect(await h.base.getWhole("v-1", "canvas", "c")).toBeTruthy();
    expect(await h.base.getWhole("v-1", "canvas", "gone")).toBeUndefined();
  });

  it("sends nothing when every map matches its base, and clears the row", async () => {
    const h = await setup(
      {},
      {},
      {
        buildDelta: async () => ({
          vaultTitle: "T",
          upserts: [],
          deletes: [],
          assetIds: [],
        }),
      },
    );
    await h.start();
    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);
    expect(h.count("delta")).toBe(0);
    expect(await h.dirty.snapshot("v-1")).toEqual([]);
    expect(h.store.autoState).toBe("saved");
  });
});
