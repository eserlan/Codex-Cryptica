import { describe, expect, it, vi } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";
import { readEntityIndex } from "../template-directory-index";

const L = "/api/template-directory/listings";
const report = (id: string) => `${L}/${id}/report`;
const ip = (addr: string) => ({ "CF-Connecting-IP": addr });
const withKey = (bucket: Bucket, extra: Record<string, unknown> = {}) =>
  makeEnv(bucket, { TEMPLATE_REPORT_HASH_KEY: "hash-key-1", ...extra });

const keysUnder = (bucket: Bucket, prefix: string) =>
  [...bucket.store.keys()].filter((k) => k.startsWith(prefix));

describe("reporting an entity template", () => {
  it("stores the report, a de-duplication marker and a daily quota count", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const res = await call(withKey(bucket), "POST", report("a"), {
      body: { reason: "spam", details: "Looks fake" },
      headers: ip("1.1.1.1"),
    });
    expect(res.status).toBe(201);
    const reports = keysUnder(bucket, "moderation/template-reports/a/");
    expect(reports).toHaveLength(1);
    expect(
      JSON.parse(String(bucket.store.get(reports[0])!.body)),
    ).toMatchObject({ listingId: "a", reason: "spam", details: "Looks fake" });
    expect(
      keysUnder(bucket, "moderation/template-report-index/a/"),
    ).toHaveLength(1);
    const quota = keysUnder(bucket, "moderation/template-report-quota/");
    expect(quota).toHaveLength(1);
    expect(JSON.parse(String(bucket.store.get(quota[0])!.body)).count).toBe(1);
  });

  it("rejects a second report from the same address for the same listing and stores nothing new", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const env = withKey(bucket);
    await call(env, "POST", report("a"), {
      body: { reason: "spam" },
      headers: ip("1.1.1.1"),
    });
    const again = await call(env, "POST", report("a"), {
      body: { reason: "other" },
      headers: ip("1.1.1.1"),
    });
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("already_reported");
    expect(keysUnder(bucket, "moderation/template-reports/a/")).toHaveLength(1);
  });

  it("lets the same address report a different listing, and a different address the same listing", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    await seedEntityListing(bucket, { id: "b" });
    const env = withKey(bucket);
    expect(
      (
        await call(env, "POST", report("a"), {
          body: { reason: "spam" },
          headers: ip("1.1.1.1"),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call(env, "POST", report("b"), {
          body: { reason: "spam" },
          headers: ip("1.1.1.1"),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call(env, "POST", report("a"), {
          body: { reason: "spam" },
          headers: ip("2.2.2.2"),
        })
      ).status,
    ).toBe(201);
  });

  it("hashes the address with the keyed secret and never stores the raw address", async () => {
    const one = new Bucket();
    const two = new Bucket();
    for (const [bucket, key] of [
      [one, "key-A"],
      [two, "key-B"],
    ] as const) {
      await seedEntityListing(bucket, { id: "a" });
      await call(
        makeEnv(bucket, { TEMPLATE_REPORT_HASH_KEY: key }),
        "POST",
        report("a"),
        { body: { reason: "spam" }, headers: ip("9.9.9.9") },
      );
    }
    const marker = (b: Bucket) =>
      keysUnder(b, "moderation/template-report-index/a/")[0].split("/").pop();
    expect(marker(one)).not.toBe(marker(two));
    const everything = [...one.store.entries()]
      .map(([k, v]) => `${k}\n${String(v.body)}`)
      .join("\n");
    expect(everything).not.toContain("9.9.9.9");
    // Same key and address always give the same marker.
    const again = new Bucket();
    await seedEntityListing(again, { id: "a" });
    await call(
      makeEnv(again, { TEMPLATE_REPORT_HASH_KEY: "key-A" }),
      "POST",
      report("a"),
      { body: { reason: "spam" }, headers: ip("9.9.9.9") },
    );
    expect(marker(again)).toBe(marker(one));
  });

  it("answers 503 and stores nothing when the hash key is not configured", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const res = await call(makeEnv(bucket), "POST", report("a"), {
      body: { reason: "spam" },
      headers: ip("1.1.1.1"),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("reporting_unavailable");
    expect(keysUnder(bucket, "moderation/")).toHaveLength(0);
  });

  it("caps an address at 20 reports a day, even without the platform limiter", async () => {
    const bucket = new Bucket();
    const env = withKey(bucket);
    for (let i = 0; i < 21; i++)
      await seedEntityListing(bucket, { id: `l${i}` });
    for (let i = 0; i < 20; i++) {
      expect(
        (
          await call(env, "POST", report(`l${i}`), {
            body: { reason: "spam" },
            headers: ip("3.3.3.3"),
          })
        ).status,
      ).toBe(201);
    }
    const over = await call(env, "POST", report("l20"), {
      body: { reason: "spam" },
      headers: ip("3.3.3.3"),
    });
    expect(over.status).toBe(429);
    expect((await over.json()).error.code).toBe("rate_limited");
    expect(keysUnder(bucket, "moderation/template-reports/l20/")).toHaveLength(
      0,
    );
    expect(
      (
        await call(env, "POST", report("l20"), {
          body: { reason: "spam" },
          headers: ip("4.4.4.4"),
        })
      ).status,
    ).toBe(201);
  });

  it("returns 429 and stores nothing when the per-minute limiter is exhausted", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const limit = vi.fn(async () => ({ success: false }));
    const res = await call(
      withKey(bucket, { TEMPLATE_REPORT_RATE_LIMITER: { limit } }),
      "POST",
      report("a"),
      {
        body: { reason: "spam" },
        headers: ip("1.1.1.1"),
      },
    );
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledTimes(1);
    expect(keysUnder(bucket, "moderation/")).toHaveLength(0);
  });

  it("accepts the report when the limiter allows it", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const limit = vi.fn(async () => ({ success: true }));
    const res = await call(
      withKey(bucket, { TEMPLATE_REPORT_RATE_LIMITER: { limit } }),
      "POST",
      report("a"),
      {
        body: { reason: "spam" },
        headers: ip("1.1.1.1"),
      },
    );
    expect(res.status).toBe(201);
  });

  it.each([
    ["an unknown reason", { reason: "rude" }],
    ["no reason", {}],
    ["over-long details", { reason: "spam", details: "d".repeat(2001) }],
  ])("rejects %s with 400 and stores nothing", async (_l, body) => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const res = await call(withKey(bucket), "POST", report("a"), {
      body,
      headers: ip("1.1.1.1"),
    });
    expect(res.status).toBe(400);
    expect(keysUnder(bucket, "moderation/")).toHaveLength(0);
  });

  it.each([
    ["a missing listing", async (_b: Bucket) => "nope"],
    [
      "an unpublished listing",
      async (b: Bucket) => (
        await seedEntityListing(b, { id: "u", status: "unpublished" }),
        "u"
      ),
    ],
    [
      "a suspended listing",
      async (b: Bucket) => (
        await seedEntityListing(b, { id: "s", suspended: true }),
        "s"
      ),
    ],
  ])("answers 404 for %s", async (_l, prepare) => {
    const bucket = new Bucket();
    const id = await prepare(bucket);
    const res = await call(withKey(bucket), "POST", report(id), {
      body: { reason: "spam" },
      headers: ip("1.1.1.1"),
    });
    expect(res.status).toBe(404);
    expect(keysUnder(bucket, "moderation/template-reports/")).toHaveLength(0);
  });

  it("leaves stat sheet reports on their own handler", async () => {
    const bucket = new Bucket();
    await bucket.put(
      "templates/listings/s1/listing.json",
      JSON.stringify({
        schemaVersion: 1,
        listingId: "s1",
        title: "Stat",
        description: "d",
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
          name: "Stat",
          description: "d",
          system: "Homebrew",
          labels: [],
          fields: [{ id: "hp", label: "HP", type: "counter" }],
        },
      }),
    );
    const res = await call(makeEnv(bucket), "POST", report("s1"), {
      body: { reason: "free text reason" },
    });
    expect(res.status).toBe(201);
    expect(keysUnder(bucket, "moderation/template-reports/")[0]).toMatch(
      /^moderation\/template-reports\/[^/]+\.json$/,
    );
  });
});

