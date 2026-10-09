import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";

const LIST = "/api/template-directory/listings?kind=entity";

async function seed(bucket: Bucket) {
  await seedEntityListing(bucket, {
    id: "a",
    title: "Guild Hall",
    entityType: "location",
    labels: ["Fantasy", "Dark"],
    updated: "2026-03-05T00:00:00.000Z",
    ownerDisplayName: "Ada",
  });
  await seedEntityListing(bucket, {
    id: "b",
    title: "Blood Feud",
    entityType: "Faction",
    labels: ["Fantasy"],
    updated: "2026-03-04T00:00:00.000Z",
  });
  await seedEntityListing(bucket, {
    id: "c",
    title: "Pilot",
    entityType: "faction",
    labels: ["Sci-fi"],
    description: "A starship pilot.",
    updated: "2026-03-03T00:00:00.000Z",
  });
  await seedEntityListing(bucket, {
    id: "hidden",
    status: "unpublished",
    updated: "2026-03-09T00:00:00.000Z",
  });
  await seedEntityListing(bucket, {
    id: "gone",
    suspended: true,
    updated: "2026-03-09T00:00:00.000Z",
  });
}

describe("entity template list", () => {
  it("returns only active, non-suspended entity listings, newest first", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const res = await call(makeEnv(bucket), "GET", LIST);
    expect(res.status).toBe(200);
    const page = await res.json();
    expect(page.results.map((r: any) => r.listingId)).toEqual(["a", "b", "c"]);
    expect(page.results[0].ownerDisplayName).toBe("Ada");
  });

  it("filters by entity type without regard to case", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const page = await (
      await call(makeEnv(bucket), "GET", `${LIST}&entityType=FACTION`)
    ).json();
    expect(page.results.map((r: any) => r.listingId).sort()).toEqual([
      "b",
      "c",
    ]);
  });

  it("requires every requested label", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const page = await (
      await call(makeEnv(bucket), "GET", `${LIST}&labels=Fantasy,Dark`)
    ).json();
    expect(page.results.map((r: any) => r.listingId)).toEqual(["a"]);
  });

  it("searches title, description, entity type and labels", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const ids = async (q: string) =>
      (
        await (
          await call(
            makeEnv(bucket),
            "GET",
            `${LIST}&q=${encodeURIComponent(q)}`,
          )
        ).json()
      ).results.map((r: any) => r.listingId);
    expect(await ids("guild")).toEqual(["a"]);
    expect(await ids("starship")).toEqual(["c"]);
    expect(await ids("faction")).toEqual(["b", "c"]);
    expect(await ids("sci-fi")).toEqual(["c"]);
    expect(await ids("zzz")).toEqual([]);
  });

  it("counts entity types for the filter, merging case and ignoring the type filter", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const page = await (
      await call(makeEnv(bucket), "GET", `${LIST}&entityType=location`)
    ).json();
    expect(page.facets.entityTypes).toEqual(
      expect.arrayContaining([
        { value: "faction", count: 2 },
        { value: "location", count: 1 },
      ]),
    );
    expect(page.facets.entityTypes).toHaveLength(2);
  });

  it("pages with a cursor", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const first = await (
      await call(makeEnv(bucket), "GET", `${LIST}&limit=2`)
    ).json();
    expect(first.results).toHaveLength(2);
    expect(first.nextCursor).toBeDefined();
    const second = await (
      await call(
        makeEnv(bucket),
        "GET",
        `${LIST}&limit=2&cursor=${first.nextCursor}`,
      )
    ).json();
    expect(second.results.map((r: any) => r.listingId)).toEqual(["c"]);
    expect(second.nextCursor).toBeUndefined();
  });

  it("returns an empty page when the index is missing or corrupted", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    bucket.store.delete("templates/index/entity.json");
    expect(
      (await (await call(makeEnv(bucket), "GET", LIST)).json()).results,
    ).toEqual([]);
    await bucket.put("templates/index/entity.json", "{broken");
    const res = await call(makeEnv(bucket), "GET", LIST);
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });

  it("rejects an invalid query", async () => {
    const bucket = new Bucket();
    expect(
      (await call(makeEnv(bucket), "GET", `${LIST}&limit=999`)).status,
    ).toBe(400);
    expect(
      (await call(makeEnv(bucket), "GET", `${LIST}&limit=abc`)).status,
    ).toBe(400);
  });

  it("never exposes tokens, hashes or template text", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    const text = await (await call(makeEnv(bucket), "GET", LIST)).text();
    expect(text).not.toMatch(
      /ownerToken|ownerTokenHash|token-a|Write here|markdown/,
    );
  });

  it("uses at most five bucket operations however many listings exist", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    bucket.resetOps();
    await call(makeEnv(bucket), "GET", `${LIST}&q=guild&entityType=location`);
    expect(bucket.totalOps()).toBeLessThanOrEqual(5);
  });

  it("leaves the stat sheet list untouched and free of entity listings", async () => {
    const bucket = new Bucket();
    await seed(bucket);
    await bucket.put(
      "templates/listings/s1/listing.json",
      JSON.stringify({
        schemaVersion: 1,
        listingId: "s1",
        title: "Stat block",
        description: "Numbers.",
        system: "Homebrew",
        labels: [],
        packageVersion: 1,
        listingCreatedAt: "2026-01-01T00:00:00.000Z",
        listingUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    await bucket.put(
      "templates/listings/s1/package.json",
      JSON.stringify({
        schemaVersion: 1,
        template: {
          name: "Stat block",
          description: "Numbers.",
          system: "Homebrew",
          labels: [],
          fields: [{ id: "hp", label: "HP", type: "counter" }],
        },
      }),
    );
    const stat = await (
      await call(makeEnv(bucket), "GET", "/api/template-directory/listings")
    ).json();
    expect(stat.results.map((r: any) => r.listingId)).toEqual(["s1"]);
    const entity = await (await call(makeEnv(bucket), "GET", LIST)).json();
    expect(entity.results.map((r: any) => r.listingId)).not.toContain("s1");
  });
});
