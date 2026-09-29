import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";

const L = (id: string) => `/api/template-directory/listings/${id}`;

describe("entity template detail and package", () => {
  it("returns the listing with the note preview", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, {
      id: "a",
      markdown: "## Rooms\n\nBig.\n",
    });
    const res = await call(makeEnv(bucket), "GET", L("a"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      listingId: "a",
      templateKind: "entity",
      previewMarkdown: "## Rooms\n\nBig.\n",
    });
    expect(JSON.stringify(body)).not.toMatch(/ownerToken/);
  });

  it("returns the public package for an active listing", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a", markdown: "## Rooms\n" });
    const res = await call(makeEnv(bucket), "GET", `${L("a")}/package`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      kind: "entity-template",
      formatVersion: 1,
      template: {
        name: "Template a",
        entityType: "location",
        markdown: "## Rooms\n",
      },
    });
  });

  it.each([
    ["unpublished", { status: "unpublished" as const }],
    ["suspended", { suspended: true }],
  ])("hides a %s listing", async (_label, patch) => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a", ...patch });
    expect((await call(makeEnv(bucket), "GET", L("a"))).status).toBe(404);
    expect(
      (await call(makeEnv(bucket), "GET", `${L("a")}/package`)).status,
    ).toBe(404);
  });

  it("returns 404 for a missing listing", async () => {
    const env = makeEnv();
    expect((await call(env, "GET", L("nope"))).status).toBe(404);
    expect((await call(env, "GET", `${L("nope")}/package`)).status).toBe(404);
  });

  it("returns 422 for a stored package that fails validation", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    await bucket.put(
      "templates/listings/a/package.json",
      JSON.stringify({
        kind: "entity-template",
        formatVersion: 1,
        template: { name: "x", entityType: "y", markdown: "" },
      }),
    );
    expect(
      (await call(makeEnv(bucket), "GET", `${L("a")}/package`)).status,
    ).toBe(422);
  });

  it("still serves a stat sheet listing through the same route", async () => {
    const bucket = new Bucket();
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
    const res = await call(makeEnv(bucket), "GET", L("s1"));
    expect(res.status).toBe(200);
    expect((await res.json()).listingId).toBe("s1");
    expect(
      (await call(makeEnv(bucket), "GET", `${L("s1")}/package`)).status,
    ).toBe(200);
  });
});