describe("operator report review", () => {
  const ADMIN = "/api/template-directory/admin/reports";

  it("requires the operator token", async () => {
    const env = withKey(new Bucket());
    expect((await call(env, "GET", `${ADMIN}?listingId=a`)).status).toBe(401);
    expect(
      (await call(env, "GET", `${ADMIN}?listingId=a`, { token: "wrong" }))
        .status,
    ).toBe(401);
  });

  it("returns the count and each reason and detail, never reporter hashes", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const env = withKey(bucket);
    await call(env, "POST", report("a"), {
      body: { reason: "spam", details: "One" },
      headers: ip("1.1.1.1"),
    });
    await call(env, "POST", report("a"), {
      body: { reason: "inappropriate" },
      headers: ip("2.2.2.2"),
    });
    const res = await call(env, "GET", `${ADMIN}?listingId=a`, {
      token: "admin-secret",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.reports.map((r: any) => r.reason).sort()).toEqual([
      "inappropriate",
      "spam",
    ]);
    expect(body.reports.find((r: any) => r.reason === "spam").details).toBe(
      "One",
    );
    const text = JSON.stringify(body);
    const hashes = keysUnder(bucket, "moderation/template-report-index/a/").map(
      (k) => k.split("/").pop()!,
    );
    for (const h of hashes) expect(text).not.toContain(h);
    expect(text).not.toMatch(/1\.1\.1\.1|2\.2\.2\.2/);
  });

  it("requires a listing id and reports zero for none", async () => {
    const env = withKey(new Bucket());
    expect(
      (await call(env, "GET", ADMIN, { token: "admin-secret" })).status,
    ).toBe(400);
    const none = await (
      await call(env, "GET", `${ADMIN}?listingId=a`, { token: "admin-secret" })
    ).json();
    expect(none).toEqual({ listingId: "a", count: 0, reports: [] });
  });

  it("still returns reports for a listing the owner deleted or the operator removed", async () => {
    const bucket = new Bucket();
    await seedEntityListing(bucket, { id: "a" });
    const env = withKey(bucket);
    await call(env, "POST", report("a"), {
      body: { reason: "spam" },
      headers: ip("1.1.1.1"),
    });
    await call(env, "POST", "/api/template-directory/admin/suspensions", {
      token: "admin-secret",
      body: { publishId: "a", mode: "delist" },
    });
    const body = await (
      await call(env, "GET", `${ADMIN}?listingId=a`, { token: "admin-secret" })
    ).json();
    expect(body.count).toBe(1);
    expect((await readEntityIndex({ BUCKET: bucket })).entries).toEqual([]);
  });
});
