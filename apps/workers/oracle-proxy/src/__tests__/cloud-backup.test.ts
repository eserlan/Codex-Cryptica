import { describe, expect, it } from "vitest";
import {
  handleEnableCloudBackup,
  handlePushCloudBackup,
  handleGetCloudBackupStatus,
  handleGetCloudBackupBundle,
  handleGetCloudBackupAsset,
  handleDeleteCloudBackup,
  handleCloudBackupAdminLookup,
  handleCloudBackupReissueCode,
  hashOwnerCode,
  getManifestKey,
  getBundleKey,
  getAssetKey,
  type CloudBackupEnv,
} from "../cloud-backup";

/**
 * In-memory R2 stand-in, following the convention in
 * `template-directory.performance.test.ts` — no network, no wrangler.
 */
class Bucket {
  store = new Map<
    string,
    {
      body: string | Uint8Array;
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    }
  >();

  async put(
    key: string,
    body: string | Uint8Array,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: { contentType?: string };
    },
  ) {
    this.store.set(key, {
      body,
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
    });
  }

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      text: async () =>
        typeof item.body === "string"
          ? item.body
          : new TextDecoder().decode(item.body),
      body: item.body,
      customMetadata: item.customMetadata,
      httpMetadata: item.httpMetadata,
    };
  }

  async head(key: string) {
    const item = this.store.get(key);
    return item ? { customMetadata: item.customMetadata } : null;
  }

  async list({ prefix, limit }: { prefix: string; limit?: number }) {
    const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
    const capped = typeof limit === "number" ? keys.slice(0, limit) : keys;
    return {
      objects: capped.map((key) => ({
        key,
        customMetadata: this.store.get(key)?.customMetadata,
      })),
      truncated: typeof limit === "number" && keys.length > limit,
      cursor: undefined,
    };
  }

  async delete(key: string) {
    this.store.delete(key);
  }
}

const ADMIN_TOKEN = "admin-secret";

function makeEnv(): CloudBackupEnv & { BUCKET: Bucket } {
  return { BUCKET: new Bucket(), CLOUD_BACKUP_ADMIN_TOKEN: ADMIN_TOKEN };
}

const post = (body: unknown, auth?: string) =>
  new Request("https://example.test/api/cloud-backup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(body),
  });

const get = (auth?: string) =>
  new Request("https://example.test/api/cloud-backup", {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  });

const payload = (title = "The Saltmere Fens", extra: unknown[] = []) => ({
  vaultTitle: title,
  bundle: {
    schemaVersion: 1,
    entities: [{ id: "e1", title: "Alder Cass" }, ...extra],
  },
  assets: [{ assetId: "map.png", content: btoa("binary-map-data") }],
});

async function enable(env: CloudBackupEnv, title?: string) {
  const res = await handleEnableCloudBackup(post(payload(title)), env);
  return (await res.json()) as {
    backupId: string;
    ownerCode: string;
    manifest: { sizeBytes: number; lastPushedAt: string };
  };
}

/* ------------------------------------------------------- foundational -- */

