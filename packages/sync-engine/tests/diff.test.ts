import { describe, it, expect } from "vitest";
import { DiffAlgorithm } from "../src/DiffAlgorithm";
import { type SyncEntry, type FileMetadata } from "../src/types";

describe("DiffAlgorithm", () => {
  const path = "test.md";

  const createMeta = (
    lastModified: number,
    size = 100,
    hash = "abc",
  ): FileMetadata => ({
    path,
    lastModified,
    size,
    hash,
    handle: {} as any,
  });

  const createEntry = (
    fsMod: number,
    fsSize = 100,
    opfsHash = "abc",
  ): SyncEntry => ({
    filePath: path,
    vaultId: "v1",
    lastSyncedFsModified: fsMod,
    lastSyncedFsSize: fsSize,
    lastSyncedOpfsHash: opfsHash,
    status: "SYNCED",
  });

  it("should detect new file in local (FS)", async () => {
    const fs = createMeta(1000);
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      undefined,
      undefined,
    );
    expect(result.type).toBe("IMPORT_TO_OPFS");
  });

  it("should detect new file in OPFS", async () => {
    const opfs = createMeta(1000);
    const result = await DiffAlgorithm.calculateAction(
      path,
      undefined,
      opfs,
      undefined,
    );
    expect(result.type).toBe("EXPORT_TO_FS");
  });

  it("should handle initial match (no registry) - same size", async () => {
    const fs = createMeta(1000, 100);
    const opfs = createMeta(1000, 100);
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      undefined,
    );
    expect(result.type).toBe("MATCH_INITIAL");
  });

  it("should handle initial match (no registry) - different size -> conflict", async () => {
    const fs = createMeta(1000, 100);
    const opfs = createMeta(1000, 200);
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      undefined,
    );
    expect(result.type).toBe("HANDLE_CONFLICT");
    expect(result.isConflict).toBe(true);
  });

  it("should detect local (FS) deletion (recreate from OPFS)", async () => {
    const opfs = createMeta(1000);
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      undefined,
      opfs,
      registry,
    );
    expect(result.type).toBe("EXPORT_TO_FS");
  });

  it("should detect OPFS deletion", async () => {
    const fs = createMeta(1000);
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      undefined,
      registry,
    );
    expect(result.type).toBe("DELETE_FS");
  });

  it("should skip if all match", async () => {
    const fs = createMeta(1000, 100, "abc");
    const opfs = createMeta(1000, 100, "abc");
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    expect(result.type).toBe("SKIP");
  });

  it("should detect local (FS) update", async () => {
    const fs = createMeta(5000, 100, "abc");
    const opfs = createMeta(1000, 100, "abc");
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    expect(result.type).toBe("IMPORT_TO_OPFS");
  });

  it("should detect OPFS update", async () => {
    const fs = createMeta(1000, 100, "abc");
    const opfs = createMeta(1000, 100, "def"); // new hash
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    expect(result.type).toBe("EXPORT_TO_FS");
  });

  it("should handle conflict", async () => {
    const fs = createMeta(6000, 200, "abc"); // fs changed
    const opfs = createMeta(5000, 100, "def"); // opfs changed
    const registry = createEntry(1000, 100, "abc");
    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    expect(result.type).toBe("HANDLE_CONFLICT");
    expect(result.isConflict).toBe(true);
  });

  it("should skip if missing in both but in registry (cleanup case)", async () => {
    const result = await DiffAlgorithm.calculateAction(
      path,
      undefined,
      undefined,
      createEntry(1000, 100, "abc"),
    );
    expect(result.type).toBe("SKIP");
  });

  it("should detect OPFS change if hash is missing in registry", async () => {
    const fs = createMeta(1000, 100, "abc");
    const opfs = createMeta(1000, 100, "abc");
    const registry = createEntry(1000, 100, ""); // Missing hash
    (registry as any).lastSyncedOpfsHash = undefined;

    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    // Currently this triggers EXPORT_TO_FS because it assumes OPFS changed
    expect(result.type).toBe("EXPORT_TO_FS");
  });

  it("should trigger conflict if hash is missing AND FS changed", async () => {
    const fs = createMeta(2000, 100, "abc"); // FS changed
    const opfs = createMeta(1000, 100, "abc");
    const registry = createEntry(1000, 100, ""); // Missing hash
    (registry as any).lastSyncedOpfsHash = undefined;

    const result = await DiffAlgorithm.calculateAction(
      path,
      fs,
      opfs,
      registry,
    );
    expect(result.type).toBe("HANDLE_CONFLICT");
    expect(result.isConflict).toBe(true);
  });
});
