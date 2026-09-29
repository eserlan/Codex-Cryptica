import { describe, expect, it } from "vitest";
import {
  authorize,
  cors,
  getTemplateListingKey,
  getTemplatePackageKey,
  hashOwnerToken,
  json,
  ownerToken,
} from "../template-directory-shared";
import { Bucket } from "./r2-memory-bucket";

const req = (headers: Record<string, string> = {}) =>
  new Request("https://example.test/x", { headers });

describe("template directory keys", () => {
  it("scopes objects under templates/listings/{id}/", () => {
    expect(getTemplateListingKey("a1")).toBe(
      "templates/listings/a1/listing.json",
    );
    expect(getTemplatePackageKey("a1")).toBe(
      "templates/listings/a1/package.json",
    );
  });
});

describe("ownerToken", () => {
  it("reads a Bearer token and a bare token", () => {
    expect(ownerToken(req({ Authorization: "Bearer abc " }))).toBe("abc");
    expect(ownerToken(req({ Authorization: "abc" }))).toBe("abc");
  });

  it("returns null when the header is missing", () => {
    expect(ownerToken(req())).toBeNull();
  });
});

describe("hashOwnerToken", () => {
  it("is stable, hex, and never the token itself", async () => {
    const a = await hashOwnerToken("secret");
    expect(a).toBe(await hashOwnerToken("secret"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("secret");
    expect(a).not.toBe(await hashOwnerToken("other"));
  });
});

describe("json and cors", () => {
  it("echoes the origin and sets the content type", async () => {
    const res = json(req({ Origin: "https://app.test" }), { ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.test",
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(cors(req())["Access-Control-Allow-Origin"]).toBe("*");
  });
});

describe("authorize", () => {
  it("rejects a missing token, an unknown listing and a wrong token; passes the right one", async () => {
    const bucket = new Bucket();
    const env = { BUCKET: bucket };
    await bucket.put(getTemplateListingKey("l1"), "{}", {
      customMetadata: { ownerTokenHash: await hashOwnerToken("right") },
    });

    expect((await authorize(req(), env, "l1"))?.status).toBe(401);
    expect(
      (await authorize(req({ Authorization: "Bearer right" }), env, "nope"))
        ?.status,
    ).toBe(404);
    expect(
      (await authorize(req({ Authorization: "Bearer wrong" }), env, "l1"))
        ?.status,
    ).toBe(401);
    expect(
      await authorize(req({ Authorization: "Bearer right" }), env, "l1"),
    ).toBeNull();
  });
});
