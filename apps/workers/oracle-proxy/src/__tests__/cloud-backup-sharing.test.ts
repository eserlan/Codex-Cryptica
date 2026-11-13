import { describe, expect, it } from "vitest";
import { handleCloudBackupRoutes } from "../cloud-backup-routes";
import { hashOwnerCode } from "../cloud-backup-auth";
import {
  handleCloudBackupAdminDelete,
  handleCloudBackupReissueCode,
} from "../cloud-backup-admin";
import {
  CLOUD_BACKUP_SHARING_DEVICE_CAP,
  CLOUD_BACKUP_SHARING_DEVICE_WINDOW_DAYS,
} from "../cloud-backup";
import {
  getAssetKey,
  getManifestKey,
  getSharingDevicesKey,
  readManifest,
} from "../cloud-backup-storage";
import { createBackupFixture } from "./cloud-backup-fixtures";

type Fixture = Awaited<ReturnType<typeof createBackupFixture>>;

const ADMIN = "admin-secret";
let deviceCounter = 0;
const newDevice = () => `device-${String(++deviceCounter).padStart(6, "0")}`;

async function call(
  fx: Fixture,
  method: string,
  path: string,
  options: { key?: string; device?: string; body?: unknown | Uint8Array } = {},
) {
  const headers: Record<string, string> = {};
  if (options.key) headers.Authorization = `Bearer ${options.key}`;
  if (options.device) headers["X-Codex-Device-Id"] = options.device;
  let body: BodyInit | undefined;
  if (options.body instanceof Uint8Array) body = options.body as BodyInit;
  else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const [route, query = ""] = path.split(/(?=\?)/);
  const pathname = `/api/cloud-backup/${fx.backupId}${route}`;
  const response = await handleCloudBackupRoutes(
    new Request(`https://example.test${pathname}${query}`, {
      method,
      headers,
      body,
    }),
    { ...fx.env, CLOUD_BACKUP_ADMIN_TOKEN: ADMIN } as any,
    pathname,
  );
  return response!;
}

async function shared() {
  const fx = await createBackupFixture();
  const commit = await call(fx, "POST", "/commit", {
    key: fx.ownerCode,
    body: { vaultTitle: "Vault", bundle: { entities: [{ id: "a" }] } },
  });
  expect(commit.status).toBe(200);
  await call(fx, "PUT", "/assets/pic", {
    key: fx.ownerCode,
    body: new Uint8Array([1, 2, 3]),
  });
  const on = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
  const { editorToken } = (await on.json()) as { editorToken: string };
  return { ...fx, editorToken };
}

const deltaBody = async (fx: Fixture, key: string, device?: string) => {
  const status = await call(fx, "GET", "/status", { key, device });
  const manifest = (await status.json()) as any;
  return {
    vaultTitle: "Vault",
    baseLastPushedAt: (manifest.manifest ?? manifest).lastPushedAt,
    upserts: [{ id: "b", title: "B" }],
    deletes: [],
    assetIds: ["pic"],
  };
};

async function wrongKeyBody() {
  const fx = await createBackupFixture();
  const res = await call(fx, "DELETE", "", { key: "f".repeat(64) });
  return { status: res.status, text: await res.text() };
}

const stored = async (fx: Fixture) =>
  (await fx.env.BUCKET.get(getManifestKey(fx.backupId)).then((o: any) =>
    o.text(),
  )) as string;

describe("editor link: turning sharing on", () => {
  it("returns a token once and stores only its hash", async () => {
    const fx = await createBackupFixture();
    const res = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.editorToken).toMatch(/^[a-f0-9]{64}$/);
    expect(body.linkVersion).toBe(1);
    expect(Date.parse(body.enabledAt)).not.toBeNaN();
    const text = await stored(fx);
    expect(JSON.parse(text).sharing.editorTokenHash).toBe(
      await hashOwnerCode(body.editorToken),
    );
    expect(text).not.toContain(body.editorToken);
  });

  it("refuses to turn on twice and keeps the first token", async () => {
    const fx = await shared();
    const before = (await readManifest(fx.env, fx.backupId))!.sharing;
    const again = await call(fx, "POST", "/sharing", { key: fx.ownerCode });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({
      error: { message: "Sharing is already on." },
    });
    expect((await readManifest(fx.env, fx.backupId))!.sharing).toEqual(before);
  });

  it("answers other methods on the sharing paths with 404", async () => {
    const fx = await shared();
    for (const [method, path] of [
      ["GET", "/sharing"],
      ["PUT", "/sharing"],
      ["GET", "/sharing/replace-link"],
      ["POST", "/sharing/other"],
    ]) {
      const res = await call(fx, method, path, { key: fx.ownerCode });
      expect(res.status).toBe(404);
    }
  });
});

