import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";

const REBUILD = "/api/template-directory/admin/rebuild-index";
const LIST = "/api/template-directory/listings?kind=entity";

describe("rebuild entity template index", () => {
  it("requires the operator token", async () => {
    const env = makeEnv();
    expect((await call(env, "POST", REBUILD)).status).toBe(401);
    expect((await call(env, "POST", REBUILD, { token: "wrong" })).status).toBe(
      401,
    );
  });

  it("restores browse after the index is lost", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, {
      id: "a",
      updated: "2026-03-05T00:00:00.000Z",
    });
    await seedEntityListing(bucket, {
      id: "b",
      updated: "2026-03-04T00:00:00.000Z",
    });
    bucket.store.delete("templates/index/entity.json");
    const env = makeEnv(bucket);
    expect((await (await call(env, "GET", LIST)).json()).results).toEqual([]);
    const res = await call(env, "POST", REBUILD, { token: "admin-secret" });
    expect(res.status).toBe(200);
    expect((await res.json()).processed).toBe(2);
    expect(
      (await (await call(env, "GET", LIST)).json()).results.map(
        (r: any) => r.listingId,
      ),
    ).toEqual(["a", "b"]);
  });

  it("skips unpublished, suspended, stat sheet and malformed listings", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "ok" });
    await seedEntityListing(bucket, { id: "hidden", status: "unpublished" });
    await seedEntityListing(bucket, { id: "gone", suspended: true });
    await bucket.put(
      "templates/listings/stat/listing.json",
      JSON.stringify({
        schemaVersion: 1,
        listingId: "stat",
        title: "S",
        description: "D",
        system: "x",
        labels: [],
        packageVersion: 1,
        listingCreatedAt: "2026-01-01T00:00:00.000Z",
        listingUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    await bucket.put("templates/listings/bad/listing.json", "{oops");
    bucket.store.delete("templates/index/entity.json");
    const env = makeEnv(bucket);
    const res = await call(env, "POST", REBUILD, { token: "admin-secret" });
    expect(res.status).toBe(200);
    expect(
      (await (await call(env, "GET", LIST)).json()).results.map(
        (r: any) => r.listingId,
      ),
    ).toEqual(["ok"]);
  });

  it("works through batches with a cursor", async () => {
    const bucket = new Bucket();
    for (let i = 0; i < 5; i++)
      await seedEntityListing(bucket, {
        id: `l${i}`,
        updated: `2026-03-0${i + 1}T00:00:00.000Z`,
      });
    bucket.store.delete("templates/index/entity.json");
    const env = makeEnv(bucket);
    let cursor: string | undefined;
    let calls = 0;
    do {
      const res = await call(
        env,
        "POST",
        `${REBUILD}?limit=2${cursor ? `&cursor=${cursor}` : ""}`,
        { token: "admin-secret" },
      );
      expect(res.status).toBe(200);
      cursor = (await res.json()).nextCursor;
      calls++;
    } while (cursor && calls < 10);
    expect(calls).toBeGreaterThan(1);
    expect((await (await call(env, "GET", LIST)).json()).results).toHaveLength(
      5,
    );
  });
});