describe("credentials and key layout", () => {
  it("hashes an ownership code to stable SHA-256 hex", async () => {
    const hash = await hashOwnerCode("abc");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashOwnerCode("abc")).toBe(hash);
    expect(await hashOwnerCode("abd")).not.toBe(hash);
  });

  it("never writes the raw ownership code to storage", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const serialised = JSON.stringify([...env.BUCKET.store.entries()]);
    expect(serialised).not.toContain(ownerCode);
    expect(
      env.BUCKET.store.get(getManifestKey(backupId))?.customMetadata,
    ).toHaveProperty("ownerCodeHash");
  });

  it("lays keys out under one prefix per backup", () => {
    expect(getManifestKey("b1")).toBe("cloud-backup/b1/manifest.json");
    expect(getBundleKey("b1")).toBe("cloud-backup/b1/bundle.json");
    expect(getAssetKey("b1", "map.png")).toBe("cloud-backup/b1/assets/map.png");
  });

  it("authorises a correct code and rejects a wrong one", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    expect(
      (await handleGetCloudBackupStatus(get(ownerCode), env, backupId)).status,
    ).toBe(200);
    expect(
      (await handleGetCloudBackupStatus(get("wrong"), env, backupId)).status,
    ).toBe(404);
  });

  it("returns byte-identical responses for a wrong code and a missing backup", async () => {
    // Otherwise an attacker can probe which backups exist (FR-014).
    const env = makeEnv();
    const { backupId } = await enable(env);
    const wrongCode = await handleGetCloudBackupStatus(
      get("wrong"),
      env,
      backupId,
    );
    const missing = await handleGetCloudBackupStatus(
      get("wrong"),
      env,
      "no-such-backup",
    );
    expect(wrongCode.status).toBe(missing.status);
    expect(await wrongCode.text()).toBe(await missing.text());
  });

  it("rejects a request with no credential at all", async () => {
    const env = makeEnv();
    const { backupId } = await enable(env);
    expect(
      (await handleGetCloudBackupStatus(get(), env, backupId)).status,
    ).toBe(404);
  });

  it("does not let one vault's code reach another vault's backup", async () => {
    // FR-012: ownership is scoped per backup, not per installation.
    const env = makeEnv();
    const a = await enable(env, "Vault A");
    const b = await enable(env, "Vault B");

    expect(
      (await handleGetCloudBackupStatus(get(a.ownerCode), env, b.backupId))
        .status,
    ).toBe(404);
    expect(
      (await handleGetCloudBackupBundle(get(a.ownerCode), env, b.backupId))
        .status,
    ).toBe(404);
    expect(
      (await handleDeleteCloudBackup(get(a.ownerCode), env, b.backupId)).status,
    ).toBe(404);
    expect(
      (
        await handlePushCloudBackup(
          post(payload(), a.ownerCode),
          env,
          b.backupId,
        )
      ).status,
    ).toBe(404);

    // B survives A's attempts untouched.
    expect(
      (await handleGetCloudBackupStatus(get(b.ownerCode), env, b.backupId))
        .status,
    ).toBe(200);
  });
});

/* --------------------------------------------------------------- US1 -- */

