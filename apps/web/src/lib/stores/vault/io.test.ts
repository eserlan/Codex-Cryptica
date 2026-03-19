import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vaultIO from "./io";
import { writeOpfsFile, deleteOpfsEntry } from "../../utils/opfs";

vi.mock("../../utils/opfs", () => ({
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
  getDirHandle: vi.fn(),
  isNotFoundError: vi.fn((e) => e.name === "NotFoundError"),
}));

vi.mock("@codex/canvas-engine", () => ({
  CanvasSchema: {
    parse: vi.fn((x) => x),
  },
}));

vi.mock("../debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../utils/markdown", () => ({
  stringifyEntity: vi.fn(() => "mock-markdown"),
}));

describe("VaultIO", () => {
  let mockVaultHandle: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVaultHandle = {
      name: "test-vault",
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
      entries: vi.fn(),
    };
  });

  it("should save maps to disk", async () => {
    await vaultIO.saveMapsToDisk(mockVaultHandle, { m1: {} as any });
    expect(writeOpfsFile).toHaveBeenCalledWith(
      [".codex", "maps.json"],
      expect.any(String),
      mockVaultHandle,
      "test-vault",
    );
  });

  it("should load maps from disk", async () => {
    const mockCodexDir = {
      getFileHandle: vi.fn().mockResolvedValue({
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{"m1": {"id": "m1"}}'),
        }),
      }),
    };
    mockVaultHandle.getDirectoryHandle.mockResolvedValue(mockCodexDir);

    const maps = await vaultIO.loadMapsFromDisk(mockVaultHandle);
    expect(maps).toHaveProperty("m1");
  });

  it("should handle error in loadMapsFromDisk", async () => {
    mockVaultHandle.getDirectoryHandle.mockRejectedValue(new Error("Fail"));
    const maps = await vaultIO.loadMapsFromDisk(mockVaultHandle);
    expect(maps).toEqual({});
  });

  it("should save entity to disk", async () => {
    const entity = { id: "e1", title: "E1" } as any;
    await vaultIO.saveEntityToDisk(mockVaultHandle, "v1", entity, false);
    expect(writeOpfsFile).toHaveBeenCalled();
  });

  it("should return early in saveEntityToDisk if guest", async () => {
    await vaultIO.saveEntityToDisk(mockVaultHandle, "v1", {} as any, true);
    expect(writeOpfsFile).not.toHaveBeenCalled();
  });

  it("should warn in saveEntityToDisk if no vaultHandle", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await vaultIO.saveEntityToDisk(null as any, "v1", {} as any, false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("should save and delete canvas", async () => {
    await vaultIO.saveCanvasToDisk(mockVaultHandle, "c1", { nodes: [] });
    expect(writeOpfsFile).toHaveBeenCalledWith(
      [".codex", "canvases", "c1.canvas"],
      expect.any(String),
      mockVaultHandle,
      "test-vault",
    );

    await vaultIO.deleteCanvasFromDisk(mockVaultHandle, "c1");
    expect(deleteOpfsEntry).toHaveBeenCalled();
  });

  it("should handle error in deleteCanvasFromDisk", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(deleteOpfsEntry).mockRejectedValue(new Error("Fail"));
    await vaultIO.deleteCanvasFromDisk(mockVaultHandle, "c1");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("should load canvases from disk", async () => {
    const mockCodexDir = {
      getDirectoryHandle: vi.fn().mockResolvedValue({
        entries: async function* () {
          yield [
            "c1.canvas",
            {
              kind: "file",
              getFile: () =>
                Promise.resolve({
                  text: () => Promise.resolve('{"name": "C1"}'),
                  lastModified: 100,
                }),
            },
          ];
        },
      }),
    };
    mockVaultHandle.getDirectoryHandle.mockResolvedValue(mockCodexDir);

    const canvases = await vaultIO.loadCanvasesFromDisk(mockVaultHandle);
    expect(canvases).toHaveProperty("c1");
    expect(canvases["c1"].name).toBe("C1");
  });

  it("should handle error in loadCanvasesFromDisk", async () => {
    mockVaultHandle.getDirectoryHandle.mockRejectedValue(new Error("Fail"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const canvases = await vaultIO.loadCanvasesFromDisk(mockVaultHandle);
    expect(canvases).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  describe("importFromFolder", () => {
    it("should import files and skip up-to-date ones", async () => {
      const mockLocalHandle = {
        entries: async function* () {
          yield [
            "test.md",
            {
              kind: "file",
              getFile: () =>
                Promise.resolve({
                  size: 10,
                  lastModified: 1000,
                  text: () => Promise.resolve("content"),
                }),
            },
          ];
        },
      };

      // Mock OPFS having the SAME file
      const mockOpfsFileHandle = {
        getFile: () => Promise.resolve({ size: 10, lastModified: 1000 }),
      };
      mockVaultHandle.getFileHandle = vi
        .fn()
        .mockResolvedValue(mockOpfsFileHandle);

      const result = await vaultIO.importFromFolder(
        "v1",
        mockVaultHandle,
        mockLocalHandle as any,
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(0); // Skipped because identical
      expect(writeOpfsFile).not.toHaveBeenCalled();
    });

    it("should import new files", async () => {
      const mockLocalHandle = {
        entries: async function* () {
          yield [
            "new.md",
            {
              kind: "file",
              getFile: () =>
                Promise.resolve({
                  size: 10,
                  lastModified: 2000,
                  text: () => Promise.resolve("content"),
                }),
            },
          ];
        },
      };

      // Mock OPFS NOT having the file
      mockVaultHandle.getFileHandle = vi
        .fn()
        .mockRejectedValue({ name: "NotFoundError" });

      const result = await vaultIO.importFromFolder(
        "v1",
        mockVaultHandle,
        mockLocalHandle as any,
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(writeOpfsFile).toHaveBeenCalled();
    });

    it("should handle recursive walkAllFiles during import", async () => {
      const mockSubDir = {
        kind: "directory",
        entries: async function* () {
          yield [
            "inner.md",
            {
              kind: "file",
              getFile: () =>
                Promise.resolve({ size: 1, lastModified: 1, text: () => "t" }),
            },
          ];
        },
      };
      const mockLocalHandle = {
        entries: async function* () {
          yield ["sub", mockSubDir];
        },
      };

      mockVaultHandle.getFileHandle = vi
        .fn()
        .mockRejectedValue({ name: "NotFoundError" });
      const result = await vaultIO.importFromFolder(
        "v1",
        mockVaultHandle,
        mockLocalHandle as any,
      );
      expect(result.count).toBe(1);
    });

    it("should handle directory picker cancellation", async () => {
      vi.stubGlobal("window", {
        showDirectoryPicker: vi.fn().mockRejectedValue(new Error("Cancel")),
      });
      const result = await vaultIO.importFromFolder("v1", mockVaultHandle);
      expect(result.success).toBe(false);
      vi.unstubAllGlobals();
    });
  });
});
