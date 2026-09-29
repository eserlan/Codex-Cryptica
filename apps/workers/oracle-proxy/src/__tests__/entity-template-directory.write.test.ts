import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";
import { readEntityIndex } from "../template-directory-index";
import { hashOwnerToken } from "../template-directory-shared";

const LISTINGS = "/api/template-directory/listings";
const LIST = `${LISTINGS}?kind=entity`;

const pkg = (over: Record<string, unknown> = {}) => ({
  kind: "entity-template",
  formatVersion: 1,
  template: {
    name: "Guild Hall",
    entityType: "Location",
    markdown: "\n## Rooms\r\n\r\nBig.  \n",
    ...over,
  },
});
const metadata = (over: Record<string, unknown> = {}) => ({
  description: "A place for guilds.",
  labels: ["Fantasy", "Pathfinder"],
  ownerDisplayName: "Ada",
  rightsAcknowledged: true,
  ...over,
});

async function publish(
  env: any,
  body: unknown = { package: pkg(), metadata: metadata() },
) {
  const res = await call(env, "POST", LISTINGS, { body });
  return {
    res,
    json:
      res.status < 300
        ? await res.clone().json()
        : await res
            .clone()
            .json()
            .catch(() => null),
  };
}

async function indexIds(bucket: Bucket) {
  return (await readEntityIndex({ BUCKET: bucket })).entries
    .map((e) => e.listingId)
    .sort();
}

describe("publishing an entity template", () => {
  it("creates a listing, returns the owner token once, and indexes it", async () => {
    const bucket = new Bucket();
    const env = makeEnv(bucket);
    const { res, json } = await publish(env);
    expect(res.status).toBe(201);
    expect(json.ownerToken).toMatch(/\S{8,}/);
    expect(json.listing).toMatchObject({
      templateKind: "entity",
      title: "Guild Hall",
      entityType: "location",
      labels: ["Fantasy", "Pathfinder"],
      ownerDisplayName: "Ada",
      status: "active",
    });
    expect(await indexIds(bucket)).toEqual([json.listing.listingId]);

    const list = await (await call(env, "GET", LIST)).json();
    expect(list.results[0].listingId).toBe(json.listing.listingId);
  });

  it("stores only the token hash, never the token, and exposes neither publicly", async () => {
    const bucket = new Bucket();
    const env = makeEnv(bucket);
    const { json } = await publish(env);
    const id = json.listing.listingId;
    const head = await bucket.head(`templates/listings/${id}/listing.json`);
    expect(head!.customMetadata!.ownerTokenHash).toBe(
      await hashOwnerToken(json.ownerToken),
    );
    const everything = [...bucket.store.values()]
      .map((v) => String(v.body))
      .join("\n");
    expect(everything).not.toContain(json.ownerToken);
    const detail = await (await call(env, "GET", `${LISTINGS}/${id}`)).text();
    expect(detail).not.toMatch(/ownerToken/);
  });

  it("stores the template text unchanged and drops unknown package fields", async () => {
    const bucket = new Bucket();
    const env = makeEnv(bucket);
    const { json } = await publish(env, {
      package: {
        ...pkg(),
        id: "local-1",
        template: { ...pkg().template, fields: [1], secret: "s" },
      },
      metadata: metadata(),
    });
    const stored = JSON.parse(
      String(
        bucket.store.get(
          `templates/listings/${json.listing.listingId}/package.json`,
        )!.body,
      ),
    );
    expect(stored).toEqual({
      kind: "entity-template",
      formatVersion: 1,
      template: {
        name: "Guild Hall",
        entityType: "location",
        markdown: "\n## Rooms\r\n\r\nBig.  \n",
      },
    });
  });

  it.each([
    [
      "missing acknowledgment",
      { package: pkg(), metadata: metadata({ rightsAcknowledged: false }) },
    ],
    ["an empty body", { package: pkg({ markdown: "" }), metadata: metadata() }],
    ["no labels", { package: pkg(), metadata: metadata({ labels: [] }) }],
    [
      "too many labels",
      {
        package: pkg(),
        metadata: metadata({
          labels: Array.from({ length: 9 }, (_, i) => `l${i}`),
        }),
      },
    ],
    [
      "a missing description",
      { package: pkg(), metadata: metadata({ description: "" }) },
    ],
    [
      "a newer format version",
      { package: { ...pkg(), formatVersion: 5 }, metadata: metadata() },
    ],
  ])("rejects %s and stores nothing", async (_label, body) => {
    const bucket = new Bucket();
    const { res } = await publish(makeEnv(bucket), body);
    expect(res.status).toBe(400);
    expect(bucket.store.size).toBe(0);
  });

  it("rolls back when the index cannot be updated", async () => {
    const bucket = new Bucket();
    // Pre-seed an index so the write is conditional and can conflict.
    await seedEntityListing(bucket, { id: "existing" });
    bucket.injectConflicts(50);
    const before = bucket.store.size;
    const { res } = await publish(makeEnv(bucket));
    expect(res.status).toBe(503);
    expect(bucket.store.size).toBe(before);
  });

  it("still lets a stat sheet package be published through the same route", async () => {
    const bucket = new Bucket();
    const res = await call(makeEnv(bucket), "POST", LISTINGS, {
      body: {
        package: {
          schemaVersion: 1,
          template: {
            name: "Stat",
            description: "d",
            system: "Homebrew",
            labels: [],
            fields: [{ id: "hp", label: "HP", type: "counter" }],
          },
        },
        metadata: { rightsAcknowledged: true },
      },
    });
    expect(res.status).toBe(201);
    expect(await indexIds(bucket)).toEqual([]);
  });
});

