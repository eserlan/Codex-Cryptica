import { describe, expect, it } from "vitest";
import {
  buildFeedMergeSides,
  fetchCloudBackupChanges,
  storePulledCloudBackupRecord,
} from "./change-feed";
import { getLocalCloudBackupRecord } from "./backup-records";
import { mergeEntities } from "./merge";
import { enabled } from "./test-helpers";

const TOMB = {
  id: "gone",
  rev: 3,
  deletedBy: "owner",
  deletedAt: "2026-09-01T00:00:00.000Z",
  title: "Gone",
};

describe("fetchCloudBackupChanges", () => {
  it("parses a changes answer and sends since from the record", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: {
        status: "changes",
        revision: 4,
        entities: [{ entity: { id: "a", title: "A", extra: 1 } }],
        tombstones: [TOMB],
      },
    });
    const out = await fetchCloudBackupChanges(h.runtime, "v-1");
    expect(out).toMatchObject({
      kind: "changes",
      revision: 4,
      entities: [{ id: "a", title: "A", extra: 1 }],
      tombstones: [{ id: "gone" }],
    });
    expect(h.calls[0].url).toBe(
      "https://worker.test/api/cloud-backup/b-1/changes?since=0",
    );
    expect(h.calls[0].init.headers.Authorization).toBe("Bearer code-1");
  });

  it("sends the stored revision as since", async () => {
    const h = await enabled();
    const record = await getLocalCloudBackupRecord(h.runtime, "v-1");
    await h.runtime.storage.write("v-1", { ...record, revision: 7 });
    await fetchCloudBackupChanges(h.runtime, "v-1");
    expect(h.calls[0].url).toContain("changes?since=7");
  });

  it("parses resync", async () => {
    const h = await enabled({
      ok: true,
      status: 200,
      body: { status: "resync", revision: 9 },
    });
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "resync",
      revision: 9,
    });
  });

  it("reports a 404 and a malformed body as unsupported", async () => {
    const h = await enabled(
      { ok: false, status: 404, body: {} },
      { ok: true, status: 200, body: { status: "changes", revision: -1 } },
    );
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "unsupported",
    });
  });

  it("reports other statuses and network errors as failures", async () => {
    const h = await enabled({ ok: false, status: 500, body: {} });
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toMatchObject({
      kind: "failed",
    });
    h.runtime.fetch = (async () => {
      throw new Error("offline");
    }) as never;
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "failed",
      error: "offline",
    });
  });

  it("does nothing without an enabled record", async () => {
    const h = await enabled();
    await h.runtime.storage.clear("v-1");
    expect(await fetchCloudBackupChanges(h.runtime, "v-1")).toEqual({
      kind: "off",
    });
    expect(h.calls).toEqual([]);
  });
});

describe("buildFeedMergeSides", () => {
  const e = (id: string, title = id) => ({ id, title });

  it("holds only feed ids, so a local entity outside the feed survives", () => {
    const sides = buildFeedMergeSides({
      entities: [e("a", "A2")],
      tombstones: [],
      mine: { a: e("a"), local: e("local") },
      base: { a: e("a"), local: e("local") },
    });
    expect(Object.keys(sides.mine)).toEqual(["a"]);
    expect(Object.keys(sides.base)).toEqual(["a"]);
    const result = mergeEntities(sides, {
      copyAuthorName: "x",
      newId: () => "n",
    });
    expect(result.deletes).toEqual([]);
    expect(result.entities.a.title).toBe("A2");
  });

  it("makes a tombstone theirs: null", () => {
    const sides = buildFeedMergeSides({
      entities: [],
      tombstones: [{ id: "gone" }],
      mine: { gone: e("gone") },
      base: { gone: e("gone") },
    });
    expect(sides.theirs).toEqual({ gone: null });
    expect(
      mergeEntities(sides, { copyAuthorName: "x", newId: () => "n" }).deletes,
    ).toEqual(["gone"]);
  });

  it("keeps mine and base whole for a resync", () => {
    const sides = buildFeedMergeSides({
      entities: [e("a")],
      tombstones: [],
      mine: { a: e("a"), fresh: e("fresh"), old: e("old") },
      base: { a: e("a"), old: e("old") },
      resync: true,
    });
    const result = mergeEntities(sides, {
      copyAuthorName: "x",
      newId: () => "n",
    });
    expect(result.entities.fresh).toBeDefined();
    expect(result.deletes).toEqual(["old"]);
  });
});

describe("storePulledCloudBackupRecord", () => {
  it("stores revision and lastPushedAt and flags a higher revision", async () => {
    const h = await enabled();
    await storePulledCloudBackupRecord(h.runtime, "v-1", {
      revision: 3,
      lastPushedAt: "2026-09-02T00:00:00.000Z",
    });
    expect(await getLocalCloudBackupRecord(h.runtime, "v-1")).toMatchObject({
      revision: 3,
      lastPushedAt: "2026-09-02T00:00:00.000Z",
      foreignCommitSeen: true,
    });
  });

  it("does not flag an unchanged revision and keeps an existing flag", async () => {
    const h = await enabled();
    const record = await getLocalCloudBackupRecord(h.runtime, "v-1");
    await h.runtime.storage.write("v-1", { ...record, revision: 5 });
    await storePulledCloudBackupRecord(h.runtime, "v-1", {
      revision: 5,
      lastPushedAt: "t",
    });
    expect(
      (await getLocalCloudBackupRecord(h.runtime, "v-1"))?.foreignCommitSeen,
    ).toBeUndefined();
    await storePulledCloudBackupRecord(h.runtime, "v-1", {
      revision: 6,
      lastPushedAt: "t",
    });
    await storePulledCloudBackupRecord(h.runtime, "v-1", {
      revision: 6,
      lastPushedAt: "t",
    });
    expect(
      (await getLocalCloudBackupRecord(h.runtime, "v-1"))?.foreignCommitSeen,
    ).toBe(true);
  });
});
