import { describe, expect, it } from "vitest";
import {
  authorize,
  authorizeStoredBackup,
  bearerToken,
  generateOwnerCode,
  hashOwnerCode,
  isAdmin,
} from "../cloud-backup-auth";
import { writeManifest } from "../cloud-backup-storage";
import { Bucket } from "./r2-memory-bucket";

const request = (code?: string) =>
  new Request("https://example.test", {
    headers: code === undefined ? {} : { Authorization: code },
  });

describe("cloud backup credentials", () => {
  it("supports bearer and bare tokens, while rejecting empty credentials", () => {
    expect(bearerToken(request("Bearer abc  "))).toBe("abc");
    expect(bearerToken(request("abc"))).toBe("abc");
    expect(bearerToken(request(""))).toBeNull();
    expect(bearerToken(request())).toBeNull();
    expect(
      isAdmin(request("secret"), { CLOUD_BACKUP_ADMIN_TOKEN: "secret" }),
    ).toBe(true);
    expect(
      isAdmin(request("wrong"), { CLOUD_BACKUP_ADMIN_TOKEN: "secret" }),
    ).toBe(false);
    expect(isAdmin(request("secret"), {})).toBe(false);
  });

  it("generates independent owner codes and stable SHA-256 hashes", async () => {
    const code = generateOwnerCode();
    expect(code).toMatch(/^[a-f0-9]{64}$/);
    expect(generateOwnerCode()).not.toBe(code);
    expect(await hashOwnerCode("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("authorizes a stored owner and keeps missing and incorrect credentials indistinguishable", async () => {
    const env = { BUCKET: new Bucket() };
    const manifest = {
      schemaVersion: 1 as const,
      backupId: "b",
      vaultTitle: "Vault",
      sizeBytes: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastPushedAt: "2026-01-01T00:00:00.000Z",
    };
    const ownerCodeHash = await hashOwnerCode("code");
    await writeManifest(env, "b", manifest, ownerCodeHash);
    expect(await authorizeStoredBackup(request("code"), env, "b")).toEqual({
      manifest,
      ownerCodeHash,
    });
    const failures = await Promise.all([
      authorize(request("wrong"), env, "b"),
      authorize(request("code"), env, "missing"),
      authorize(request(), env, "b"),
    ]);
    for (const failure of failures) {
      expect("response" in failure).toBe(true);
      if ("response" in failure) {
        expect(failure.response.status).toBe(404);
        expect(await failure.response.json()).toEqual({
          error: { message: "Backup not found" },
        });
      }
    }
  });

  it("reports unavailable storage before attempting owner authorization", async () => {
    const result = await authorizeStoredBackup(request(), {}, "b");
    expect("response" in result && result.response.status).toBe(500);
    if ("response" in result)
      expect(await result.response.json()).toEqual({
        error: { message: "Storage unavailable" },
      });
    expect("response" in (await authorize(request("code"), {}, "b"))).toBe(
      true,
    );
  });
});
