import { describe, expect, it, vi } from "vitest";
import {
  authorize,
  authorizeStoredBackup,
  bearerToken,
  generateOwnerCode,
  hashOwnerCode,
  isAdmin,
  readAuthorizedJsonBody,
} from "../cloud-backup-auth";
import { writeManifest } from "../cloud-backup-storage";
import { Bucket } from "./r2-memory-bucket";
import {
  createBackupFixture,
  jsonRequest,
  ownerRequest,
} from "./cloud-backup-fixtures";

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
    await writeManifest(env, "b", manifest, ownerCodeHash, undefined);
    expect(await authorizeStoredBackup(request("code"), env, "b")).toEqual({
      manifest,
      ownerCodeHash,
      etag: expect.any(String),
      role: "owner",
      sharing: undefined,
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

  it("gives an editor token the editor role and nothing else", async () => {
    const env = { BUCKET: new Bucket() };
    const manifest = {
      schemaVersion: 1 as const,
      backupId: "b",
      vaultTitle: "Vault",
      sizeBytes: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastPushedAt: "2026-01-01T00:00:00.000Z",
    };
    const sharing = {
      editorTokenHash: await hashOwnerCode("editor"),
      linkVersion: 1,
      enabledAt: "2026-01-01T00:00:00.000Z",
    };
    await writeManifest(
      env,
      "b",
      manifest,
      await hashOwnerCode("code"),
      undefined,
      undefined,
      sharing,
    );
    const owner = await authorize(request("code"), env, "b");
    const editor = await authorize(request("editor"), env, "b");
    expect("role" in owner && owner.role).toBe("owner");
    expect("role" in editor && editor.role).toBe("editor");
    expect("response" in (await authorize(request("other"), env, "b"))).toBe(
      true,
    );
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

  it("parses protected JSON only after authorization and returns JSON errors unchanged", async () => {
    const { env, backupId, ownerCode, manifest } = await createBackupFixture();
    const denied = jsonRequest({ value: true }, "wrong");
    const parse = vi.spyOn(denied, "json");
    const rejected = await readAuthorizedJsonBody(denied, env, backupId);
    expect("response" in rejected && rejected.response.status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
    const accepted = await readAuthorizedJsonBody(
      jsonRequest({ value: true }, ownerCode),
      env,
      backupId,
    );
    expect(accepted).toEqual({
      auth: {
        manifest,
        ownerCodeHash: await hashOwnerCode(ownerCode),
        etag: expect.any(String),
        role: "owner",
      },
      body: { value: true },
    });
    const invalid = await readAuthorizedJsonBody(
      ownerRequest(ownerCode, { method: "POST", body: "{" }),
      env,
      backupId,
    );
    expect("response" in invalid && invalid.response.status).toBe(400);
    if ("response" in invalid)
      expect(await invalid.response.json()).toEqual({
        error: { message: "Invalid JSON" },
      });
  });
});
