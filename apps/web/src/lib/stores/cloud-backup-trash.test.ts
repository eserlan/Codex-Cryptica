import { describe, expect, it, vi } from "vitest";
import { CloudBackupStore } from "./cloud-backup.svelte";
import { createMemoryStorage } from "@codex/cloud-backup-sync";
import { CloudBackupBaseStore, memoryBaseStorage } from "./cloud-backup-base";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";

type Entity = { id: string; title: string; [key: string]: unknown };
type Reply = { ok: boolean; status: number; body: unknown };

const ok = (body: unknown): Reply => ({ ok: true, status: 200, body });
const GONE: Reply = { ok: false, status: 410, body: null };
const tomb = (id: string) => ({
  id,
  rev: 2,
  deletedBy: "Mara",
  deletedAt: "2026-09-01T00:00:00.000Z",
  title: id,
});
const kept = (entity: Entity) => ok({ tombstone: tomb(entity.id), entity });
const item = (id: string) => ({
  id,
  title: id,
  deletedBy: "Mara",
  deletedAt: "2026-09-01T00:00:00.000Z",
  restorable: true,
});

async function setup(
  routes: Record<string, Reply[]>,
  local = new Map<string, Entity>(),
) {
  const storage = createMemoryStorage();
  await storage.write("v-1", {
    vaultId: "v-1",
    backupId: "b-1",
    ownerCode: "code-1",
    role: "editor",
    enabled: true,
    status: "idle",
    lastPushedAt: "t0",
    consentedAt: "2026-08-31T10:00:00.000Z",
  });
  const base = new CloudBackupBaseStore(memoryBaseStorage());
  const dirty = new CloudBackupDirtyStore(memoryDirtyStorage());
  const applied: unknown[] = [];
  const whole = {
    map: new Map<string, unknown>(),
    canvas: new Map<string, unknown>(),
  };
  const wholeApplied: { kind: string; changes: any }[] = [];
  const store = new CloudBackupStore();
  let activeVaultId = "v-1";
  store.configure({
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      deviceId: () => "device-12345678",
      fetch: (async (url: string) => {
        const path = decodeURIComponent(url.split("/api/cloud-backup/b-1/")[1]);
        const reply = routes[path]?.shift() ?? ok({ revision: 1, items: [] });
        return {
          ok: reply.ok,
          status: reply.status,
          json: async () => reply.body,
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }) as never,
    },
    activeVaultId: () => activeVaultId,
    dirty,
    base,
    remote: {
      readLocal: async (_id: string, ids: readonly string[] | null) =>
        Object.fromEntries(
          [...local].filter(([id]) => !ids || ids.includes(id)),
        ),
      apply: async (_id: string, { creates }: { creates: Entity[] }) => {
        applied.push(...creates);
        for (const entity of creates) local.set(entity.id, entity);
      },
      ensureAssets: vi.fn(async () => ({})),
      readLocalWhole: async (
        _id: string,
        kind: "map" | "canvas",
        ids: readonly string[] | null,
      ) =>
        Object.fromEntries(
          [...whole[kind]].filter(([id]) => !ids || ids.includes(id)),
        ),
      applyWhole: async (_id: string, kind: "map" | "canvas", changes: any) => {
        wholeApplied.push({ kind, changes });
        for (const { item } of changes.writes) whole[kind].set(item.id, item);
        return { hashes: {}, failed: [] };
      },
      isWholeOpen: () => false,
      isEditing: () => false,
      onEditingReleased: () => () => {},
      newId: () => "copy",
      newWholeId: () => "copy",
    },
  } as never);
  return {
    store,
    base,
    dirty,
    local,
    applied,
    whole,
    wholeApplied,
    setActiveVaultId: (vaultId: string) => (activeVaultId = vaultId),
  };
}