describe("editor access", () => {
  it("lets an editor read, push a delta and upload an asset", async () => {
    const fx = await shared();
    const { editorToken: key } = fx;
    const device = newDevice();
    for (const path of ["/status", "/bundle", "/index", "/changes?since=0"]) {
      const res = await call(fx, "GET", path, { key, device });
      expect(res.status, path).toBe(200);
      expect(await res.text()).not.toContain("editorTokenHash");
    }
    expect((await call(fx, "GET", "/assets/pic", { key, device })).status).toBe(
      200,
    );
    const before = (await readManifest(fx.env, fx.backupId))!.manifest;
    const delta = await call(fx, "POST", "/delta", {
      key,
      device,
      body: await deltaBody(fx, key, device),
    });
    const deltaText = await delta.text();
    expect(delta.status).toBe(200);
    expect(deltaText).not.toContain("editorTokenHash");
    expect(deltaText).not.toContain('"sharing"');
    expect(JSON.parse(deltaText).manifest.revision).toBe(
      (before.revision ?? 0) + 1,
    );
    const put = await call(fx, "PUT", "/assets/new", {
      key,
      device,
      body: new Uint8Array([9, 9]),
    });
    expect(put.status).toBe(200);
    expect(await fx.env.BUCKET.get(getAssetKey(fx.backupId, "new"))).not.toBe(
      null,
    );
  });

  it("answers an editor on owner-only routes exactly like a wrong key", async () => {
    const fx = await shared();
    const expected = await wrongKeyBody();
    expect(expected.status).toBe(404);
    expect(JSON.parse(expected.text)).toEqual({
      error: { message: "Backup not found" },
    });
    const manifestBefore = await stored(fx);
    for (const [method, path, body] of [
      ["DELETE", "", undefined],
      ["POST", "/commit", { vaultTitle: "X", bundle: {} }],
      ["POST", "/sharing", undefined],
      ["DELETE", "/sharing", undefined],
      ["POST", "/sharing/replace-link", undefined],
    ] as const) {
      // With a valid, a missing and an invalid device header alike.
      for (const device of [newDevice(), undefined, "a/b"]) {
        const res = await call(fx, method, path, {
          key: fx.editorToken,
          device,
          body,
        });
        expect({ status: res.status, text: await res.text() }, path).toEqual(
          expected,
        );
      }
    }
    expect(await stored(fx)).toBe(manifestBefore);
    expect(
      (await call(fx, "GET", "/assets/pic", { key: fx.ownerCode })).status,
    ).toBe(200);
    expect(
      (await call(fx, "GET", "/bundle", { key: fx.ownerCode })).status,
    ).toBe(200);
  });

  it("rejects one backup's editor token on another backup", async () => {
    const a = await shared();
    const b = await createBackupFixture();
    const bShared = await shared();
    const device = newDevice();
    for (const target of [b, bShared]) {
      const read = await call(
        { ...target, env: a.env } as any,
        "GET",
        "/status",
        { key: a.editorToken, device },
      );
      expect(read.status).toBe(404);
      const delta = await call(
        { ...target, env: a.env } as any,
        "POST",
        "/delta",
        {
          key: a.editorToken,
          device,
          body: { vaultTitle: "V" },
        },
      );
      expect(delta.status).toBe(404);
    }
  });
});

