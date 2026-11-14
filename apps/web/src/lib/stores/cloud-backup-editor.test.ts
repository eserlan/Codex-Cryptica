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
import { LINK_GONE_MESSAGE } from "./shared-vault-messages";

type Reply = { ok: boolean; status: number; body: unknown };
type Entity = { id: string; title: string; [key: string]: unknown };

const TOKEN = "cd".repeat(32);
const DEVICE = "device-12345678";
const MANIFEST = {
  schemaVersion: 1,
  backupId: "b-1",
  vaultTitle: "Shared",
  sizeBytes: 1,
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
const feed = (revision: number, entities: Entity[]) =>
  ok({
    status: "changes",
    revision,
    entities: entities.map((entity) => ({ entity })),
    tombstones: [],
  });
const DIVERGED: Reply = {
  ok: false,
  status: 409,
  body: { error: { code: "diverged", lastPushedAt: "t1" } },
};
const GONE: Reply = {
  ok: false,
  status: 404,
  body: { error: { message: "Backup not found" } },
};
const DEVICE_LIMIT: Reply = {
  ok: false,
  status: 403,
  body: {
    error: {
      code: "device_limit",
      message: "This shared vault already has the most devices it allows.",
    },
  },
};

async function setup(
  routes: Record<string, Reply[]> = {},
  recordOverrides: Record<string, unknown> = {},
  keepIds: string[] = [],
) {
  const calls: {
    tail: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }[] = [];
  const local = new Map<string, Entity>();
  const notices: string[] = [];
  const storage = createMemoryStorage();
  await storage.write("v-1", {
    vaultId: "v-1",
    backupId: "b-1",
    ownerCode: TOKEN,
    role: "editor",
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
    index: ok({ entityHashes: {} }),
    bundle: ok({ manifest: MANIFEST, bundle: { entities: [] } }),
  };
  const store = new CloudBackupStore();
  store.configure({
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      deviceId: () => DEVICE,
      fetch: (async (
        url: string,
        init?: {
          method?: string;
          headers?: Record<string, string>;
          body?: string;
        },
      ) => {
        const tail = url.split("?")[0].split("/").pop()!;
        calls.push({
          tail,
          url,
          method: init?.method ?? "GET",
          headers: init?.headers ?? {},
          body: init?.body,
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
    activeVaultId: () => "v-1",
    dirty,
    base,
    notify: (message: string) => notices.push(message),
    displayName: () => "Zed",
    debounceMs: 20,
    retryMs: 100_000,
    listLocalEntities: () =>
      [...local.values()].map((entity) => ({
        id: entity.id,
        loaded: true,
        entity,
      })),
    // The first rows go; ids in `keepIds` need media the backup lacks.
    buildEditorDelta: async (_vaultId: string, rows: readonly any[]) => {
      const sent = rows.filter(
        (row) => row.kind === "entity" && !keepIds.includes(row.id),
      );
      return {
        delta: sent.length
          ? {
              vaultTitle: "T",
              upserts: sent.map((row) => local.get(row.id)!),
              deletes: [],
              assetIds: [],
            }
          : null,
        sent,
      };
    },
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
        }
        for (const id of deletes) local.delete(id);
      },
      ensureAssets: async () => ({}),
      isEditing: () => false,
      onEditingReleased: () => () => {},
      newId: () => "copy-1",
    },
  } as never);
  const start = async () => {
    await store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    calls.length = 0;
  };
  const count = (tail: string) => calls.filter((c) => c.tail === tail).length;
  const record = () => getLocalCloudBackupRecord({ storage } as never, "v-1");
  return { store, calls, local, notices, dirty, base, start, count, record };
}

const e = (id: string, title: string, over: Record<string, unknown> = {}) =>
  ({ id, title, content: "x", ...over }) as Entity;

beforeEach(() => {
  vi.useFakeTimers();
  onlineState.current = true;
});
afterEach(() => vi.useRealTimers());

describe("a member's shared vault sync", () => {
  it("sends the token only in Authorization, with the device id, on every request", async () => {
    const h = await setup();
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    h.local.set("a", e("a", "A"));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(1);
    expect(h.calls.length).toBeGreaterThan(2);
    for (const call of h.calls) {
      expect(call.url).not.toContain(TOKEN);
      expect(call.body ?? "").not.toContain(TOKEN);
      expect(call.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(call.headers["X-Codex-Device-Id"]).toBe(DEVICE);
    }
  });

  it("exposes the role and never the token", async () => {
    const h = await setup();
    await h.store.hydrate("v-1");
    expect(h.store.role).toBe("editor");
    expect(h.store.ownerCode).toBeNull();
    expect(await h.store.revealRecoveryKey("v-1")).toBeNull();
    expect(h.store.recoveryKey).toBeNull();
  });

  it("keeps maps, canvases and new-image entities local while entities go", async () => {
    const h = await setup({}, {}, ["b"]);
    await h.start();
    h.local.set("a", e("a", "A"));
    h.local.set("b", e("b", "B", { image: "images/new.png" }));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a", "b"] });
    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await h.store.recordLocalChange("v-1", { kind: "canvas", ids: ["c"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(1);
    const sent = JSON.parse(h.calls.find((c) => c.tail === "delta")!.body!);
    expect(sent.upserts.map((u: { id: string }) => u.id)).toEqual(["a"]);
    expect(sent.maps).toBeUndefined();
    expect(sent.canvases).toBeUndefined();
    const left = await h.dirty.snapshot("v-1");
    expect(left.map((row) => `${row.kind}:${row.id}`).sort()).toEqual([
      "canvas:c",
      "entity:b",
      "maps:*",
    ]);
    expect(h.store.keptLocal).toBe(true);
    expect(h.store.autoState).toBe("saved");
    expect(h.store.status).toBe("idle");
    expect(h.count("commit")).toBe(0);
  });

  it("replaces a full row with entity rows and never sends a full snapshot", async () => {
    const h = await setup();
    await h.start();
    h.local.set("a", e("a", "A"));
    await h.dirty.requireFullPush("v-1");
    h.store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("index")).toBe(1);
    expect(h.count("delta")).toBe(1);
    expect(h.count("commit")).toBe(0);
    expect(await h.dirty.snapshot("v-1")).toEqual([]);
  });

  it("keeps the full row when the index cannot be read", async () => {
    const h = await setup({ index: [{ ok: false, status: 500, body: null }] });
    await h.start();
    await h.dirty.requireFullPush("v-1");
    h.store.notifyLocalChange("v-1");
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(0);
    expect(h.count("commit")).toBe(0);
    expect((await h.dirty.snapshot("v-1")).map((row) => row.kind)).toEqual([
      "full",
    ]);
  });

  it("keeps rows local instead of a full push when the worker asks for one", async () => {
    const h = await setup({
      delta: [
        {
          ok: false,
          status: 409,
          body: { error: { code: "full_push_required" } },
        },
      ],
    });
    await h.start();
    h.local.set("a", e("a", "A"));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("commit")).toBe(0);
    expect(h.store.autoState).toBe("saved");
    expect((await h.dirty.snapshot("v-1")).length).toBe(1);
  });

  it("never enters the conflict state and does not pause on a foreign commit", async () => {
    const h = await setup(
      { delta: [DIVERGED, DIVERGED, DIVERGED, DIVERGED] },
      { foreignCommitSeen: true },
    );
    await h.start();
    h.local.set("a", e("a", "A"));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await h.store.recordLocalChange("v-1", { kind: "maps" });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.count("delta")).toBe(4);
    expect(h.store.autoState).toBe("retrying");
    expect(h.store.autoState).not.toBe("conflict");
    expect(h.count("commit")).toBe(0);
  });

  it("names a conflict copy after the member", async () => {
    const h = await setup({
      changes: [feed(2, [e("a", "A", { content: "theirs" })])],
    });
    h.local.set("a", e("a", "A", { content: "mine" }));
    await h.base.recordSent("v-1", [e("a", "A", { content: "base" })], []);
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    const titles = [...h.local.values()].map((entity) => entity.title);
    expect(titles.some((title) => title.includes("Zed's version"))).toBe(true);
    expect(titles.some((title) => title.includes("this device"))).toBe(false);
  });
});

describe("a member whose link stops working", () => {
  it("stops syncing, keeps editing and stays quiet after a reload", async () => {
    const h = await setup({ changes: [GONE] });
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.store.linkGone).toBe(true);
    expect(h.store.syncStopped).toBe(true);
    expect((await h.record())?.linkGone).toBe(true);
    expect(h.notices).toEqual([LINK_GONE_MESSAGE]);

    h.calls.length = 0;
    h.local.set("a", e("a", "A"));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.calls).toEqual([]);
    // The change is still recorded for after a rejoin.
    expect((await h.dirty.snapshot("v-1")).length).toBe(1);

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.calls).toEqual([]);
    expect(h.store.linkGone).toBe(true);
    expect(h.notices.length).toBe(1);
  });

  it("detects a gone link on a delta without a full push", async () => {
    const h = await setup({ delta: [GONE] });
    await h.start();
    h.local.set("a", e("a", "A"));
    await h.store.recordLocalChange("v-1", { kind: "entity", ids: ["a"] });
    await vi.advanceTimersByTimeAsync(200);

    expect(h.store.linkGone).toBe(true);
    expect(h.count("commit")).toBe(0);
    expect(h.store.autoState).toBe("idle");
    expect((await h.dirty.snapshot("v-1")).length).toBe(1);
  });

  it("an owner's 404 on the feed is still not a gone link", async () => {
    const h = await setup({ changes: [GONE] }, { role: "owner" });
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.store.linkGone).toBe(false);
    expect(h.notices).toEqual([]);
  });
});

describe("a member whose device is over the cap", () => {
  it("shows the server message, stops for the session and resumes on hydrate", async () => {
    const h = await setup({ status: [DEVICE_LIMIT] });
    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);

    expect(h.store.errorMessage).toBe(
      "This shared vault already has the most devices it allows.",
    );
    expect(h.store.syncStopped).toBe(true);
    expect(h.store.linkGone).toBe(false);
    expect((await h.record())?.linkGone).toBeUndefined();

    h.calls.length = 0;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.calls).toEqual([]);

    await h.store.hydrate("v-1");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.store.syncStopped).toBe(false);
    expect(h.count("changes")).toBe(1);
  });
});
