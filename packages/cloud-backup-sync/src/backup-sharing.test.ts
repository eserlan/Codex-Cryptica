import { describe, expect, it } from "vitest";
import {
  disableCloudBackupSharing,
  enableCloudBackupSharing,
  formatShareLink,
  replaceCloudBackupSharingLink,
} from "./backup-sharing";
import { disableCloudBackup } from "./backup-lifecycle";
import { getLocalCloudBackupRecord } from "./backup-records";
import { enabled, makeRuntime } from "./test-helpers";

const ORIGIN = "https://app.test";
const OK = {
  ok: true,
  status: 200,
  body: {
    editorToken: "abc123def",
    linkVersion: 2,
    enabledAt: "2026-09-01T00:00:00.000Z",
  },
};
const fail = (status: number, message?: string) => ({
  ok: false,
  status,
  body: message ? { error: { message } } : {},
});

describe("formatShareLink", () => {
  it("puts the token only in the fragment", () => {
    expect(formatShareLink("https://x.test", "b-1", "tok")).toBe(
      "https://x.test/join#b-1:tok",
    );
  });
});

describe("enableCloudBackupSharing", () => {
  it("posts with the owner bearer and stores a token-free marker", async () => {
    const { runtime, calls } = await enabled(OK);
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/sharing",
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers.Authorization).toBe("Bearer code-1");
    expect(result).toEqual({
      ok: true,
      value: {
        link: "https://app.test/join#b-1:abc123def",
        linkVersion: 2,
        enabledAt: "2026-09-01T00:00:00.000Z",
      },
    });
    const record = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(record?.sharing).toEqual({
      linkVersion: 2,
      enabledAt: "2026-09-01T00:00:00.000Z",
    });
    expect(JSON.stringify(await runtime.storage.read("v-1"))).not.toContain(
      "abc123def",
    );
    expect(JSON.stringify(await runtime.storage.read("v-1"))).not.toContain(
      "editorToken",
    );
  });

  it.each([
    ["500", fail(500)],
    ["404", fail(404)],
  ])("leaves the record unchanged on a %s", async (_n, response) => {
    const { runtime } = await enabled(response);
    const before = await runtime.storage.read("v-1");
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(result.ok).toBe(false);
    expect(await runtime.storage.read("v-1")).toEqual(before);
  });

  it("leaves the record unchanged when fetch rejects", async () => {
    const { runtime } = await enabled();
    const before = await runtime.storage.read("v-1");
    runtime.fetch = (async () => {
      throw new Error("offline");
    }) as any;
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(result.ok).toBe(false);
    expect(await runtime.storage.read("v-1")).toEqual(before);
  });

  it("fails on an unreadable success body without writing", async () => {
    const { runtime } = await enabled({ ok: true, status: 200, body: {} });
    const before = await runtime.storage.read("v-1");
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(result.ok).toBe(false);
    expect(await runtime.storage.read("v-1")).toEqual(before);
  });

  it("does not call fetch without a record or when backup is off", async () => {
    const none = makeRuntime();
    expect(
      (await enableCloudBackupSharing(none.runtime, "v-1", ORIGIN)).ok,
    ).toBe(false);
    expect(none.calls).toHaveLength(0);

    const { runtime, calls } = await enabled();
    await disableCloudBackup(runtime, "v-1");
    expect((await enableCloudBackupSharing(runtime, "v-1", ORIGIN)).ok).toBe(
      false,
    );
    expect(calls).toHaveLength(0);
  });

  it("records 'already on' from a 409 and says how to get a new link", async () => {
    const { runtime } = await enabled(fail(409, "Sharing is already on."));
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(!result.ok && result.error).toContain("Replace the link");
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.sharing).toEqual({
      linkVersion: 1,
      enabledAt: "2026-08-31T12:00:00.000Z",
    });
  });

  it("treats other 409 messages as plain failures", async () => {
    const { runtime } = await enabled(
      fail(409, "The backup changed. Try again."),
    );
    const result = await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    expect(!result.ok && result.error).toBe("The backup changed. Try again.");
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.sharing).toBe(
      undefined,
    );
  });
});

describe("replaceCloudBackupSharingLink", () => {
  it("posts to replace-link and updates the record", async () => {
    const { runtime, calls } = await enabled(OK);
    const result = await replaceCloudBackupSharingLink(runtime, "v-1", ORIGIN);
    expect(calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/sharing/replace-link",
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers.Authorization).toBe("Bearer code-1");
    expect(result.ok).toBe(true);
    expect(
      (await getLocalCloudBackupRecord(runtime, "v-1"))?.sharing?.linkVersion,
    ).toBe(2);
  });

  it("removes the marker when the server says sharing is off", async () => {
    const { runtime } = await enabled(OK, fail(409, "Sharing is off."));
    await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    const result = await replaceCloudBackupSharingLink(runtime, "v-1", ORIGIN);
    expect(!result.ok && result.error).toContain("off");
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.sharing).toBe(
      undefined,
    );
  });

  it("keeps the record on a 500", async () => {
    const { runtime } = await enabled(OK, fail(500));
    await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    const before = await runtime.storage.read("v-1");
    expect(
      (await replaceCloudBackupSharingLink(runtime, "v-1", ORIGIN)).ok,
    ).toBe(false);
    expect(await runtime.storage.read("v-1")).toEqual(before);
  });
});

describe("disableCloudBackupSharing", () => {
  it("sends DELETE and removes the marker", async () => {
    const { runtime, calls } = await enabled(OK, {
      ok: true,
      status: 200,
      body: { sharing: false },
    });
    await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    calls.length = 0;
    const result = await disableCloudBackupSharing(runtime, "v-1");
    expect(calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/sharing",
    );
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].init.headers.Authorization).toBe("Bearer code-1");
    expect(result.ok).toBe(true);
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.sharing).toBe(
      undefined,
    );
  });

  it("keeps the marker on a failure", async () => {
    const { runtime } = await enabled(OK, fail(500));
    await enableCloudBackupSharing(runtime, "v-1", ORIGIN);
    const before = await runtime.storage.read("v-1");
    expect((await disableCloudBackupSharing(runtime, "v-1")).ok).toBe(false);
    expect(await runtime.storage.read("v-1")).toEqual(before);
  });
});
