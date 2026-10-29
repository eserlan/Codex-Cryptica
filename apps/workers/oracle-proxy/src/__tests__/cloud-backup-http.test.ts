import { describe, expect, it } from "vitest";
import { CLOUD_BACKUP_LIMITS } from "../../../../../packages/schema/src/publishing";
import {
  json,
  readJsonBody,
  tooLargeToRead,
  validatePayload,
  isValidAssetId,
  sizeLimitResponse,
} from "../cloud-backup-http";

const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://example.test", { method: "POST", body, headers });

describe("cloud backup HTTP boundary", () => {
  it("preserves CORS and explicit response headers", async () => {
    const response = json(
      request("", { Origin: "https://client.test" }),
      { ok: true },
      201,
      { "X-Result": "saved" },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://client.test",
    );
    expect(response.headers.get("X-Result")).toBe("saved");
    expect(await response.json()).toEqual({ ok: true });
    expect(
      json(request(""), {}).headers.get("Access-Control-Allow-Origin"),
    ).toBe("*");
  });

  it("reads JSON and rejects malformed or oversized bodies before parsing", async () => {
    expect(await readJsonBody(request('{"ok":true}'))).toEqual({
      body: { ok: true },
    });
    const invalid = await readJsonBody(request("{"));
    expect("response" in invalid && invalid.response.status).toBe(400);
    const oversized = await readJsonBody(
      request("{", {
        "Content-Length": String(CLOUD_BACKUP_LIMITS.maxJsonBodyBytes + 1),
      }),
    );
    expect("response" in oversized && oversized.response.status).toBe(413);
    expect(
      tooLargeToRead(request("", { "Content-Length": "10" }), 10),
    ).toBeNull();
    expect(
      tooLargeToRead(request("", { "Content-Length": "invalid" }), 10),
    ).toBeNull();
  });

  it("keeps limit errors consistent without rejecting the exact ceiling", async () => {
    expect(sizeLimitResponse(request(""), 10, 10, "Too large")).toBeNull();
    const response = sizeLimitResponse(request(""), 11, 10, "Too large")!;
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: { message: "Too large", limitBytes: 10, actualBytes: 11 },
    });
  });

  it("accepts snapshot payloads and rejects invalid titles and asset segments", () => {
    const payload = {
      vaultTitle: "Vault",
      bundle: null,
      assetIds: ["map.png"],
    };
    expect(validatePayload(request(""), payload)).toEqual({ payload });
    for (const body of [
      null,
      {},
      { ...payload, vaultTitle: " " },
      { ...payload, assetIds: ["../map"] },
      { ...payload, assetIds: [1] },
      { ...payload, assetIds: "map.png" },
    ]) {
      expect("response" in validatePayload(request(""), body)).toBe(true);
    }
    expect(isValidAssetId("map.png")).toBe(true);
    for (const id of ["", ".", "..", "a/b", "a\\b", "a".repeat(256)])
      expect(isValidAssetId(id)).toBe(false);
  });
});
