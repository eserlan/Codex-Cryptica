import { describe, expect, it, vi } from "vitest";
import {
  createMemoryStorage,
  getLocalCloudBackupRecord,
} from "@codex/cloud-backup-sync";
import { SharedVaultJoin, type SharedVaultJoinDeps } from "./shared-vault-join";
import { SharedVaultIdentity } from "./shared-vault-identity";
import { CloudBackupBaseStore, memoryBaseStorage } from "./cloud-backup-base";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";
import {
  JOIN_FAILED_MESSAGE,
  JOIN_IMPORT_FAILED_MESSAGE,
  JOIN_NETWORK_MESSAGE,
  LINK_GONE_MESSAGE,
} from "./shared-vault-messages";

type Reply = { ok: boolean; status: number; body: unknown };

const BACKUP = "11111111-1111-1111-1111-111111111111";
const TOKEN = "ab".repeat(32);
const NEW_TOKEN = "cd".repeat(32);
const LINK = { backupId: BACKUP, editorToken: TOKEN };
const MANIFEST = {
  schemaVersion: 1,
  backupId: BACKUP,
  vaultTitle: "The Saltmere Fens",
  sizeBytes: 10,
  createdAt: "2026-08-31T10:00:00.000Z",
  lastPushedAt: "2026-08-31T10:00:00.000Z",
  revision: 7,
};
const BUNDLE: Reply = {
  ok: true,
  status: 200,
  body: {
    manifest: MANIFEST,
    bundle: {
      entities: [{ id: "a", title: "A" }],
      assetManifest: [
        { assetId: "img-1", path: "images/a.png", mimeType: "image/png" },
      ],
    },
  },
};

function memoryLocalStorage() {
  const items = new Map<string, string>();
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key: string) => items.delete(key),
  };
}

function harness(routes: Record<string, Reply | Error> = {}) {
  const calls: { tail: string; headers: Record<string, string> }[] = [];
  const vaults = new Set<string>(["existing"]);
  const created: string[] = [];
  const deleted: string[] = [];
  const switched: string[] = [];
  const hydrated: string[] = [];
  const storage = createMemoryStorage();
  const local = memoryLocalStorage();
  const identity = new SharedVaultIdentity(local, () => "device-12345678");
  const base = new CloudBackupBaseStore(memoryBaseStorage());
  const dirty = new CloudBackupDirtyStore(memoryDirtyStorage());
  const failImport = { on: false };
  const deps: SharedVaultJoinDeps = {
    runtime: {
      baseUrl: "https://worker.test",
      storage,
      deviceId: () => identity.deviceId(),
      now: () => new Date("2026-09-01T00:00:00.000Z"),
      fetch: (async (
        url: string,
        init?: { headers: Record<string, string> },
      ) => {
        const tail = url.split("/").pop()!;
        calls.push({ tail, headers: init?.headers ?? {} });
        const next = routes[tail] ?? { ok: true, status: 200, body: {} };
        if (next instanceof Error) throw next;
        return {
          ok: next.ok,
          status: next.status,
          json: async () => next.body,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        };
      }) as never,
    },
    restore: {
      createVault: vi.fn(async () => {
        const id = `new-${created.length + 1}`;
        created.push(id);
        vaults.add(id);
        return id;
      }),
      importEntities: vi.fn(async () => {
        if (failImport.on) throw new Error("disk full");
      }),
      importAsset: vi.fn(async () => {}),
    },
    vaultExists: async (id) => vaults.has(id),
    deleteVault: async (id) => {
      deleted.push(id);
      vaults.delete(id);
    },
    switchVault: async (id) => {
      switched.push(id);
    },
    base,
    dirty,
    storage: local,
    identity,
    hydrate: async (id) => {
      hydrated.push(id);
    },
    now: () => new Date("2026-09-01T00:00:00.000Z"),
  };
  return {
    join: new SharedVaultJoin(deps),
    deps,
    calls,
    vaults,
    created,
    deleted,
    switched,
    hydrated,
    storage,
    local,
    base,
    dirty,
    failImport,
  };
}

const tails = (h: ReturnType<typeof harness>) => h.calls.map((c) => c.tail);

