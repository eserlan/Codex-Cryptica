import { describe, expect, it, vi } from "vitest";
import {
  enableCloudBackup,
  pushVaultToCloudBackup,
  getCloudBackupStatus,
  restoreVaultFromCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
  getCloudBackupOwnershipCode,
  getLocalCloudBackupRecord,
} from "./cloud-backup-sync";
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

/** Builds a runtime whose fetch returns queued responses and records calls. */
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

const enableResponse = {
  ok: true,
  status: 201,
  body: { backupId: "b-1", ownerCode: "code-1", manifest: MANIFEST },
};

async function enabled(
  ...then: { ok: boolean; status: number; body: unknown }[]
) {
  const h = makeRuntime([enableResponse, ...then]);
  await enableCloudBackup(h.runtime, "v-1", PAYLOAD);
  h.calls.length = 0;
  return h;
}

describe("enableCloudBackup", () => {
  it("stores the record returned by the server", async () => {
    const { runtime } = makeRuntime([enableResponse]);
    const result = await enableCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.backupId).toBe("b-1");
    expect(result.value.ownerCode).toBe("code-1");
    expect(result.value.enabled).toBe(true);
    expect(result.value.consentedAt).toBe("2026-08-31T12:00:00.000Z");
  });

  it("persists the record so a reload does not re-prompt for consent", async () => {
    const { runtime } = makeRuntime([enableResponse]);
    await enableCloudBackup(runtime, "v-1", PAYLOAD);
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.enabled).toBe(true);
    expect(stored?.consentedAt).toBeTruthy();
  });

  it("surfaces a server error instead of throwing", async () => {
    const { runtime } = makeRuntime([
      { ok: false, status: 413, body: { error: { message: "Too large" } } },
    ]);
    const result = await enableCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result).toEqual({ ok: false, error: "Too large", status: 413 });
  });

  it("resumes an existing backup rather than creating a second one", async () => {
    // Re-enabling after a disable must not orphan the previous remote copy.
    const { runtime, calls } = await enabled();
    await disableCloudBackup(runtime, "v-1");
    const result = await enableCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.backupId).toBe("b-1");
    expect(calls).toHaveLength(0);
  });
});

describe("pushVaultToCloudBackup", () => {
  it("pushes with the ownership code and records the new push time", async () => {
    const { runtime, calls } = await enabled();
    const result = await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(true);
    expect(calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/commit",
    );
    expect(calls[0].init.headers.Authorization).toBe("Bearer code-1");
  });

  it("does nothing at all for a vault that was never enabled", async () => {
    // FR-001/FR-003: nothing leaves the device without an opted-in record.
    const { runtime, calls } = makeRuntime();
    const result = await pushVaultToCloudBackup(
      runtime,
      "never-enabled",
      PAYLOAD,
    );
    expect(result).toEqual({ ok: true, value: null });
    expect(calls).toHaveLength(0);
  });

  it("does nothing for a vault that has been disabled", async () => {
    const { runtime, calls } = await enabled();
    await disableCloudBackup(runtime, "v-1");
    await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect(calls).toHaveLength(0);
  });

  it("reports a failure as an error state rather than throwing", async () => {
    // The caller is on the save path: an exception there would be the bug.
    const { runtime } = await enabled();
    (runtime.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Storage unavailable" } }),
    });
    const result = await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(false);
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.status).toBe("error");
  });

  it("keeps the record intact after a failed push so the next save can retry", async () => {
    const { runtime } = await enabled();
    (runtime.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.ownerCode).toBe("code-1");
    expect(stored?.enabled).toBe(true);
  });
});