describe("enable and push", () => {
  it("creates a backup and returns the code exactly once", async () => {
    const env = makeEnv();
    const res = await handleEnableCloudBackup(post(payload()), env);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.backupId).toBeTruthy();
    expect(body.ownerCode).toMatch(/^[a-f0-9]{64}$/);
    expect(body.manifest.vaultTitle).toBe("The Saltmere Fens");
    expect(env.BUCKET.store.has(getBundleKey(body.backupId))).toBe(true);
    expect(env.BUCKET.store.has(getAssetKey(body.backupId, "map.png"))).toBe(
      true,
    );
  });

  it("rejects a payload with no title or bundle with 400", async () => {
    const env = makeEnv();
    expect(
      (await handleEnableCloudBackup(post({ bundle: {} }), env)).status,
    ).toBe(400);
    expect(
      (await handleEnableCloudBackup(post({ vaultTitle: "x" }), env)).status,
    ).toBe(400);
  });

  it("rejects an oversized vault with 413 and writes nothing", async () => {
    const env = makeEnv();
    const huge = {
      vaultTitle: "Huge",
      bundle: { blob: "x".repeat(51 * 1024 * 1024) },
    };
    const res = await handleEnableCloudBackup(post(huge), env);
    expect(res.status).toBe(413);
    const body = (await res.json()) as any;
    expect(body.error.limitBytes).toBe(50 * 1024 * 1024);
    expect(body.error.actualBytes).toBeGreaterThan(body.error.limitBytes);
    // No partial backup left behind (SC-010).
    expect(env.BUCKET.store.size).toBe(0);
  });

  it("rejects a malformed base64 asset with 400 and writes nothing", async () => {
    // Previously atob threw, producing an uncaught 500.
    const env = makeEnv();
    const res = await handleEnableCloudBackup(
      post({
        vaultTitle: "T",
        bundle: {},
        assets: [{ assetId: "a.png", content: "!!!not base64!!!" }],
      }),
      env,
    );
    expect(res.status).toBe(400);
    expect(env.BUCKET.store.size).toBe(0);
  });

  it("rejects an asset id containing a path separator", async () => {
    const env = makeEnv();
    const res = await handleEnableCloudBackup(
      post({
        vaultTitle: "T",
        bundle: {},
        assets: [{ assetId: "../escape", content: btoa("x") }],
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it("prunes stale assets after writing the new ones, not before", async () => {
    // Deleting first would leave a bundle with no media if the write failed.
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(true);

    await handlePushCloudBackup(
      post(
        {
          vaultTitle: "The Saltmere Fens",
          bundle: { entities: [] },
          assets: [{ assetId: "new.png", content: btoa("new") }],
        },
        ownerCode,
      ),
      env,
      backupId,
    );

    expect(env.BUCKET.store.has(getAssetKey(backupId, "new.png"))).toBe(true);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(false);
  });

  it("keeps the ownership code valid across a push", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    await handlePushCloudBackup(post(payload(), ownerCode), env, backupId);
    expect(
      (await handleGetCloudBackupStatus(get(ownerCode), env, backupId)).status,
    ).toBe(200);
  });

  it("replaces the whole snapshot on push and moves lastPushedAt", async () => {
    const env = makeEnv();
    const { backupId, ownerCode, manifest } = await enable(env);

    const res = await handlePushCloudBackup(
      post(
        {
          vaultTitle: "The Saltmere Fens",
          bundle: { schemaVersion: 1, entities: [{ id: "e2", title: "Nell" }] },
        },
        ownerCode,
      ),
      env,
      backupId,
    );
    expect(res.status).toBe(200);

    const bundle = JSON.parse(
      env.BUCKET.store.get(getBundleKey(backupId))!.body as string,
    );
    expect(bundle.entities).toHaveLength(1);
    expect(bundle.entities[0].id).toBe("e2");
    // A push with no assets clears the previous ones, so deletions propagate.
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(false);

    const after = (await res.json()) as any;
    expect(after.manifest.lastPushedAt >= manifest.lastPushedAt).toBe(true);
  });
});

/* --------------------------------------------------------------- US2 -- */

describe("restore reads", () => {
  it("returns the manifest and bundle without mutating lastPushedAt", async () => {
    const env = makeEnv();
    const { backupId, ownerCode, manifest } = await enable(env);

    const res = await handleGetCloudBackupBundle(get(ownerCode), env, backupId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.bundle.entities[0].title).toBe("Alder Cass");
    expect(body.manifest.lastPushedAt).toBe(manifest.lastPushedAt);
  });

  it("streams an asset back", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const res = await handleGetCloudBackupAsset(
      get(ownerCode),
      env,
      backupId,
      "map.png",
    );
    expect(res.status).toBe(200);
  });

  it("404s an unknown asset without revealing the backup exists", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const res = await handleGetCloudBackupAsset(
      get(ownerCode),
      env,
      backupId,
      "nope.png",
    );
    expect(res.status).toBe(404);
  });
});

/* --------------------------------------------------------------- US3 -- */

describe("status and deletion", () => {
  it("reports status, last push time and size", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const body = (await (
      await handleGetCloudBackupStatus(get(ownerCode), env, backupId)
    ).json()) as any;
    expect(body.status).toBe("idle");
    expect(body.lastPushedAt).toBeTruthy();
    expect(body.sizeBytes).toBeGreaterThan(0);
  });

  it("deletes manifest, bundle and every asset, after which restore fails", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);

    const res = await handleDeleteCloudBackup(get(ownerCode), env, backupId);
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toEqual({ deleted: true });

    const remaining = [...env.BUCKET.store.keys()].filter((key) =>
      key.startsWith(`cloud-backup/${backupId}/`),
    );
    expect(remaining).toEqual([]);

    // SC-004: no longer restorable.
    expect(
      (await handleGetCloudBackupBundle(get(ownerCode), env, backupId)).status,
    ).toBe(404);
  });
});

/* --------------------------------------------------------------- US4 -- */

