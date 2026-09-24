/**
 * End-to-end round trip (#3354, SC-013): the real client package against the
 * real worker handlers (hosted here because neither the worker nor the
 * package zone may import the other) over an in-memory R2 bucket. A backup built from a full
 * upload followed by deltas must restore to exactly the local vault.
 */
import { describe, expect, it } from "vitest";
import {
  createMemoryStorage,
  enableCloudBackup,
  getLocalCloudBackupRecord,
  pushDeltaToCloudBackup,
  pushVaultToCloudBackup,
  restoreVaultFromCloudBackup,
  type CloudBackupRuntime,
} from "@codex/cloud-backup-sync";
import {
  handleCloudBackupDelta,
  handleCommitCloudBackup,
  handleEnableCloudBackup,
  handleGetCloudBackupBundle,
  handleGetCloudBackupStatus,
  type CloudBackupEnv,
} from "../../../../workers/oracle-proxy/src/cloud-backup";
import { Bucket } from "../../../../workers/oracle-proxy/src/__tests__/r2-memory-bucket";

/** Routes the client's requests straight to the worker handlers. */
function runtimeFor(env: CloudBackupEnv): CloudBackupRuntime {
  return {
    baseUrl: "https://worker.test",
    storage: createMemoryStorage(),
    fetch: (async (url: string, init?: RequestInit) => {
      const request = new Request(url, init);
      const parts = new URL(url).pathname.split("/").filter(Boolean);
      const [, , backupId, action] = parts;
      if (backupId === "enable") return handleEnableCloudBackup(request, env);
      if (action === "commit")
        return handleCommitCloudBackup(request, env, backupId);
      if (action === "delta")
        return handleCloudBackupDelta(request, env, backupId);
      if (action === "bundle")
        return handleGetCloudBackupBundle(request, env, backupId);
      if (action === "status")
        return handleGetCloudBackupStatus(request, env, backupId);
      return new Response("Not found", { status: 404 });
    }) as never,
  };
}

type Entity = { id: string; title: string; content: string };

const payloadOf = (entities: Record<string, Entity>) => ({
  vaultTitle: "Round Trip",
  bundle: { schemaVersion: 1, entities: Object.values(entities), maps: [] },
});

const byId = (entities: Entity[]) =>
  [...entities].sort((a, b) => a.id.localeCompare(b.id));

describe("incremental backup round trip (#3354)", () => {
  it("restores exactly the local vault after a full upload and deltas", async () => {
    const env = { BUCKET: new Bucket() } as CloudBackupEnv;
    const runtime = runtimeFor(env);

    const local: Record<string, Entity> = {};
    for (let i = 0; i < 150; i++) {
      local[`e${i}`] = {
        id: `e${i}`,
        title: `Entity ${i}`,
        content: `v1 ${i}`,
      };
    }

    expect((await enableCloudBackup(runtime, "v", payloadOf(local))).ok).toBe(
      true,
    );
    expect(
      (await pushVaultToCloudBackup(runtime, "v", payloadOf(local))).ok,
    ).toBe(true);

    // Delta 1: edit two, delete one, add one.
    local.e3 = { ...local.e3, content: "edited" };
    local.e77 = { ...local.e77, title: "Renamed" };
    delete local.e10;
    local.fresh = { id: "fresh", title: "New", content: "hello" };
    let base = (await getLocalCloudBackupRecord(runtime, "v"))!.lastPushedAt!;
    const first = await pushDeltaToCloudBackup(
      runtime,
      "v",
      {
        vaultTitle: "Round Trip",
        upserts: [local.e3, local.e77, local.fresh],
        deletes: ["e10"],
      },
      base,
    );
    expect(first.ok).toBe(true);

    // Delta 2: re-edit one already sent, delete the one just added.
    local.e3 = { ...local.e3, content: "edited again" };
    delete local.fresh;
    base = (await getLocalCloudBackupRecord(runtime, "v"))!.lastPushedAt!;
    const second = await pushDeltaToCloudBackup(
      runtime,
      "v",
      { vaultTitle: "Round Trip", upserts: [local.e3], deletes: ["fresh"] },
      base,
    );
    expect(second.ok).toBe(true);

    const record = (await getLocalCloudBackupRecord(runtime, "v"))!;
    const restored = await restoreVaultFromCloudBackup(runtime, record);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    const bundle = restored.value.bundle as { entities: Entity[]; maps: [] };
    expect(byId(bundle.entities)).toEqual(byId(Object.values(local)));
    expect(bundle.maps).toEqual([]);
  });

  it("refuses a delta built on a stale base, leaving the backup intact", async () => {
    const env = { BUCKET: new Bucket() } as CloudBackupEnv;
    const runtime = runtimeFor(env);
    const local = { a: { id: "a", title: "A", content: "one" } };
    await enableCloudBackup(runtime, "v", payloadOf(local));
    await pushVaultToCloudBackup(runtime, "v", payloadOf(local));

    const stale = await pushDeltaToCloudBackup(
      runtime,
      "v",
      { vaultTitle: "Round Trip", upserts: [], deletes: ["a"] },
      "1999-01-01T00:00:00.000Z",
    );
    expect(stale).toMatchObject({ ok: false, conflict: true });

    const record = (await getLocalCloudBackupRecord(runtime, "v"))!;
    const restored = await restoreVaultFromCloudBackup(runtime, record);
    expect(restored.ok && (restored.value.bundle as any).entities).toEqual([
      local.a,
    ]);
  });
});