describe("restoreVaultFromCloudBackup", () => {
  it("returns the staged manifest and bundle without writing anything", async () => {
    const { runtime } = makeRuntime([
      {
        ok: true,
        status: 200,
        body: { manifest: MANIFEST, bundle: { entities: [1] } },
      },
    ]);
    const result = await restoreVaultFromCloudBackup(runtime, {
      backupId: "b-1",
      ownerCode: "code-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.bundle).toEqual({ entities: [1] });
    // Nothing local was touched — the caller owns the destination (FR-006a).
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toBeNull();
  });

  it("reports a wrong code without exposing whether the backup exists", async () => {
    const { runtime } = makeRuntime([
      {
        ok: false,
        status: 404,
        body: { error: { message: "Backup not found" } },
      },
    ]);
    const result = await restoreVaultFromCloudBackup(runtime, {
      backupId: "b-1",
      ownerCode: "wrong",
    });
    expect(result).toEqual({
      ok: false,
      error: "Backup not found",
      status: 404,
    });
  });

  it("fails cleanly when the response is missing its bundle", async () => {
    const { runtime } = makeRuntime([
      { ok: true, status: 200, body: { manifest: MANIFEST } },
    ]);
    const result = await restoreVaultFromCloudBackup(runtime, {
      backupId: "b-1",
      ownerCode: "code-1",
    });
    expect(result.ok).toBe(false);
  });

  it("round-trips a populated vault without losing content", async () => {
    // SC-003: everything backed up comes back.
    const vault = {
      entities: [
        { id: "e1", title: "Alder Cass", lore: "## Hooks\n\n- Owes money." },
        { id: "e2", title: "Nell Cass" },
      ],
      labels: ["harbour", "smuggling"],
      assetManifest: [{ assetId: "map.png", mimeType: "image/png" }],
    };
    const { runtime } = makeRuntime([
      { ok: true, status: 200, body: { manifest: MANIFEST, bundle: vault } },
    ]);
    const result = await restoreVaultFromCloudBackup(runtime, {
      backupId: "b-1",
      ownerCode: "code-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.bundle).toEqual(vault);
  });
});

describe("disable, delete and code access", () => {
  it("disables locally and issues no request", async () => {
    // FR-009: disabling must not touch the remote copy.
    const { runtime, calls } = await enabled();
    const result = await disableCloudBackup(runtime, "v-1");
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(0);
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.enabled).toBe(false);
  });

  it("keeps consentedAt after a disable so re-enabling does not re-prompt", async () => {
    const { runtime } = await enabled();
    await disableCloudBackup(runtime, "v-1");
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.consentedAt).toBe("2026-08-31T12:00:00.000Z");
  });

  it("deletes the remote copy and clears the local record", async () => {
    // Uses the runtime's own queued-response fetch rather than a one-shot
    // mock: a `mockResolvedValueOnce` would replace the implementation and so
    // never record the call this test is asserting on.
    const { runtime, calls } = await enabled({
      ok: true,
      status: 200,
      body: { deleted: true },
    });
    const result = await deleteCloudBackup(runtime, "v-1");
    expect(result.ok).toBe(true);
    expect(calls[0].init.method).toBe("DELETE");
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toBeNull();
  });

  it("keeps the local record when deletion fails", async () => {
    // Otherwise the user believes data was erased when it was not.
    const { runtime } = await enabled();
    (runtime.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Storage unavailable" } }),
    });
    const result = await deleteCloudBackup(runtime, "v-1");
    expect(result.ok).toBe(false);
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).not.toBeNull();
  });

  it("exposes the ownership code for display, and null when there is none", async () => {
    const { runtime } = await enabled();
    expect(await getCloudBackupOwnershipCode(runtime, "v-1")).toBe("code-1");
    expect(await getCloudBackupOwnershipCode(runtime, "other")).toBeNull();
  });
});