describe("support lookup", () => {
  it("returns metadata for exactly one title match", async () => {
    const env = makeEnv();
    const { backupId } = await enable(env, "Unique Title");
    const res = await handleCloudBackupAdminLookup(
      post({ vaultTitle: "Unique Title" }, ADMIN_TOKEN),
      env,
    );
    const body = (await res.json()) as any;
    expect(body.matched).toBe(true);
    expect(body.backupId).toBe(backupId);
    expect(body.vaultTitle).toBe("Unique Title");
    expect(body.lastPushedAt).toBeTruthy();
  });

  it("never returns vault content", async () => {
    const env = makeEnv();
    await enable(env, "Unique Title");
    const text = await (
      await handleCloudBackupAdminLookup(
        post({ vaultTitle: "Unique Title" }, ADMIN_TOKEN),
        env,
      )
    ).text();
    expect(text).not.toContain("Alder Cass");
  });

  it("answers a zero match and an ambiguous match identically", async () => {
    // The admin must not learn that three vaults share a title (FR-016).
    const env = makeEnv();
    await enable(env, "Shared Name");
    await enable(env, "Shared Name");

    const ambiguous = await handleCloudBackupAdminLookup(
      post({ vaultTitle: "Shared Name" }, ADMIN_TOKEN),
      env,
    );
    const missing = await handleCloudBackupAdminLookup(
      post({ vaultTitle: "Nothing Like This" }, ADMIN_TOKEN),
      env,
    );
    // Read each body once: a Response body cannot be consumed twice, so the
    // text is parsed rather than re-read as JSON.
    const ambiguousText = await ambiguous.text();
    expect(ambiguousText).toBe(await missing.text());
    expect(JSON.parse(ambiguousText)).toEqual({ matched: false });
  });

  it("returns nothing for an empty query rather than everything", async () => {
    const env = makeEnv();
    await enable(env, "Anything");
    const body = (await (
      await handleCloudBackupAdminLookup(
        post({ vaultTitle: "  " }, ADMIN_TOKEN),
        env,
      )
    ).json()) as any;
    expect(body).toEqual({ matched: false });
  });

  it("rejects a missing or wrong admin token, and an owner code in its place", async () => {
    const env = makeEnv();
    const { ownerCode } = await enable(env, "Unique Title");

    for (const auth of [undefined, "not-the-admin-token", ownerCode]) {
      const res = await handleCloudBackupAdminLookup(
        post({ vaultTitle: "Unique Title" }, auth),
        env,
      );
      expect(res.status).toBe(404);
    }
  });

  it("stays closed when no admin token is configured", async () => {
    const env = { BUCKET: new Bucket() } as CloudBackupEnv;
    const res = await handleCloudBackupAdminLookup(
      post({ vaultTitle: "x" }, "anything"),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("re-issues a code, invalidating the previous one", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env, "Lost Code Vault");

    const res = await handleCloudBackupReissueCode(
      post({}, ADMIN_TOKEN),
      env,
      backupId,
    );
    expect(res.status).toBe(200);
    const { ownerCode: reissued } = (await res.json()) as any;
    expect(reissued).not.toBe(ownerCode);

    expect(
      (await handleGetCloudBackupStatus(get(reissued), env, backupId)).status,
    ).toBe(200);
    // Only ever one valid code per backup.
    expect(
      (await handleGetCloudBackupStatus(get(ownerCode), env, backupId)).status,
    ).toBe(404);
  });

  it("does not expose re-issue to a non-admin", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    expect(
      (await handleCloudBackupReissueCode(post({}, ownerCode), env, backupId))
        .status,
    ).toBe(404);
  });

  it("preserves the manifest through a re-issue", async () => {
    const env = makeEnv();
    const { backupId } = await enable(env, "Kept Title");
    await handleCloudBackupReissueCode(post({}, ADMIN_TOKEN), env, backupId);
    const stored = JSON.parse(
      env.BUCKET.store.get(getManifestKey(backupId))!.body as string,
    );
    expect(stored.vaultTitle).toBe("Kept Title");
  });
});
