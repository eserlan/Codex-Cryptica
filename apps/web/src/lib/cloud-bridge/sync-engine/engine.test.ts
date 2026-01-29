import { describe, it, expect, vi } from "vitest";
import { SyncEngine } from "./engine";
import type { FileEntry } from "./fs-adapter";
import type { RemoteFileMeta } from "../index";
import type { SyncMetadata } from "./metadata-store";

describe("SyncEngine Path-Aware Diff Logic", () => {
  const mockCloud = {
    listFiles: vi.fn(),
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const mockFs = {
    listAllFiles: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    init: vi.fn(),
    setRoot: vi.fn(),
  };
  const mockMetadata = {
    getAll: vi.fn(),
    put: vi.fn(),
    bulkPut: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };

  const engine = new SyncEngine(mockCloud as any, mockFs as any, mockMetadata as any);

  it("should match files using full relative paths", () => {
    const localFiles: FileEntry[] = [
      { path: "images/hero.png", lastModified: 1000, handle: {} as any },
      { path: "lore/main.md", lastModified: 1000, handle: {} as any },
    ];

    const remoteFiles = new Map<string, RemoteFileMeta>([
      ["images/hero.png", { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" }],
    ]);

    const metadata: SyncMetadata[] = [
      { filePath: "images/hero.png", remoteId: "rem1", localModified: 1000, remoteModified: "2026-01-01T00:00:00Z", syncStatus: "SYNCED" },
    ];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    // images/hero.png should be ignored (synced)
    // lore/main.md should be uploaded
    expect(plan.uploads.length).toBe(1);
    expect(plan.uploads[0].path).toBe("lore/main.md");
    expect(plan.downloads.length).toBe(0);
  });

  it("should detect local changes in subdirectories", () => {
    const localFiles: FileEntry[] = [
      { path: "images/hero.png", lastModified: 10000, handle: {} as any },
    ];

    const remoteFiles = new Map<string, RemoteFileMeta>([
      ["images/hero.png", { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" }],
    ]);

    const metadata: SyncMetadata[] = [
      { filePath: "images/hero.png", remoteId: "rem1", localModified: 1000, remoteModified: "2026-01-01T00:00:00Z", syncStatus: "SYNCED" },
    ];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    expect(plan.uploads.length).toBe(1);
    expect(plan.uploads[0].path).toBe("images/hero.png");
    expect(plan.uploads[0].remoteId).toBe("rem1");
  });
});