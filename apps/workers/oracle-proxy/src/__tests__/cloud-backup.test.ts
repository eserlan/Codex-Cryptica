import { describe, expect, it } from "vitest";
import {
  handleEnableCloudBackup,
  handleCommitCloudBackup,
  handleCloudBackupAssetUpload,
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

  private sizeOf(key: string): number {
    const body = this.store.get(key)?.body;
    if (body === undefined) return 0;
    return typeof body === "string"
      ? new TextEncoder().encode(body).length
      : body.byteLength;
  }

  async head(key: string) {
    const item = this.store.get(key);
    return item
      ? { customMetadata: item.customMetadata, size: this.sizeOf(key) }
      : null;
  }

  async list({ prefix, limit }: { prefix: string; limit?: number }) {
    const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
    const capped = typeof limit === "number" ? keys.slice(0, limit) : keys;
    return {
      objects: capped.map((key) => ({
        key,
        size: this.sizeOf(key),
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

/** A commit body: the bundle plus the ids of the assets that belong to it. */
const commitBody = (
  title = "The Saltmere Fens",
  extra: unknown[] = [],
  assetIds: string[] = ["map.png"],
) => ({
  vaultTitle: title,
  bundle: {
    schemaVersion: 1,
    entities: [{ id: "e1", title: "Alder Cass" }, ...extra],
  },
  assetIds,
});

/** PUT one asset as raw bytes, the way the client uploads them. */
const putAsset = (auth: string, body: Uint8Array | string, size?: number) =>
  new Request("https://example.test/api/cloud-backup", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth}`,
      "Content-Type": "image/png",
      ...(size === undefined ? {} : { "Content-Length": String(size) }),
    },
    body,
  });

async function uploadAsset(
  env: CloudBackupEnv,
  backupId: string,
  ownerCode: string,
  assetId = "map.png",
  bytes = new TextEncoder().encode("binary-map-data"),
) {
  return handleCloudBackupAssetUpload(
    putAsset(ownerCode, bytes),
    env,
    backupId,
    assetId,
  );
}

/** Opens a backup and uploads its one asset, without committing. */
async function enable(env: CloudBackupEnv, title?: string) {
  const res = await handleEnableCloudBackup(
    post({ vaultTitle: title ?? "The Saltmere Fens" }),
    env,
  );
  const opened = (await res.json()) as {
    backupId: string;
    ownerCode: string;
    manifest: { sizeBytes: number; lastPushedAt: string };
  };
  await uploadAsset(env, opened.backupId, opened.ownerCode);
  return opened;
}

/** Opens, uploads and commits — a complete backup. */
async function enableAndCommit(env: CloudBackupEnv, title?: string) {
  const opened = await enable(env, title);
  const res = await handleCommitCloudBackup(
    post(commitBody(title), opened.ownerCode),
    env,
    opened.backupId,
  );
  const { manifest } = (await res.json()) as {
    manifest: { sizeBytes: number; lastPushedAt: string };
  };
  return { ...opened, manifest };
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
        await handleCommitCloudBackup(
          post(commitBody(), a.ownerCode),
          env,
          b.backupId,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleCloudBackupAssetUpload(
          putAsset(a.ownerCode, new TextEncoder().encode("x")),
          env,
          b.backupId,
          "stolen.png",
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

describe("enable, upload and commit", () => {
  it("opens a backup and returns the code exactly once", async () => {
    const env = makeEnv();
    const res = await handleEnableCloudBackup(
      post({ vaultTitle: "The Saltmere Fens" }),
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.backupId).toBeTruthy();
    expect(body.ownerCode).toMatch(/^[a-f0-9]{64}$/);
    expect(body.manifest.vaultTitle).toBe("The Saltmere Fens");
    // Enable writes the manifest and nothing else: content follows.
    expect(env.BUCKET.store.has(getManifestKey(body.backupId))).toBe(true);
    expect(env.BUCKET.store.has(getBundleKey(body.backupId))).toBe(false);
  });

  it("rejects an enable with no title with 400", async () => {
    const env = makeEnv();
    expect((await handleEnableCloudBackup(post({}), env)).status).toBe(400);
    expect(
      (await handleEnableCloudBackup(post({ vaultTitle: "  " }), env)).status,
    ).toBe(400);
  });

  it("rejects a commit with no bundle with 400", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const res = await handleCommitCloudBackup(
      post({ vaultTitle: "x" }, ownerCode),
      env,
      backupId,
    );
    expect(res.status).toBe(400);
  });

  it("refuses an oversized body before reading it", async () => {
    // The point of the header check: measuring by parsing is what would
    // exhaust the Worker's memory, so the limit has to be enforced first.
    const env = makeEnv();
    const request = new Request("https://example.test/api/cloud-backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(64 * 1024 * 1024),
      },
      body: JSON.stringify({ vaultTitle: "Huge" }),
    });
    const res = await handleEnableCloudBackup(request, env);
    expect(res.status).toBe(413);
    expect(env.BUCKET.store.size).toBe(0);
  });

  it("rejects a single asset over the per-file limit", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const res = await handleCloudBackupAssetUpload(
      putAsset(ownerCode, new Uint8Array(1), 6 * 1024 * 1024),
      env,
      backupId,
      "big.png",
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.limitBytes).toBe(5 * 1024 * 1024);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "big.png"))).toBe(false);
  });

  it("rejects an asset that pushes the vault over its ceiling", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    // Eleven 5MB files exceed the 50MB vault limit; the last one is refused.
    let last: Response | undefined;
    for (let i = 0; i < 11; i += 1) {
      last = await handleCloudBackupAssetUpload(
        putAsset(ownerCode, new Uint8Array(5 * 1024 * 1024)),
        env,
        backupId,
        `a${i}.png`,
      );
    }
    expect(last!.status).toBe(413);
    expect((await last!.json()).error.limitBytes).toBe(50 * 1024 * 1024);
  });

  it("does not double-count an asset that replaces itself", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const bytes = new Uint8Array(4 * 1024 * 1024);
    for (let i = 0; i < 20; i += 1) {
      const res = await handleCloudBackupAssetUpload(
        putAsset(ownerCode, bytes),
        env,
        backupId,
        "same.png",
      );
      expect(res.status).toBe(200);
    }
  });

  it("rejects an asset id containing a path separator", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    const res = await handleCloudBackupAssetUpload(
      putAsset(ownerCode, new TextEncoder().encode("x")),
      env,
      backupId,
      "../escape",
    );
    expect(res.status).toBe(400);
  });

  it("refuses an asset upload without the ownership code", async () => {
    const env = makeEnv();
    const { backupId } = await enable(env);
    const res = await handleCloudBackupAssetUpload(
      putAsset("wrong-code", new TextEncoder().encode("x")),
      env,
      backupId,
      "a.png",
    );
    expect(res.status).toBe(404);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "a.png"))).toBe(false);
  });

  it("prunes stale assets on commit, after the new ones are already stored", async () => {
    // Deleting first would leave a bundle whose media is gone.
    const env = makeEnv();
    const { backupId, ownerCode } = await enable(env);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(true);

    await uploadAsset(env, backupId, ownerCode, "new.png");
    await handleCommitCloudBackup(
      post(commitBody("The Saltmere Fens", [], ["new.png"]), ownerCode),
      env,
      backupId,
    );

    expect(env.BUCKET.store.has(getAssetKey(backupId, "new.png"))).toBe(true);
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(false);
  });

  it("keeps the ownership code valid across a commit", async () => {
    const env = makeEnv();
    const { backupId, ownerCode } = await enableAndCommit(env);
    expect(
      (await handleGetCloudBackupStatus(get(ownerCode), env, backupId)).status,
    ).toBe(200);
  });

  it("replaces the whole snapshot on commit and moves lastPushedAt", async () => {
    const env = makeEnv();
    const { backupId, ownerCode, manifest } = await enableAndCommit(env);

    const res = await handleCommitCloudBackup(
      post(
        {
          vaultTitle: "The Saltmere Fens",
          bundle: { schemaVersion: 1, entities: [{ id: "e2", title: "Nell" }] },
          assetIds: [],
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
    // A commit listing no assets clears the previous ones, so deletions
    // propagate to the backup.
    expect(env.BUCKET.store.has(getAssetKey(backupId, "map.png"))).toBe(false);

    const after = (await res.json()) as any;
    expect(after.manifest.lastPushedAt >= manifest.lastPushedAt).toBe(true);
  });

  it("records a size covering the stored assets and the bundle", async () => {
    const env = makeEnv();
    const { manifest } = await enableAndCommit(env);
    expect(manifest.sizeBytes).toBeGreaterThan("binary-map-data".length);
  });
});

/* --------------------------------------------------------------- US2 -- */

describe("restore reads", () => {
  it("returns the manifest and bundle without mutating lastPushedAt", async () => {
    const env = makeEnv();
    const { backupId, ownerCode, manifest } = await enableAndCommit(env);

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
    const { backupId, ownerCode } = await enableAndCommit(env);
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