describe("joining a shared vault", () => {
  it("creates one linked vault with the shared content and uploads nothing", async () => {
    const h = harness({ bundle: BUNDLE });
    const out = await h.join.join(LINK, "  Zed ");

    expect(out).toMatchObject({
      kind: "joined",
      vaultId: "new-1",
      message: "You joined The Saltmere Fens as Zed.",
    });
    expect(h.created).toEqual(["new-1"]);
    expect(h.deps.restore.importEntities).toHaveBeenCalledTimes(1);
    expect(await getLocalCloudBackupRecord(h.deps.runtime, "new-1")).toEqual({
      vaultId: "new-1",
      backupId: BACKUP,
      ownerCode: TOKEN,
      role: "editor",
      enabled: true,
      status: "idle",
      lastPushedAt: MANIFEST.lastPushedAt,
      consentedAt: "2026-09-01T00:00:00.000Z",
      vaultTitle: "The Saltmere Fens",
      revision: 7,
    });
    expect(await h.base.get("new-1", "a")).toEqual({ id: "a", title: "A" });
    expect(await h.dirty.snapshot("new-1")).toEqual([]);
    expect(
      JSON.parse(h.local.items.get("codex.cloud-backup-hashes.new-1")!),
    ).toHaveProperty("img-1");
    expect(h.hydrated).toEqual(["new-1"]);
    expect(tails(h)).not.toContain("delta");
    expect(tails(h)).not.toContain("commit");
    expect(h.deps.identity.displayName()).toBe("Zed");
    for (const call of h.calls) {
      expect(call.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(call.headers["X-Codex-Device-Id"]).toBe("device-12345678");
    }
  });

  it("says how many images could not be copied", async () => {
    const h = harness({
      bundle: BUNDLE,
      "img-1": { ok: false, status: 404, body: null },
    });
    const out = await h.join.join(LINK, "Zed");
    expect(out).toMatchObject({
      kind: "joined",
      message:
        "You joined The Saltmere Fens as Zed. 1 image could not be copied.",
    });
  });

  it("joining twice re-links the same vault without a second download", async () => {
    const h = harness({
      bundle: BUNDLE,
      status: { ok: true, status: 200, body: {} },
    });
    await h.join.join(LINK, "Zed");
    await h.base.recordSent("new-1", [{ id: "kept", title: "Kept" }], []);
    await h.dirty.record("new-1", { kind: "entity", ids: ["kept"] });
    await h.deps.runtime.storage.write("new-1", {
      ...(await getLocalCloudBackupRecord(h.deps.runtime, "new-1")),
      linkGone: true,
    });
    h.calls.length = 0;

    const out = await h.join.join(
      { backupId: BACKUP, editorToken: NEW_TOKEN },
      "Zed",
    );

    expect(out).toMatchObject({
      kind: "rejoined",
      vaultId: "new-1",
      message: "You rejoined The Saltmere Fens as Zed.",
    });
    expect(h.created).toEqual(["new-1"]);
    expect(tails(h)).toEqual(["status"]);
    const record = await getLocalCloudBackupRecord(h.deps.runtime, "new-1");
    expect(record).toMatchObject({
      ownerCode: NEW_TOKEN,
      role: "editor",
      enabled: true,
      status: "idle",
      revision: 7,
      lastPushedAt: MANIFEST.lastPushedAt,
    });
    expect(record).not.toHaveProperty("linkGone");
    expect(await h.base.get("new-1", "kept")).toBeDefined();
    expect((await h.dirty.snapshot("new-1")).length).toBe(1);
    expect(h.switched).toEqual(["new-1"]);
    expect(h.hydrated).toEqual(["new-1", "new-1"]);
  });

  it("ignores an editor record whose vault is gone and joins as new", async () => {
    const h = harness({ bundle: BUNDLE });
    await h.deps.runtime.storage.write("lost", {
      vaultId: "lost",
      backupId: BACKUP,
      ownerCode: "old",
      role: "editor",
      enabled: true,
      status: "idle",
      lastPushedAt: null,
      consentedAt: "x",
    });
    const out = await h.join.join(LINK, "Zed");
    expect(out.kind).toBe("joined");
    expect(tails(h)).toContain("bundle");
    expect(
      await getLocalCloudBackupRecord(h.deps.runtime, "lost"),
    ).toMatchObject({ ownerCode: "old" });
  });

  it("makes no request for a backup this device owns", async () => {
    const h = harness({ bundle: BUNDLE });
    await h.deps.runtime.storage.write("existing", {
      vaultId: "existing",
      backupId: BACKUP,
      ownerCode: "owner-code",
      enabled: true,
      status: "idle",
      lastPushedAt: null,
      consentedAt: "x",
    });
    const out = await h.join.join(LINK, "Zed");

    expect(out).toEqual({ kind: "owned", vaultId: "existing" });
    expect(h.calls).toEqual([]);
    expect(h.created).toEqual([]);
    expect(
      await getLocalCloudBackupRecord(h.deps.runtime, "existing"),
    ).toMatchObject({ ownerCode: "owner-code" });
  });
});

describe("join failures leave nothing behind", () => {
  async function expectNothing(h: ReturnType<typeof harness>) {
    expect(h.created).toEqual([]);
    expect(await h.deps.runtime.storage.list!()).toEqual([]);
    expect(await h.base.list("new-1")).toEqual([]);
    expect(h.hydrated).toEqual([]);
  }

  it("shows the link message for a 404", async () => {
    const h = harness({ bundle: { ok: false, status: 404, body: null } });
    expect(await h.join.join(LINK, "Zed")).toEqual({
      kind: "failed",
      message: LINK_GONE_MESSAGE,
    });
    await expectNothing(h);
  });

  it("shows the server's message for a full device list", async () => {
    const message =
      "This shared vault already has the most devices it allows. Ask the owner to replace the link.";
    const h = harness({
      bundle: {
        ok: false,
        status: 403,
        body: { error: { code: "device_limit", message } },
      },
    });
    expect(await h.join.join(LINK, "Zed")).toEqual({ kind: "failed", message });
    await expectNothing(h);
  });

  it("shows the server's message for a missing device id", async () => {
    const message = "A device id is required.";
    const h = harness({
      bundle: {
        ok: false,
        status: 400,
        body: { error: { code: "device_id_required", message } },
      },
    });
    expect(await h.join.join(LINK, "Zed")).toEqual({ kind: "failed", message });
  });

  it("falls back to a plain message when the server sent none", async () => {
    const h = harness({ bundle: { ok: false, status: 500, body: null } });
    expect(await h.join.join(LINK, "Zed")).toEqual({
      kind: "failed",
      message: JOIN_FAILED_MESSAGE,
    });
  });

  it("shows the connection message when fetch throws", async () => {
    const h = harness({ bundle: new Error("offline") });
    expect(await h.join.join(LINK, "Zed")).toEqual({
      kind: "failed",
      message: JOIN_NETWORK_MESSAGE,
    });
    await expectNothing(h);
  });

  it("deletes the new vault when the import fails after it was created", async () => {
    const h = harness({ bundle: BUNDLE });
    h.failImport.on = true;
    expect(await h.join.join(LINK, "Zed")).toEqual({
      kind: "failed",
      message: JOIN_IMPORT_FAILED_MESSAGE,
    });
    expect(h.created).toEqual(["new-1"]);
    expect(h.deleted).toEqual(["new-1"]);
    expect(h.vaults.has("new-1")).toBe(false);
    expect(await h.deps.runtime.storage.list!()).toEqual([]);
    expect(h.hydrated).toEqual([]);
  });

  it("a failed rejoin changes nothing", async () => {
    const h = harness({ bundle: BUNDLE });
    await h.join.join(LINK, "Zed");
    const before = await getLocalCloudBackupRecord(h.deps.runtime, "new-1");
    const failing = new SharedVaultJoin({
      ...h.deps,
      runtime: {
        ...h.deps.runtime,
        fetch: (async () => ({
          ok: false,
          status: 404,
          json: async () => null,
          arrayBuffer: async () => new ArrayBuffer(0),
        })) as never,
      },
    });
    expect(
      await failing.join({ backupId: BACKUP, editorToken: NEW_TOKEN }, "Zed"),
    ).toEqual({ kind: "failed", message: LINK_GONE_MESSAGE });
    expect(await getLocalCloudBackupRecord(h.deps.runtime, "new-1")).toEqual(
      before,
    );
  });
});
