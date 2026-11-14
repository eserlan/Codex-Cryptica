import { describe, expect, it } from "vitest";
import { formatShareLink, parseShareLinkFragment } from "./backup-sharing";
import { cloudBackupHeaders } from "./request-headers";
import {
  getCloudBackupOwnershipCode,
  listKnownCloudBackups,
} from "./backup-records";
import { fetchCloudBackupChanges } from "./change-feed";
import { pushDeltaToCloudBackup } from "./delta-sync";
import { fetchCloudBackupIndex, getCloudBackupStatus } from "./backup-metadata";
import {
  fetchCloudBackupAsset,
  restoreVaultFromCloudBackup,
} from "./backup-restore";
import { uploadSnapshotAssets } from "./asset-upload";
import { uploadSnapshot } from "./snapshot-upload";
import { isDeviceLimit } from "./backup-response";
import { makeRuntime } from "./test-helpers";

const BACKUP = "11111111-1111-1111-1111-111111111111";
const TOKEN = "ab".repeat(32);
const DEVICE = "device-12345678";

function editorHarness(
  ...responses: { ok: boolean; status: number; body: unknown }[]
) {
  const h = makeRuntime(responses);
  h.runtime.deviceId = () => DEVICE;
  const record = {
    vaultId: "v-1",
    backupId: BACKUP,
    ownerCode: TOKEN,
    role: "editor" as const,
    enabled: true,
    status: "idle" as const,
    lastPushedAt: "2026-08-31T10:00:00.000Z",
    consentedAt: "2026-08-31T10:00:00.000Z",
  };
  void h.runtime.storage.write("v-1", record);
  return { ...h, record };
}

function expectTokenOnlyInAuthorization(calls: { url: string; init?: any }[]) {
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    expect(call.url).not.toContain(TOKEN);
    expect(call.init?.headers?.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(call.init?.headers?.["X-Codex-Device-Id"]).toBe(DEVICE);
    const { Authorization: _auth, ...rest } = call.init?.headers ?? {};
    expect(JSON.stringify(rest)).not.toContain(TOKEN);
    if (typeof call.init?.body === "string") {
      expect(call.init.body).not.toContain(TOKEN);
    }
  }
}

describe("parseShareLinkFragment", () => {
  it("reads a link fragment with or without the hash", () => {
    expect(parseShareLinkFragment(`#${BACKUP}:${TOKEN}`)).toEqual({
      backupId: BACKUP,
      editorToken: TOKEN,
    });
    expect(parseShareLinkFragment(`${BACKUP}:${TOKEN}`)).toEqual({
      backupId: BACKUP,
      editorToken: TOKEN,
    });
  });

  it("lowercases the token", () => {
    expect(
      parseShareLinkFragment(`${BACKUP}:${TOKEN.toUpperCase()}`)?.editorToken,
    ).toBe(TOKEN);
  });

  it("round-trips with formatShareLink", () => {
    const link = formatShareLink("https://x.test", BACKUP, TOKEN);
    expect(parseShareLinkFragment(new URL(link).hash)).toEqual({
      backupId: BACKUP,
      editorToken: TOKEN,
    });
  });

  it.each([
    "",
    "#",
    "nonsense",
    "a:b:c",
    `${BACKUP}:${TOKEN}:extra`,
    ` ${BACKUP}:${TOKEN}`,
    `${BACKUP}: ${TOKEN}`,
    `${BACKUP}:${TOKEN} `,
    `${BACKUP}:short`,
    `short:${TOKEN}`,
    `${BACKUP}:${"z".repeat(32)}`,
    `${BACKUP}`,
  ])("rejects %j", (input) => {
    expect(parseShareLinkFragment(input)).toBeNull();
  });
});

describe("cloudBackupHeaders", () => {
  const runtime = { deviceId: () => DEVICE } as never;

  it("gives an owner only the Authorization header", () => {
    expect(
      cloudBackupHeaders(runtime, { backupId: BACKUP, ownerCode: "code" }),
    ).toEqual({ Authorization: "Bearer code" });
    expect(
      cloudBackupHeaders(runtime, {
        backupId: BACKUP,
        ownerCode: "code",
        role: "owner",
      }),
    ).toEqual({ Authorization: "Bearer code" });
  });

  it("gives an editor the device header too", () => {
    expect(
      cloudBackupHeaders(
        runtime,
        { backupId: BACKUP, ownerCode: TOKEN, role: "editor" },
        { "Content-Type": "application/json" },
      ),
    ).toEqual({
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "X-Codex-Device-Id": DEVICE,
    });
  });
});

