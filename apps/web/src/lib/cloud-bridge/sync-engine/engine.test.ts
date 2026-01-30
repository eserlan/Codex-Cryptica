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

    const remoteFiles: RemoteFileMeta[] = [
      { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
    ];

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

    const remoteFiles: RemoteFileMeta[] = [
      { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
    ];

    const metadata: SyncMetadata[] = [
      { filePath: "images/hero.png", remoteId: "rem1", localModified: 1000, remoteModified: "2026-01-01T00:00:00Z", syncStatus: "SYNCED" },
    ];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    expect(plan.uploads.length).toBe(1);
    expect(plan.uploads[0].path).toBe("images/hero.png");
    expect(plan.uploads[0].remoteId).toBe("rem1");
  });

  it("should identify and clean up remote duplicates", () => {
    const localFiles: FileEntry[] = [
      { path: "images/hero.png", lastModified: 1000, handle: {} as any },
    ];

    const remoteFiles: RemoteFileMeta[] = [
      { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
      { id: "rem2", name: "hero.png", modifiedTime: "2026-01-02T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
    ];

    const metadata: SyncMetadata[] = [];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    // rem2 is newer, should be kept. rem1 should be added to deletes.
    expect(plan.deletes.length).toBe(1);
    expect(plan.deletes[0].id).toBe("rem1");
    expect(plan.deletes[0].path).toBe("images/hero.png");
    
    // rem2 should be downloaded because we have no metadata saying we've seen it
    expect(plan.downloads.length).toBe(1);
    expect(plan.downloads[0].id).toBe("rem2");
  });

  it("should detect local deletions and propagate to remote", () => {
    const localFiles: FileEntry[] = []; // hero.png deleted locally

    const remoteFiles: RemoteFileMeta[] = [
      { id: "rem1", name: "hero.png", modifiedTime: "2026-01-01T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
    ];

    const metadata: SyncMetadata[] = [
      { filePath: "images/hero.png", remoteId: "rem1", localModified: 1000, remoteModified: "2026-01-01T00:00:00Z", syncStatus: "SYNCED" },
    ];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    expect(plan.deletes.length).toBe(1);
    expect(plan.deletes[0].id).toBe("rem1");
    expect(plan.deletes[0].path).toBe("images/hero.png");
    expect(plan.downloads.length).toBe(0);
    expect(plan.uploads.length).toBe(0);
  });

  it("should restore locally deleted file if remote was updated", () => {
    const localFiles: FileEntry[] = []; // deleted locally

    const remoteFiles: RemoteFileMeta[] = [
      { id: "rem1", name: "hero.png", modifiedTime: "2026-01-05T00:00:00Z", parents: [], appProperties: { vault_path: "images/hero.png" }, mimeType: "image/png" },
    ];

    const metadata: SyncMetadata[] = [
      { filePath: "images/hero.png", remoteId: "rem1", localModified: 1000, remoteModified: "2026-01-01T00:00:00Z", syncStatus: "SYNCED" },
    ];

    const plan = engine.calculateDiff(localFiles, remoteFiles, metadata);

    // Remote modifiedTime (Jan 5) != metadata.remoteModified (Jan 1) -> RESTORE
    expect(plan.downloads.length).toBe(1);
    expect(plan.downloads[0].id).toBe("rem1");
    expect(plan.deletes.length).toBe(0);
  });
});