describe("replacing and turning off the link", () => {
  it("replaces the link and kills the old token", async () => {
    const fx = await shared();
    const device = newDevice();
    const res = await call(fx, "POST", "/sharing/replace-link", {
      key: fx.ownerCode,
    });
    expect(res.status).toBe(200);
    const next = (await res.json()) as any;
    expect(next.linkVersion).toBe(2);
    expect(next.editorToken).not.toBe(fx.editorToken);
    for (const [method, path, body] of [
      ["GET", "/status", undefined],
      ["POST", "/delta", { vaultTitle: "V" }],
    ] as const) {
      const old = await call(fx, method, path, {
        key: fx.editorToken,
        device,
        body,
      });
      expect(old.status).toBe(404);
    }
    expect(
      (await call(fx, "GET", "/status", { key: next.editorToken, device }))
        .status,
    ).toBe(200);
    expect(
      (
        await call(fx, "POST", "/delta", {
          key: next.editorToken,
          device,
          body: await deltaBody(fx, next.editorToken, device),
        })
      ).status,
    ).toBe(200);
  });

  it("refuses to replace the link when sharing is off", async () => {
    const fx = await createBackupFixture();
    const res = await call(fx, "POST", "/sharing/replace-link", {
      key: fx.ownerCode,
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { message: "Sharing is off." } });
  });

  it("turns sharing off without touching content, and can repeat", async () => {
    const fx = await shared();
    const device = newDevice();
    await call(fx, "GET", "/status", { key: fx.editorToken, device });
    expect(await fx.env.BUCKET.get(getSharingDevicesKey(fx.backupId))).not.toBe(
      null,
    );
    const before = (await readManifest(fx.env, fx.backupId))!.manifest;
    const res = await call(fx, "DELETE", "/sharing", { key: fx.ownerCode });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sharing: false });
    const after = await readManifest(fx.env, fx.backupId);
    expect(after!.sharing).toBeUndefined();
    expect(after!.manifest).toEqual(before);
    expect(await stored(fx)).not.toContain("sharing");
    expect(await fx.env.BUCKET.get(getSharingDevicesKey(fx.backupId))).toBe(
      null,
    );
    for (const [method, path, body] of [
      ["GET", "/status", undefined],
      ["POST", "/delta", { vaultTitle: "V" }],
    ] as const) {
      expect(
        (
          await call(fx, method, path, {
            key: fx.editorToken,
            device,
            body,
          })
        ).status,
      ).toBe(404);
    }
    expect(
      (await call(fx, "GET", "/bundle", { key: fx.ownerCode })).status,
    ).toBe(200);
    expect(await fx.env.BUCKET.get(getAssetKey(fx.backupId, "pic"))).not.toBe(
      null,
    );
    expect(
      (await call(fx, "DELETE", "/sharing", { key: fx.ownerCode })).status,
    ).toBe(200);
  });
});

describe("device cap", () => {
  it("allows 10 devices, refuses the 11th and keeps the owner free", async () => {
    expect(CLOUD_BACKUP_SHARING_DEVICE_CAP).toBe(10);
    expect(CLOUD_BACKUP_SHARING_DEVICE_WINDOW_DAYS).toBe(30);
    const fx = await shared();
    const ids = Array.from({ length: 10 }, newDevice);
    for (const device of ids) {
      expect(
        (await call(fx, "GET", "/status", { key: fx.editorToken, device }))
          .status,
      ).toBe(200);
    }
    const eleventh = await call(fx, "GET", "/status", {
      key: fx.editorToken,
      device: newDevice(),
    });
    expect(eleventh.status).toBe(403);
    expect(((await eleventh.json()) as any).error.code).toBe("device_limit");
    for (const device of ids) {
      expect(
        (await call(fx, "GET", "/status", { key: fx.editorToken, device }))
          .status,
      ).toBe(200);
    }
    expect(
      (await call(fx, "GET", "/status", { key: fx.ownerCode })).status,
    ).toBe(200);
  });

  async function seed(fx: Fixture, devices: Record<string, string>) {
    const { sharing } = (await readManifest(fx.env, fx.backupId))!;
    await fx.env.BUCKET.put(
      getSharingDevicesKey(fx.backupId),
      JSON.stringify({
        linkVersion: sharing!.linkVersion,
        enabledAt: sharing!.enabledAt,
        devices,
      }),
    );
  }

  it("does not count a device last seen 31 days ago", async () => {
    const fx = await shared();
    const now = Date.now();
    const devices: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      devices[`seeded-${i}-device`] = new Date(
        now - (i === 0 ? 31 * 86400000 : 1000),
      ).toISOString();
    }
    await seed(fx, devices);
    expect(
      (
        await call(fx, "GET", "/status", {
          key: fx.editorToken,
          device: newDevice(),
        })
      ).status,
    ).toBe(200);
    const record = JSON.parse(
      await (await fx.env.BUCKET.get(getSharingDevicesKey(fx.backupId))).text(),
    );
    expect(record.devices["seeded-0-device"]).toBeUndefined();
  });

  it("only rewrites lastSeen after 24 hours", async () => {
    const fx = await shared();
    const fresh = "fresh-device-1";
    const old = "older-device-1";
    const recent = new Date(Date.now() - 3600_000).toISOString();
    const day = new Date(Date.now() - 2 * 86400_000).toISOString();
    await seed(fx, { [fresh]: recent, [old]: day });
    await call(fx, "GET", "/status", { key: fx.editorToken, device: fresh });
    await call(fx, "GET", "/status", { key: fx.editorToken, device: old });
    const record = JSON.parse(
      await (await fx.env.BUCKET.get(getSharingDevicesKey(fx.backupId))).text(),
    );
    expect(record.devices[fresh]).toBe(recent);
    expect(record.devices[old]).not.toBe(day);
  });

  it("starts the count again after the link is replaced", async () => {
    const fx = await shared();
    for (let i = 0; i < 10; i++) {
      await call(fx, "GET", "/status", {
        key: fx.editorToken,
        device: newDevice(),
      });
    }
    const next = (await (
      await call(fx, "POST", "/sharing/replace-link", { key: fx.ownerCode })
    ).json()) as any;
    for (let i = 0; i < 10; i++) {
      expect(
        (
          await call(fx, "GET", "/status", {
            key: next.editorToken,
            device: newDevice(),
          })
        ).status,
      ).toBe(200);
    }
  });

  it("asks an editor for a valid device id", async () => {
    const fx = await shared();
    for (const device of [undefined, "a/b", "short", "x".repeat(129)]) {
      const res = await call(fx, "GET", "/status", {
        key: fx.editorToken,
        device,
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as any).error.code).toBe("device_id_required");
    }
    expect(
      (await call(fx, "GET", "/status", { key: fx.ownerCode })).status,
    ).toBe(200);
  });

  it("retries a lost race on the device record", async () => {
    const fx = await shared();
    fx.env.BUCKET.injectConflicts(1);
    expect(
      (
        await call(fx, "GET", "/status", {
          key: fx.editorToken,
          device: newDevice(),
        })
      ).status,
    ).toBe(200);
  });
});

