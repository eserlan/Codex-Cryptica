import { describe, expect, it } from "vitest";
import type { EntityTemplateListing } from "schema";
import {
  ENTITY_INDEX_KEY,
  readEntityIndex,
  removeEntityIndexEntry,
  toIndexEntry,
  upsertEntityIndexEntry,
} from "../template-directory-index";
import { Bucket } from "./r2-memory-bucket";

const listing = (
  id: string,
  updated: string,
  extra: Partial<EntityTemplateListing> = {},
): EntityTemplateListing => ({
  schemaVersion: 1,
  templateKind: "entity",
  listingId: id,
  title: `Template ${id}`,
  description: "A description.",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: updated,
  ...extra,
});

const env = (bucket = new Bucket()) => ({ BUCKET: bucket });

describe("entity template summary index", () => {
  it("reads a missing index as empty", async () => {
    const r = await readEntityIndex(env());
    expect(r.entries).toEqual([]);
  });

  it("adds, replaces by id and keeps newest-updated first", async () => {
    const e = env();
    await upsertEntityIndexEntry(e, listing("a", "2026-02-01T00:00:00.000Z"));
    await upsertEntityIndexEntry(e, listing("b", "2026-03-01T00:00:00.000Z"));
    await upsertEntityIndexEntry(
      e,
      listing("a", "2026-04-01T00:00:00.000Z", { title: "Renamed" }),
    );
    const { entries } = await readEntityIndex(e);
    expect(entries.map((x) => x.listingId)).toEqual(["a", "b"]);
    expect(entries[0].title).toBe("Renamed");
  });

  it("removes an entry and is idempotent", async () => {
    const e = env();
    await upsertEntityIndexEntry(e, listing("a", "2026-02-01T00:00:00.000Z"));
    await removeEntityIndexEntry(e, "a");
    await removeEntityIndexEntry(e, "a");
    await removeEntityIndexEntry(e, "never-there");
    expect((await readEntityIndex(e)).entries).toEqual([]);
  });

  it("retries after a write conflict and still lands both writes", async () => {
    const bucket = new Bucket();
    const e = env(bucket);
    await upsertEntityIndexEntry(e, listing("a", "2026-02-01T00:00:00.000Z"));
    bucket.injectConflicts(2);
    await upsertEntityIndexEntry(e, listing("b", "2026-03-01T00:00:00.000Z"));
    expect(
      (await readEntityIndex(e)).entries.map((x) => x.listingId).sort(),
    ).toEqual(["a", "b"]);
  });

  it("gives up after bounded retries instead of looping", async () => {
    const bucket = new Bucket();
    const e = env(bucket);
    await upsertEntityIndexEntry(e, listing("a", "2026-02-01T00:00:00.000Z"));
    bucket.injectConflicts(50);
    await expect(
      upsertEntityIndexEntry(e, listing("b", "2026-03-01T00:00:00.000Z")),
    ).rejects.toThrow(/index/i);
  });

  it("two concurrent first writes both survive", async () => {
    const e = env();
    await Promise.all([
      upsertEntityIndexEntry(e, listing("a", "2026-02-01T00:00:00.000Z")),
      upsertEntityIndexEntry(e, listing("b", "2026-03-01T00:00:00.000Z")),
    ]);
    expect((await readEntityIndex(e)).entries).toHaveLength(2);
  });

  it("reads a corrupted or schema-invalid index as empty and does not overwrite it", async () => {
    const bucket = new Bucket();
    await bucket.put(ENTITY_INDEX_KEY, "{not json");
    const before = bucket.ops.put;
    expect((await readEntityIndex(env(bucket))).entries).toEqual([]);
    expect(bucket.ops.put).toBe(before);

    await bucket.put(
      ENTITY_INDEX_KEY,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        entries: [{ nope: true }],
      }),
    );
    expect((await readEntityIndex(env(bucket))).entries).toEqual([]);
  });

  it("starts a fresh index when writing over a corrupted one", async () => {
    const bucket = new Bucket();
    await bucket.put(ENTITY_INDEX_KEY, "garbage");
    await upsertEntityIndexEntry(
      env(bucket),
      listing("a", "2026-02-01T00:00:00.000Z"),
    );
    expect(
      (await readEntityIndex(env(bucket))).entries.map((x) => x.listingId),
    ).toEqual(["a"]);
  });

  it("never stores a token, hash or template text, and drops non-active listings", async () => {
    const e = env();
    const dirty = {
      ...listing("a", "2026-02-01T00:00:00.000Z"),
      ownerToken: "t",
      ownerTokenHash: "h",
      markdown: "## x",
    } as any;
    await upsertEntityIndexEntry(e, dirty);
    const raw = (await (e.BUCKET as Bucket).get(ENTITY_INDEX_KEY))!;
    const text = await raw.text();
    expect(text).not.toMatch(/ownerToken|markdown|## x/);
    await upsertEntityIndexEntry(
      e,
      listing("b", "2026-03-01T00:00:00.000Z", { status: "unpublished" }),
    );
    expect((await readEntityIndex(e)).entries.map((x) => x.listingId)).toEqual([
      "a",
    ]);
  });

  it("stays small at 1,000 entries and each operation uses at most three bucket calls", async () => {
    const bucket = new Bucket();
    const entries = Array.from({ length: 1000 }, (_, i) =>
      toIndexEntry(
        listing(`id-${i}`, new Date(2026, 0, 1, 0, 0, i).toISOString()),
      ),
    );
    await bucket.put(
      ENTITY_INDEX_KEY,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        entries,
      }),
    );
    expect(
      (await bucket.get(ENTITY_INDEX_KEY))!.body.toString().length,
    ).toBeLessThan(1_000_000);

    bucket.resetOps();
    await upsertEntityIndexEntry(
      env(bucket),
      listing("new", "2027-01-01T00:00:00.000Z"),
    );
    expect(bucket.totalOps()).toBeLessThanOrEqual(3);
    bucket.resetOps();
    await readEntityIndex(env(bucket));
    expect(bucket.totalOps()).toBeLessThanOrEqual(1);
  });
});
