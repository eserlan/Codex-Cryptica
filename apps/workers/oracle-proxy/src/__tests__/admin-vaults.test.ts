import { describe, expect, it } from "vitest";
import { ADMIN_VAULT_PAGE_SIZE, handleAdminVaultRoutes } from "../admin-vaults";
import { getManifestKey, type CloudBackupEnv } from "../cloud-backup";
import { writeSuspensionMarker } from "../suspension";
import { Bucket } from "./r2-memory-bucket";

const ADMIN_TOKEN = "admin-secret";

function makeEnv(token: string | null = ADMIN_TOKEN) {
  return {
    BUCKET: new Bucket(),
    CLOUD_BACKUP_ADMIN_TOKEN: token ?? undefined,
  } satisfies CloudBackupEnv;
}

function request(path: string, auth = ADMIN_TOKEN) {
  return new Request(`https://example.test${path}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  });
}

async function call(env: CloudBackupEnv, path: string, auth = ADMIN_TOKEN) {
  const url = new URL(`https://example.test${path}`);
  const response = await handleAdminVaultRoutes(
    request(path, auth),
    env,
    url.pathname,
  );
  if (!response) throw new Error("route not handled");
  return { status: response.status, text: await response.text() };
}

async function seedBackup(
  bucket: Bucket,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  await bucket.put(
    getManifestKey(id),
    JSON.stringify({
      schemaVersion: 2,
      backupId: id,
      vaultTitle: `Vault ${id}`,
      sizeBytes: 2_500_000,
      createdAt: "2026-09-01T10:00:00.000Z",
      lastPushedAt: "2026-10-20T10:00:00.000Z",
      entityCount: 42,
      ...overrides,
    }),
    {
      customMetadata: {
        ownerCodeHash: "SECRET-HASH",
        vaultTitle: `Vault ${id}`,
      },
    },
  );
  await bucket.put(`cloud-backup/${id}/bundle.json`, "PRIVATE LORE");
}

describe("admin vault inventory: access", () => {
  it("ignores paths outside the inventory", async () => {
    const env = makeEnv();
    const response = await handleAdminVaultRoutes(
      request("/api/cloud-backup/admin/stats"),
      env,
      "/api/cloud-backup/admin/stats",
    );
    expect(response).toBeNull();
  });

  it("answers 404 for a missing or wrong token, and when no token is configured", async () => {
    const env = makeEnv();
    await seedBackup(env.BUCKET, "a");
    for (const auth of ["", "wrong", "SECRET-HASH"]) {
      const result = await call(env, "/api/admin/vaults/backups", auth);
      expect(result.status).toBe(404);
      expect(result.text).not.toContain("Vault a");
    }
    const closed = makeEnv(null);
    await seedBackup(closed.BUCKET, "a");
    expect((await call(closed, "/api/admin/vaults/backups", "")).status).toBe(
      404,
    );
  });

  it("rejects writes and unknown inventories", async () => {
    const env = makeEnv();
    const post = await handleAdminVaultRoutes(
      new Request("https://example.test/api/admin/vaults/backups", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      }),
      env,
      "/api/admin/vaults/backups",
    );
    expect(post?.status).toBe(405);
    expect((await call(env, "/api/admin/vaults/everything")).status).toBe(404);
  });
});

describe("admin vault inventory: backups", () => {
  it("lists metadata only, never content or the owner-code hash", async () => {
    const env = makeEnv();
    await seedBackup(env.BUCKET, "b1");
    await seedBackup(env.BUCKET, "b2", { entityCount: undefined });
    const { status, text } = await call(env, "/api/admin/vaults/backups");
    expect(status).toBe(200);
    expect(JSON.parse(text)).toEqual({
      vaults: [
        {
          id: "b1",
          title: "Vault b1",
          sizeBytes: 2_500_000,
          entityCount: 42,
          createdAt: "2026-09-01T10:00:00.000Z",
          lastActiveAt: "2026-10-20T10:00:00.000Z",
        },
        expect.objectContaining({ id: "b2", entityCount: null }),
      ],
      cursor: null,
    });
    expect(text).not.toContain("SECRET-HASH");
    expect(text).not.toContain("PRIVATE LORE");
  });

  it("skips a folder whose manifest is missing or unreadable", async () => {
    const env = makeEnv();
    await seedBackup(env.BUCKET, "ok");
    await env.BUCKET.put("cloud-backup/orphan/assets/x.png", "img");
    await env.BUCKET.put(getManifestKey("broken"), "{not json");
    const body = JSON.parse(
      (await call(env, "/api/admin/vaults/backups")).text,
    );
    expect(body.vaults.map((v: { id: string }) => v.id)).toEqual(["ok"]);
  });

  it("pages instead of walking the whole bucket", async () => {
    const env = makeEnv();
    for (let i = 0; i <= ADMIN_VAULT_PAGE_SIZE; i++) {
      await seedBackup(env.BUCKET, `v${String(i).padStart(3, "0")}`);
    }
    env.BUCKET.resetOps();
    const first = JSON.parse(
      (await call(env, "/api/admin/vaults/backups")).text,
    );
    expect(first.vaults).toHaveLength(ADMIN_VAULT_PAGE_SIZE);
    expect(first.cursor).toEqual(expect.any(String));
    // One list plus one manifest read per vault.
    expect(env.BUCKET.ops.list).toBe(1);
    expect(env.BUCKET.ops.get).toBe(ADMIN_VAULT_PAGE_SIZE);

    const second = JSON.parse(
      (
        await call(
          env,
          `/api/admin/vaults/backups?cursor=${encodeURIComponent(first.cursor)}`,
        )
      ).text,
    );
    expect(second.vaults.map((v: { id: string }) => v.id)).toEqual(["v050"]);
    expect(second.cursor).toBeNull();
  });
});

describe("admin vault inventory: published", () => {
  async function seedPublished(
    bucket: Bucket,
    id: string,
    meta: Record<string, string>,
  ) {
    await bucket.put(`published/${id}/bundle.json`, "x".repeat(1000), {
      customMetadata: { writeToken: "WRITE-TOKEN", ...meta },
    });
  }

  it("counts bundle plus assets, reports suspensions and never returns the write token", async () => {
    const env = makeEnv();
    await seedPublished(env.BUCKET, "p1", {
      vaultTitle: "Shared World",
      publishedAt: "2026-10-01T09:00:00.000Z",
      entityCount: "17",
    });
    await env.BUCKET.put("published/p1/assets/a.png", "y".repeat(500));
    await seedPublished(env.BUCKET, "p2", {});
    await writeSuspensionMarker(env, {
      schemaVersion: 1,
      publishId: "p2",
      mode: "delist",
      createdAt: "2026-10-02T09:00:00.000Z",
    });

    const { text } = await call(env, "/api/admin/vaults/published");
    expect(JSON.parse(text).vaults).toEqual([
      {
        id: "p1",
        title: "Shared World",
        sizeBytes: 1500,
        entityCount: 17,
        createdAt: null,
        lastActiveAt: "2026-10-01T09:00:00.000Z",
        suspension: null,
      },
      {
        id: "p2",
        title: "Untitled World",
        sizeBytes: 1000,
        entityCount: null,
        createdAt: null,
        lastActiveAt: null,
        suspension: "delist",
      },
    ]);
    expect(text).not.toContain("WRITE-TOKEN");
  });
});