describe("editor requests", () => {
  const ok = (body: unknown = {}) => ({ ok: true, status: 200, body });

  it("keep the token in Authorization only, with the device id", async () => {
    const h = editorHarness(
      ok({ status: "idle", lastPushedAt: null, sizeBytes: 1 }),
      ok({ entityHashes: {} }),
      ok({ status: "resync", revision: 1 }),
      ok({ manifest: { lastPushedAt: "2026-09-01T00:00:00.000Z" } }),
      ok({ manifest: {}, bundle: {} }),
      ok(),
      ok(),
      ok({ manifest: { lastPushedAt: "2026-09-01T00:00:00.000Z" } }),
    );
    const { runtime, record } = h;
    await getCloudBackupStatus(runtime, "v-1");
    await fetchCloudBackupIndex(runtime, "v-1");
    await fetchCloudBackupChanges(runtime, "v-1");
    await pushDeltaToCloudBackup(
      runtime,
      "v-1",
      { vaultTitle: "T", upserts: [], deletes: [], assetIds: [] },
      "base",
    );
    await restoreVaultFromCloudBackup(runtime, record);
    await fetchCloudBackupAsset(runtime, record, "asset-1");
    await uploadSnapshotAssets(runtime, record, [
      { assetId: "a", bytes: new Uint8Array([1]), mimeType: "image/png" },
    ]);
    await uploadSnapshot(runtime, record, { vaultTitle: "T", bundle: {} });
    expectTokenOnlyInAuthorization(h.calls);
  });

  it("read a 404 as link gone from delta and from the change feed", async () => {
    const h = editorHarness(
      { ok: false, status: 404, body: { error: { message: "Not found" } } },
      { ok: false, status: 404, body: null },
    );
    const delta = await pushDeltaToCloudBackup(
      h.runtime,
      "v-1",
      { vaultTitle: "T", upserts: [], deletes: [], assetIds: [] },
      "base",
    );
    expect(delta).toMatchObject({ ok: false, linkGone: true, status: 404 });
    expect(delta).not.toHaveProperty("fullPushRequired");
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "linkGone",
    });
  });

  it("read a 404 as link gone from status, index and bundle but not an asset", async () => {
    const h = editorHarness(
      { ok: false, status: 404, body: null },
      { ok: false, status: 404, body: null },
      { ok: false, status: 404, body: null },
      { ok: false, status: 404, body: null },
    );
    expect(await getCloudBackupStatus(h.runtime, "v-1")).toMatchObject({
      linkGone: true,
    });
    expect(await fetchCloudBackupIndex(h.runtime, "v-1")).toMatchObject({
      linkGone: true,
    });
    expect(
      await restoreVaultFromCloudBackup(h.runtime, h.record),
    ).toMatchObject({ linkGone: true });
    expect(
      await fetchCloudBackupAsset(h.runtime, h.record, "a"),
    ).not.toHaveProperty("linkGone");
  });
});

describe("owner 404 handling is unchanged", () => {
  it("still asks for a full push and reports the feed as unsupported", async () => {
    const h = makeRuntime();
    await h.runtime.storage.write("v-1", {
      vaultId: "v-1",
      backupId: BACKUP,
      ownerCode: "code",
      enabled: true,
      status: "idle",
      lastPushedAt: null,
      consentedAt: "x",
    });
    const queue = [
      { ok: false, status: 404, body: null },
      { ok: false, status: 404, body: null },
    ];
    h.runtime.fetch = (async () => {
      const next = queue.shift()!;
      return {
        ...next,
        json: async () => next.body,
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }) as never;
    expect(
      await pushDeltaToCloudBackup(
        h.runtime,
        "v-1",
        { vaultTitle: "T", upserts: [], deletes: [], assetIds: [] },
        "base",
      ),
    ).toMatchObject({ fullPushRequired: true });
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
  });
});

describe("editor records are not recovery keys", () => {
  it("are skipped by the known backups list and the ownership code", async () => {
    const h = editorHarness();
    expect(await listKnownCloudBackups(h.runtime)).toEqual([]);
    expect(await getCloudBackupOwnershipCode(h.runtime, "v-1")).toBeNull();
  });
});

describe("device limit", () => {
  it("is recognised from the worker's status and code", async () => {
    const h = editorHarness({
      ok: false,
      status: 403,
      body: { error: { code: "device_limit", message: "Too many devices." } },
    });
    const out = await getCloudBackupStatus(h.runtime, "v-1");
    expect(out).toMatchObject({
      ok: false,
      status: 403,
      code: "device_limit",
      error: "Too many devices.",
    });
    expect(isDeviceLimit(out as never)).toBe(true);
    expect(isDeviceLimit({ status: 403, code: "other" })).toBe(false);
    expect(isDeviceLimit({ status: 404, code: "device_limit" })).toBe(false);
  });
});