describe("malformed responses", () => {
  it("treats a 200 with an unreadable body as an error, not a success", async () => {
    // This runs on the save path — it must resolve, never throw (FR-019).
    const { runtime } = await enabled();
    (runtime.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const result = await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(false);
    const stored = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(stored?.status).toBe("error");
  });

  it("refuses to store a record when enable returns no ownership code", async () => {
    // A record without a code is unreachable forever; better to fail loudly.
    const { runtime } = makeRuntime([
      { ok: true, status: 201, body: { backupId: "b-1" } },
    ]);
    const result = await enableCloudBackup(runtime, "v-1", PAYLOAD);
    expect(result.ok).toBe(false);
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toBeNull();
  });
});

describe("getCloudBackupStatus", () => {
  it("returns the remote status for an enabled vault", async () => {
    const { runtime } = await enabled();
    (runtime.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "idle", lastPushedAt: "x", sizeBytes: 5 }),
    });
    const result = await getCloudBackupStatus(runtime, "v-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sizeBytes).toBe(5);
  });

  it("does not call the network for a vault with no record", async () => {
    const { runtime, calls } = makeRuntime();
    const result = await getCloudBackupStatus(runtime, "never");
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("chunked upload", () => {
  const bytes = (n: number) => new Uint8Array(n).fill(7);

  it("sends each asset as its own raw request, then commits", async () => {
    // The whole point of the split: no vault is ever serialised into one body.
    const { runtime, calls } = await enabled();
    await pushVaultToCloudBackup(runtime, "v-1", {
      ...PAYLOAD,
      assets: [
        { assetId: "a.png", bytes: bytes(3), mimeType: "image/png" },
        { assetId: "b.png", bytes: bytes(4), mimeType: "image/png" },
      ],
    });

    expect(calls.map((call) => call.url)).toEqual([
      "https://worker.test/api/cloud-backup/b-1/assets/a.png",
      "https://worker.test/api/cloud-backup/b-1/assets/b.png",
      "https://worker.test/api/cloud-backup/b-1/commit",
    ]);
    expect(calls[0].init.method).toBe("PUT");
    expect(calls[0].init.body).toBeInstanceOf(Uint8Array);
    expect(calls[0].init.headers["Content-Type"]).toBe("image/png");
  });

  it("names the uploaded assets in the commit so the rest are pruned", async () => {
    const { runtime, calls } = await enabled();
    await pushVaultToCloudBackup(runtime, "v-1", {
      ...PAYLOAD,
      assets: [{ assetId: "a.png", bytes: bytes(3), mimeType: "image/png" }],
    });

    const commit = JSON.parse(calls.at(-1)!.init.body);
    expect(commit.assetIds).toEqual(["a.png"]);
    expect(commit.bundle).toEqual(PAYLOAD.bundle);
  });

  it("stops before committing when an asset fails", async () => {
    // Committing anyway would publish a snapshot whose media is missing.
    const { runtime, calls } = await enabled({
      ok: false,
      status: 413,
      body: { error: { message: "This file is too large to back up." } },
    });
    const result = await pushVaultToCloudBackup(runtime, "v-1", {
      ...PAYLOAD,
      assets: [{ assetId: "a.png", bytes: bytes(3), mimeType: "image/png" }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(413);
    expect(calls.some((call) => call.url.endsWith("/commit"))).toBe(false);
  });

  it("reports progress per asset so a long save is not silent", async () => {
    const { runtime } = await enabled();
    const seen: string[] = [];
    await pushVaultToCloudBackup(
      runtime,
      "v-1",
      {
        ...PAYLOAD,
        assets: [
          { assetId: "a.png", bytes: bytes(1), mimeType: "image/png" },
          { assetId: "b.png", bytes: bytes(1), mimeType: "image/png" },
        ],
      },
      (progress) => seen.push(`${progress.uploaded}/${progress.total}`),
    );
    expect(seen).toEqual(["1/2", "2/2"]);
  });

  it("sends only the title on enable, never the vault content", async () => {
    const { runtime, calls } = makeRuntime([enableResponse]);
    await enableCloudBackup(runtime, "v-9", PAYLOAD);
    const sent = JSON.parse(calls[0].init.body);
    expect(sent).toEqual({ vaultTitle: PAYLOAD.vaultTitle });
  });
});
