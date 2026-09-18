import { describe, expect, it, vi } from "vitest";
import { detectConflict, planAssetUploads, sha256Hex } from "./auto-sync";
import { pushVaultToCloudBackup } from "./cloud-backup-sync";
import { createMemoryStorage, type CloudBackupRuntime } from "./runtime";

const MANIFEST = {
  schemaVersion: 1,
  backupId: "b-1",
  vaultTitle: "The Saltmere Fens",
  sizeBytes: 512,
  createdAt: "2026-08-31T10:00:00.000Z",
  lastPushedAt: "2026-08-31T10:00:00.000Z",
};

const PAYLOAD = { vaultTitle: "The Saltmere Fens", bundle: { entities: [] } };

function makeRuntime(
  responses: { ok: boolean; status: number; body: unknown }[] = [],
) {
  const calls: { url: string; init?: any }[] = [];
  const queue = [...responses];
  const runtime: CloudBackupRuntime = {
    baseUrl: "https://worker.test",
    storage: createMemoryStorage(),
    now: () => new Date("2026-08-31T12:00:00.000Z"),
    fetch: vi.fn(async (url: string, init?: any) => {
      calls.push({ url, init });
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
  };
  return { runtime, calls };
}

async function enabledVault(
  lastPushedAt: string | null = MANIFEST.lastPushedAt,
) {
  const { runtime, calls } = makeRuntime();
  await runtime.storage.write("v-1", {
    vaultId: "v-1",
    backupId: "b-1",
    ownerCode: "code-1",
    enabled: true,
    status: "idle",
    lastPushedAt,
    consentedAt: "2026-08-31T09:00:00.000Z",
    vaultTitle: "The Saltmere Fens",
  });
  calls.length = 0;
  return { runtime, calls };
}

describe("sha256Hex", () => {
  it("hashes the empty input to the known vector", async () => {
    expect(await sha256Hex(new Uint8Array([]))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("planAssetUploads", () => {
  const fakeHash = async (bytes: Uint8Array) => `hash:${bytes[0]}`;
  const assets = [
    { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
    { assetId: "b", bytes: new Uint8Array([2]), mimeType: "image/png" },
  ];

  it("skips unchanged bytes and returns fresh hashes", async () => {
    const plan = await planAssetUploads(assets, { a: "hash:1" }, fakeHash);
    expect(plan.toUpload.map((a) => a.assetId)).toEqual(["b"]);
    expect(plan.skippedIds).toEqual(["a"]);
    expect(plan.hashes).toEqual({ a: "hash:1", b: "hash:2" });
  });

  it("uploads everything when nothing is known", async () => {
    const plan = await planAssetUploads(assets, {}, fakeHash);
    expect(plan.toUpload).toHaveLength(2);
    expect(plan.skippedIds).toEqual([]);
  });
});

describe("detectConflict", () => {
  it("flags a newer remote, clears equal/older/missing stamps", () => {
    expect(
      detectConflict("2026-08-31T10:00:00.000Z", "2026-08-31T11:00:00.000Z"),
    ).toBe(true);
    expect(
      detectConflict("2026-08-31T11:00:00.000Z", "2026-08-31T11:00:00.000Z"),
    ).toBe(false);
    expect(
      detectConflict("2026-08-31T12:00:00.000Z", "2026-08-31T11:00:00.000Z"),
    ).toBe(false);
    expect(detectConflict(null, "2026-08-31T11:00:00.000Z")).toBe(false);
    expect(detectConflict("2026-08-31T11:00:00.000Z", null)).toBe(false);
  });
});

describe("pushVaultToCloudBackup conflict guard (#3189)", () => {
  it("pushes normally when the remote matches our last push", async () => {
    const { runtime, calls } = await enabledVault("2026-08-31T10:00:00.000Z");
    (runtime.fetch as any).mockImplementationOnce(async (url: string) => {
      calls.push({ url });
      return {
        ok: true,
        status: 200,
        json: async () => ({ lastPushedAt: "2026-08-31T10:00:00.000Z" }),
      };
    });
    const result = await pushVaultToCloudBackup(
      runtime,
      "v-1",
      {
        ...PAYLOAD,
        assets: [
          { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
        ],
      },
      undefined,
      { expectLastPushedAt: "2026-08-31T10:00:00.000Z" },
    );
    expect(result.ok).toBe(true);
    // Guard read + asset PUT + commit.
    expect(calls.some((c) => c.url.endsWith("/commit"))).toBe(true);
  });

  it("reports conflict and uploads nothing when remote is newer", async () => {
    const { runtime, calls } = await enabledVault("2026-08-31T10:00:00.000Z");
    // First queued response serves the guard read with a newer stamp.
    (runtime.fetch as any).mockImplementationOnce(async (url: string) => {
      calls.push({ url });
      return {
        ok: true,
        status: 200,
        json: async () => ({ lastPushedAt: "2026-08-31T12:00:00.000Z" }),
      };
    });
    const result = await pushVaultToCloudBackup(
      runtime,
      "v-1",
      {
        ...PAYLOAD,
        assets: [
          { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
        ],
      },
      undefined,
      { expectLastPushedAt: "2026-08-31T10:00:00.000Z" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflict).toBe(true);
    expect(result.remoteLastPushedAt).toBe("2026-08-31T12:00:00.000Z");
    // Only the guard read happened — no asset PUT, no commit.
    expect(calls.filter((c) => c.url.includes("/assets/"))).toHaveLength(0);
    expect(calls.filter((c) => c.url.endsWith("/commit"))).toHaveLength(0);
  });

  it("treats a non-string remote timestamp as missing, pausing instead of mis-comparing", async () => {
    const { runtime, calls } = await enabledVault("2026-08-31T10:00:00.000Z");
    // Server JSON is untrusted: a garbage stamp must degrade to "no
    // timestamp" (divergence pauses) rather than a mis-compared overwrite.
    (runtime.fetch as any).mockImplementationOnce(async (url: string) => {
      calls.push({ url });
      return {
        ok: true,
        status: 200,
        json: async () => ({ lastPushedAt: 12345 }),
      };
    });
    const result = await pushVaultToCloudBackup(
      runtime,
      "v-1",
      {
        ...PAYLOAD,
        assets: [
          { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
        ],
      },
      undefined,
      { expectLastPushedAt: "2026-08-31T10:00:00.000Z" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflict).toBe(true);
    expect(result.remoteLastPushedAt).toBeNull();
    expect(calls.filter((c) => c.url.includes("/assets/"))).toHaveLength(0);
    expect(calls.filter((c) => c.url.endsWith("/commit"))).toHaveLength(0);
  });

  it("skips PUTs for known-unchanged assets but still commits them", async () => {
    const { runtime, calls } = await enabledVault();
    const seen: string[] = [];
    const result = await pushVaultToCloudBackup(
      runtime,
      "v-1",
      {
        ...PAYLOAD,
        assets: [
          { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
        ],
      },
      (progress) => seen.push(`${progress.uploaded}/${progress.total}`),
      { skipAssetUploadIds: ["a"] },
    );
    expect(result.ok).toBe(true);
    expect(calls.filter((c) => c.url.includes("/assets/"))).toHaveLength(0);
    expect(calls.some((c) => c.url.endsWith("/commit"))).toBe(true);
    expect(seen).toEqual(["1/1"]);
  });

  it("fails visibly when the guard read fails, uploading nothing", async () => {
    const { runtime, calls } = await enabledVault();
    (runtime.fetch as any).mockImplementationOnce(async (url: string) => {
      calls.push({ url });
      return {
        ok: false,
        status: 503,
        json: async () => ({}),
      };
    });
    const result = await pushVaultToCloudBackup(
      runtime,
      "v-1",
      PAYLOAD,
      undefined,
      {
        expectLastPushedAt: MANIFEST.lastPushedAt,
      },
    );
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
