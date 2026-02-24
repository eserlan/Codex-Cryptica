import { describe, it, expect } from "vitest";
import { DiffAlgorithm } from "../src/DiffAlgorithm";
import { type SyncEntry, type FileMetadata } from "../src/types";

describe("DiffAlgorithm", () => {
  const path = "test.md";

  const createMeta = (lastModified: number, size = 100): FileMetadata => ({
    path,
    lastModified,
    size,
    handle: {} as any,
  });

  const createEntry = (
    localMod: number,
    opfsMod: number,
    size = 100,
  ): SyncEntry => ({
    filePath: path,
    vaultId: "v1",
    lastLocalModified: localMod,
    lastOpfsModified: opfsMod,
    size,
    status: "SYNCED",
  });

  it("should detect new file in local", () => {
    const local = createMeta(1000);
    const result = DiffAlgorithm.calculateAction(
      path,
      local,
      undefined,
      undefined,
    );
    expect(result.type).toBe("CREATE_OPFS");
  });

  it("should detect new file in OPFS", () => {
    const opfs = createMeta(1000);
    const result = DiffAlgorithm.calculateAction(
      path,
      undefined,
      opfs,
      undefined,
    );
    expect(result.type).toBe("CREATE_LOCAL");
  });

  it("should handle initial match (no registry)", () => {
    const local = createMeta(5000);
    const opfs = createMeta(1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, undefined);
    expect(result.type).toBe("UPDATE_OPFS");
    expect(result.isConflict).toBe(true);
  });

  it("should detect local deletion", () => {
    const opfs = createMeta(1000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(
      path,
      undefined,
      opfs,
      registry,
    );
    expect(result.type).toBe("DELETE_OPFS");
  });

  it("should detect OPFS deletion", () => {
    const local = createMeta(1000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(
      path,
      local,
      undefined,
      registry,
    );
    expect(result.type).toBe("DELETE_LOCAL");
  });

  it("should skip if all match", () => {
    const local = createMeta(1000);
    const opfs = createMeta(1000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    expect(result.type).toBe("SKIP");
  });

  it("should detect local update", () => {
    const local = createMeta(5000);
    const opfs = createMeta(1000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    expect(result.type).toBe("UPDATE_OPFS");
  });

  it("should detect OPFS update", () => {
    const local = createMeta(1000);
    const opfs = createMeta(5000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    expect(result.type).toBe("UPDATE_LOCAL");
  });

  it("should handle conflict (local newer)", () => {
    const local = createMeta(6000);
    const opfs = createMeta(5000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    expect(result.type).toBe("UPDATE_OPFS");
    expect(result.isConflict).toBe(true);
  });

  it("should handle conflict (opfs newer)", () => {
    const local = createMeta(5000);
    const opfs = createMeta(6000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    expect(result.type).toBe("UPDATE_LOCAL");
    expect(result.isConflict).toBe(true);
  });

  it("should respect clock skew", () => {
    const local = createMeta(1500);
    const opfs = createMeta(1000);
    const registry = createEntry(1000, 1000);
    const result = DiffAlgorithm.calculateAction(path, local, opfs, registry);
    // 1500 is within 2000ms skew of 1000
    expect(result.type).toBe("SKIP");
  });

  it("should handle file added to both locations independently", () => {
    const local = createMeta(5000, 100);
    const opfs = createMeta(6000, 200); // Different size
    const result = DiffAlgorithm.calculateAction(path, local, opfs, undefined);
    // Registry is missing, exists in both. Should resolve newest wins.
    expect(result.type).toBe("UPDATE_LOCAL");
    expect(result.isConflict).toBe(true);
  });

  it("should skip if missing in both but in registry (cleanup case)", () => {
    const result = DiffAlgorithm.calculateAction(
      path,
      undefined,
      undefined,
      createEntry(1000, 1000),
    );
    expect(result.type).toBe("SKIP");
  });
});