describe("sharing survives other writes", () => {
  it("keeps the record through a delta, a commit and reissue-code", async () => {
    const fx = await shared();
    const sharing = (await readManifest(fx.env, fx.backupId))!.sharing;
    const device = newDevice();
    const ok = async () =>
      expect(
        (await call(fx, "GET", "/status", { key: fx.editorToken, device }))
          .status,
      ).toBe(200);

    const delta = await call(fx, "POST", "/delta", {
      key: fx.ownerCode,
      body: await deltaBody(fx, fx.ownerCode),
    });
    expect(delta.status).toBe(200);
    expect((await readManifest(fx.env, fx.backupId))!.sharing).toEqual(sharing);
    await ok();

    const commit = await call(fx, "POST", "/commit", {
      key: fx.ownerCode,
      body: { vaultTitle: "Vault", bundle: { entities: [{ id: "z" }] } },
    });
    expect(commit.status).toBe(200);
    expect((await readManifest(fx.env, fx.backupId))!.sharing).toEqual(sharing);
    await ok();

    const reissue = await handleCloudBackupReissueCode(
      new Request("https://example.test", {
        method: "POST",
        headers: { Authorization: `Bearer ${ADMIN}` },
      }),
      { ...fx.env, CLOUD_BACKUP_ADMIN_TOKEN: ADMIN },
      fx.backupId,
    );
    expect(reissue.status).toBe(200);
    expect((await readManifest(fx.env, fx.backupId))!.sharing).toEqual(sharing);
    await ok();
  });
});

describe("erasing a shared backup", () => {
  it("removes the device record on owner delete and admin delete", async () => {
    for (const admin of [false, true]) {
      const fx = await shared();
      await call(fx, "GET", "/status", {
        key: fx.editorToken,
        device: newDevice(),
      });
      const prefix = `cloud-backup/${fx.backupId}/`;
      expect(
        (await fx.env.BUCKET.list({ prefix })).objects.map((o: any) => o.key),
      ).toContain(getSharingDevicesKey(fx.backupId));
      if (admin) {
        await handleCloudBackupAdminDelete(
          new Request("https://example.test", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${ADMIN}` },
          }),
          { ...fx.env, CLOUD_BACKUP_ADMIN_TOKEN: ADMIN },
          fx.backupId,
        );
      } else {
        expect(
          (await call(fx, "DELETE", "", { key: fx.ownerCode })).status,
        ).toBe(200);
      }
      expect((await fx.env.BUCKET.list({ prefix })).objects).toHaveLength(0);
    }
  });

  it("does not count the device record as backup size", async () => {
    const fx = await shared();
    const before = (await readManifest(fx.env, fx.backupId))!.manifest;
    await call(fx, "GET", "/status", {
      key: fx.editorToken,
      device: newDevice(),
    });
    const delta = await call(fx, "POST", "/delta", {
      key: fx.ownerCode,
      body: await deltaBody(fx, fx.ownerCode),
    });
    const { manifest } = (await delta.json()) as any;
    expect(manifest.sizeBytes).toBeGreaterThan(0);
    expect(manifest.sizeBytes).toBeLessThan(before.sizeBytes + 500);
    expect(await fx.env.BUCKET.get(getSharingDevicesKey(fx.backupId))).not.toBe(
      null,
    );
  });
});