describe("CloudBackupTrash", () => {
  it("loads the list and reports the states", async () => {
    const h = await setup({
      trash: [
        ok({ revision: 2, items: [item("a")] }),
        { ok: false, status: 404, body: null },
        { ok: false, status: 500, body: null },
      ],
    });
    await h.store.trash.load("v-1");
    expect(h.store.trash.loadState).toBe("ready");
    expect(h.store.trash.items.map((i) => i.id)).toEqual(["a"]);
    await h.store.trash.load("v-1");
    expect(h.store.trash.loadState).toBe("unsupported");
    await h.store.trash.load("v-1");
    expect(h.store.trash.loadState).toBe("failed");
  });

  it("clears the previous vault's trash as soon as another vault loads", async () => {
    const h = await setup({
      trash: [ok({ revision: 2, items: [item("private-from-v-1")] })],
    });
    await h.store.trash.load("v-1");
    expect(h.store.trash.items.map((entry) => entry.id)).toEqual([
      "private-from-v-1",
    ]);

    h.setActiveVaultId("v-2");
    const loading = h.store.trash.load("v-2");

    expect(h.store.trash.loadState).toBe("loading");
    expect(h.store.trash.items).toEqual([]);
    expect(h.store.trash.loadedVaultId).toBeNull();
    await loading;
    expect(h.store.trash.items).toEqual([]);
  });

  it("restores an entity with its connections, drops its base and records it dirty", async () => {
    const a = { id: "a", title: "A", connections: [{ target: "b" }] };
    const h = await setup({ "trash/a": [kept(a)] });
    await h.base.recordSent("v-1", [a], []);

    expect(await h.store.trash.restore("v-1", ["a"])).toBe(1);

    expect(h.local.get("a")).toEqual(a);
    expect(await h.base.get("v-1", "a")).toBeUndefined();
    expect(h.store.trash.restoring.size).toBe(0);
    expect(h.store.trash.result).toEqual({
      outcome: "restored",
      title: "Untitled",
    });
  });

  it("restores a map with the files its trash content kept, and records it for the next push", async () => {
    const map = { id: "m", name: "Atlas", assetPath: "maps/m.webp" };
    const assets = [
      {
        path: "maps/m.webp",
        assetId: "maps_m.webp--aa",
        mimeType: "image/webp",
      },
    ];
    const h = await setup({
      "trash/m": [
        ok({ tombstone: { ...tomb("m"), kind: "map" }, entity: map, assets }),
      ],
    });
    await h.base.recordSentWhole("v-1", "map", [map], []);

    expect(await h.store.trash.restore("v-1", ["m"])).toBe(1);

    expect(h.wholeApplied).toEqual([
      {
        kind: "map",
        changes: { copies: [], writes: [{ item: map, assets }], deletes: [] },
      },
    ]);
    expect(h.whole.map.get("m")).toEqual(map);
    expect(await h.base.getWhole("v-1", "map", "m")).toBeUndefined();
    expect(h.applied).toEqual([]);
    expect(
      (await h.dirty.snapshot("v-1")).map((row) => `${row.kind}:${row.id}`),
    ).toContain("maps:m");
  });

  it("restores a canvas and leaves one that already exists locally alone", async () => {
    const canvas = { id: "c", name: "Plot" };
    const h = await setup({
      "trash/c": [
        ok({ tombstone: { ...tomb("c"), kind: "canvas" }, entity: canvas }),
      ],
      "trash/d": [
        ok({
          tombstone: { ...tomb("d"), kind: "canvas" },
          entity: { id: "d", name: "Old" },
        }),
      ],
    });
    h.whole.canvas.set("d", { id: "d", name: "Newer" });

    expect(await h.store.trash.restore("v-1", ["c", "d"])).toBe(2);

    expect(h.whole.canvas.get("c")).toEqual(canvas);
    expect(h.whole.canvas.get("d")).toEqual({ id: "d", name: "Newer" });
    expect(h.wholeApplied).toHaveLength(1);
    expect(
      (await h.dirty.snapshot("v-1"))
        .map((row) => `${row.kind}:${row.id}`)
        .sort(),
    ).toEqual(["canvas:c", "canvas:d"]);
  });

  it("keeps a restored entity when a later pull carries the same tombstone, and restores the second", async () => {
    const a = { id: "a", title: "A", connections: [{ target: "b" }] };
    const b = { id: "b", title: "B" };
    const h = await setup({
      "trash/a": [kept(a)],
      "trash/b": [kept(b)],
      "changes?since=0": [],
    });
    await h.store.trash.restore("v-1", ["a"]);
    expect(h.local.has("b")).toBe(false);
    await h.store.trash.restore("v-1", ["b"]);
    expect([...h.local.keys()].sort()).toEqual(["a", "b"]);
  });

  it("counts a gone item as not restored and refreshes the list", async () => {
    const h = await setup({
      "trash/a": [GONE],
      trash: [ok({ revision: 3, items: [] })],
    });
    expect(await h.store.trash.restore("v-1", ["a"])).toBe(0);
    expect(h.store.trash.result?.outcome).toBe("gone");
    expect(h.store.trash.loadState).toBe("ready");
    expect(h.local.size).toBe(0);
  });

  it("leaves the vault untouched when the fetch fails", async () => {
    const h = await setup({
      "trash/a": [{ ok: false, status: 500, body: null }],
    });
    expect(await h.store.trash.restore("v-1", ["a"])).toBe(0);
    expect(h.applied).toEqual([]);
    expect(h.store.trash.result?.outcome).toBe("failed");
  });

  it("does not overwrite an entity that already exists locally", async () => {
    const local = new Map<string, Entity>([["a", { id: "a", title: "Newer" }]]);
    const h = await setup(
      { "trash/a": [kept({ id: "a", title: "Old" })] },
      local,
    );
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["zzz"] });
    await h.dirty.clearVault("v-1");

    expect(await h.store.trash.restore("v-1", ["a"])).toBe(1);

    expect(h.applied).toEqual([]);
    expect(h.local.get("a")?.title).toBe("Newer");
    expect((await h.dirty.snapshot("v-1")).map((row) => row.id)).toEqual(["a"]);
  });

  it("tracks usedBytes and maxBytes and resets them on vault switch or failure", async () => {
    const h = await setup({
      trash: [
        ok({
          revision: 2,
          items: [],
          usedBytes: 1234,
          maxBytes: 52_428_800,
        }),
        { ok: false, status: 500, body: null },
      ],
    });
    await h.store.trash.load("v-1");
    expect(h.store.trash.usedBytes).toBe(1234);
    expect(h.store.trash.maxBytes).toBe(52_428_800);

    h.setActiveVaultId("v-2");
    await h.store.trash.load("v-2");
    expect(h.store.trash.usedBytes).toBeNull();
    expect(h.store.trash.maxBytes).toBeNull();
  });
});