describe("owner controls", () => {
  async function published() {
    const bucket = new Bucket();
    const env = makeEnv(bucket);
    const { json } = await publish(env);
    return {
      bucket,
      env,
      id: json.listing.listingId as string,
      token: json.ownerToken as string,
    };
  }

  it("updates in place with the right token and refreshes the index", async () => {
    const { bucket, env, id, token } = await published();
    const res = await call(env, "PUT", `${LISTINGS}/${id}`, {
      token,
      body: {
        package: pkg({ name: "Renamed", markdown: "## New\n" }),
        metadata: metadata({ description: "Changed." }),
      },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("Renamed");
    expect(await indexIds(bucket)).toEqual([id]);
    const detail = await (await call(env, "GET", `${LISTINGS}/${id}`)).json();
    expect(detail).toMatchObject({
      title: "Renamed",
      description: "Changed.",
      previewMarkdown: "## New\n",
    });
    // The token still works afterwards (the hash survives an update).
    expect(
      (await call(env, "GET", `${LISTINGS}/${id}/owner`, { token })).status,
    ).toBe(200);
  });

  it("rejects a wrong or missing token", async () => {
    const { env, id } = await published();
    const body = { package: pkg(), metadata: metadata() };
    expect((await call(env, "PUT", `${LISTINGS}/${id}`, { body })).status).toBe(
      401,
    );
    expect(
      (await call(env, "PUT", `${LISTINGS}/${id}`, { body, token: "nope" }))
        .status,
    ).toBe(401);
    expect(
      (
        await call(env, "POST", `${LISTINGS}/${id}/unpublish`, {
          token: "nope",
        })
      ).status,
    ).toBe(401);
    expect(
      (await call(env, "DELETE", `${LISTINGS}/${id}`, { token: "nope" }))
        .status,
    ).toBe(401);
    expect(
      (await call(env, "GET", `${LISTINGS}/${id}/owner`, { token: "nope" }))
        .status,
    ).toBe(401);
  });

  it("unpublishes: hides everywhere, keeps the record, and is idempotent", async () => {
    const { bucket, env, id, token } = await published();
    expect(
      (await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token }))
        .status,
    ).toBe(200);
    expect(
      (await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token }))
        .status,
    ).toBe(200);
    expect(await indexIds(bucket)).toEqual([]);
    expect((await (await call(env, "GET", LIST)).json()).results).toEqual([]);
    expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(404);
    expect((await call(env, "GET", `${LISTINGS}/${id}/package`)).status).toBe(
      404,
    );
    expect(bucket.store.has(`templates/listings/${id}/listing.json`)).toBe(
      true,
    );
  });

  it("republishes an unpublished listing at the same address", async () => {
    const { bucket, env, id, token } = await published();
    await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token });
    const res = await call(env, "PUT", `${LISTINGS}/${id}`, {
      token,
      body: { package: pkg(), metadata: metadata() },
    });
    expect(res.status).toBe(200);
    expect(await indexIds(bucket)).toEqual([id]);
    expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(200);
  });

  it("lets the owner read an unpublished listing and its package", async () => {
    const { env, id, token } = await published();
    await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token });
    const res = await call(env, "GET", `${LISTINGS}/${id}/owner`, { token });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listing.status).toBe("unpublished");
    expect(body.package.template.markdown).toBe("\n## Rooms\r\n\r\nBig.  \n");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("deletes permanently from active or unpublished, and repeats safely", async () => {
    for (const unpublishFirst of [false, true]) {
      const { bucket, env, id, token } = await published();
      if (unpublishFirst)
        await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token });
      const res = await call(env, "DELETE", `${LISTINGS}/${id}`, { token });
      expect(res.status).toBe(200);
      expect(bucket.store.has(`templates/listings/${id}/listing.json`)).toBe(
        false,
      );
      expect(bucket.store.has(`templates/listings/${id}/package.json`)).toBe(
        false,
      );
      expect(await indexIds(bucket)).toEqual([]);
      expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(404);
      expect(
        (await call(env, "GET", `${LISTINGS}/${id}/owner`, { token })).status,
      ).toBe(404);
      expect(
        (await call(env, "DELETE", `${LISTINGS}/${id}`, { token })).status,
      ).toBeLessThan(300);
    }
  });

  it("keeps report records when a listing is deleted", async () => {
    const { bucket, env, id, token } = await published();
    await bucket.put(`moderation/template-reports/${id}/r1.json`, "{}");
    await call(env, "DELETE", `${LISTINGS}/${id}`, { token });
    expect(bucket.store.has(`moderation/template-reports/${id}/r1.json`)).toBe(
      true,
    );
  });

  it("refuses every owner action once the operator has removed the listing", async () => {
    const { bucket, env, id, token } = await published();
    const suspend = await call(
      env,
      "POST",
      "/api/template-directory/admin/suspensions",
      {
        token: "admin-secret",
        body: { publishId: id, mode: "delist", reason: "policy" },
      },
    );
    expect(suspend.status).toBe(201);
    for (const res of [
      await call(env, "PUT", `${LISTINGS}/${id}`, {
        token,
        body: { package: pkg(), metadata: metadata() },
      }),
      await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token }),
      await call(env, "DELETE", `${LISTINGS}/${id}`, { token }),
      await call(env, "GET", `${LISTINGS}/${id}/owner`, { token }),
    ]) {
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("removed_by_operator");
    }
    // The operator keeps the record.
    expect(bucket.store.has(`templates/listings/${id}/listing.json`)).toBe(
      true,
    );
    expect(await indexIds(bucket)).toEqual([]);
    expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(404);
  });

  it("keeps the index equal to the active listings after every transition", async () => {
    const { bucket, env, id, token } = await published();
    const second = (await publish(env)).json;
    expect(await indexIds(bucket)).toEqual(
      [id, second.listing.listingId].sort(),
    );
    await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token });
    expect(await indexIds(bucket)).toEqual([second.listing.listingId]);
    await call(env, "PUT", `${LISTINGS}/${id}`, {
      token,
      body: { package: pkg(), metadata: metadata() },
    });
    expect(await indexIds(bucket)).toEqual(
      [id, second.listing.listingId].sort(),
    );
    await call(env, "DELETE", `${LISTINGS}/${id}`, { token });
    expect(await indexIds(bucket)).toEqual([second.listing.listingId]);
  });

  it("indexes two concurrent publishes without losing either", async () => {
    const bucket = new Bucket();
    const env = makeEnv(bucket);
    const [a, b] = await Promise.all([publish(env), publish(env)]);
    expect(await indexIds(bucket)).toEqual(
      [a.json.listing.listingId, b.json.listing.listingId].sort(),
    );
  });

  it("keeps a listing hidden and lets the owner retry when the index cannot be updated on unpublish", async () => {
    const { bucket, env, id, token } = await published();
    bucket.injectConflicts(50);
    const res = await call(env, "POST", `${LISTINGS}/${id}/unpublish`, {
      token,
    });
    expect(res.status).toBe(503);
    // Public reads already treat it as hidden.
    expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(404);
    bucket.injectConflicts(0);
    expect(
      (await call(env, "POST", `${LISTINGS}/${id}/unpublish`, { token }))
        .status,
    ).toBe(200);
    expect(await indexIds(bucket)).toEqual([]);
  });

  it("deletes nothing and asks the owner to retry when the index cannot be updated on delete", async () => {
    const { bucket, env, id, token } = await published();
    bucket.injectConflicts(50);
    const res = await call(env, "DELETE", `${LISTINGS}/${id}`, { token });
    expect(res.status).toBe(503);
    expect(bucket.store.has(`templates/listings/${id}/listing.json`)).toBe(
      true,
    );
    bucket.injectConflicts(0);
    expect(
      (await call(env, "DELETE", `${LISTINGS}/${id}`, { token })).status,
    ).toBe(200);
    expect(bucket.store.has(`templates/listings/${id}/listing.json`)).toBe(
      false,
    );
  });

  it("tells the operator to repeat a takedown whose index update failed, and the repeat succeeds", async () => {
    const { bucket, env, id } = await published();
    bucket.injectConflicts(50);
    const first = await call(
      env,
      "POST",
      "/api/template-directory/admin/suspensions",
      {
        token: "admin-secret",
        body: { publishId: id, mode: "delist" },
      },
    );
    expect(first.status).toBe(503);
    expect((await first.json()).error.message).toMatch(/repeat this request/i);
    // The marker is already in place, so the listing is hidden.
    expect((await call(env, "GET", `${LISTINGS}/${id}`)).status).toBe(404);
    bucket.injectConflicts(0);
    const again = await call(
      env,
      "POST",
      "/api/template-directory/admin/suspensions",
      {
        token: "admin-secret",
        body: { publishId: id, mode: "delist" },
      },
    );
    expect(again.status).toBe(201);
    expect(await indexIds(bucket)).toEqual([]);
  });
});
