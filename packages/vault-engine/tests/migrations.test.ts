import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MigrationStore } from "../src/migrations/store";
import { runMigration } from "../src/migrations/runner";

function createMemoryDirectory(name = "root") {
  const files = new Map<string, Blob | string>();
  const directories = new Map<
    string,
    ReturnType<typeof createMemoryDirectory>
  >();

  const fileHandle = (fileName: string, path: string[]) => ({
    kind: "file" as const,
    name: fileName,
    getFile: async () => {
      const content = files.get(path.join("/")) ?? "";
      return new File([content], fileName);
    },
    createWritable: async () => ({
      write: async (content: Blob | string) => {
        files.set(path.join("/"), content);
      },
      close: async () => {},
    }),
  });

  const directoryHandle = (dirName: string, path: string[]): any => ({
    kind: "directory" as const,
    name: dirName,
    getDirectoryHandle: async (
      childName: string,
      options?: FileSystemGetDirectoryOptions,
    ) => {
      const childPath = [...path, childName].join("/");
      if (!directories.has(childPath)) {
        if (!options?.create) {
          const error = new Error("Not Found");
          error.name = "NotFoundError";
          throw error;
        }
        directories.set(
          childPath,
          directoryHandle(childName, [...path, childName]),
        );
      }
      return directories.get(childPath);
    },
    getFileHandle: async (
      childName: string,
      options?: FileSystemGetFileOptions,
    ) => {
      const childPath = [...path, childName].join("/");
      if (!files.has(childPath)) {
        if (!options?.create) {
          const error = new Error("Not Found");
          error.name = "NotFoundError";
          throw error;
        }
        files.set(childPath, "");
      }
      return fileHandle(childName, [...path, childName]);
    },
    entries: async function* () {
      const prefix = path.length > 0 ? `${path.join("/")}/` : "";
      for (const [filePath] of files) {
        if (!filePath.startsWith(prefix)) continue;
        const relative = filePath.slice(prefix.length);
        if (!relative || relative.includes("/")) continue;
        yield [relative, fileHandle(relative, [...path, relative])] as const;
      }
      for (const [dirPath, dir] of directories) {
        if (!dirPath.startsWith(prefix)) continue;
        const relative = dirPath.slice(prefix.length);
        if (!relative || relative.includes("/")) continue;
        yield [relative, dir] as const;
      }
    },
    setFile: (pathParts: string[], content: Blob | string) => {
      for (let i = 1; i < pathParts.length; i++) {
        const directoryPath = pathParts.slice(0, i).join("/");
        if (!directories.has(directoryPath)) {
          directories.set(
            directoryPath,
            directoryHandle(pathParts[i - 1], pathParts.slice(0, i)),
          );
        }
      }
      files.set(pathParts.join("/"), content);
    },
    readText: async (pathParts: string[]) => {
      const content = files.get(pathParts.join("/"));
      if (content instanceof Blob) return content.text();
      return content ?? "";
    },
  });

  return directoryHandle(name, []);
}

describe("Vault Schema Migrations", () => {
  let store: MigrationStore;
  let dbCounter = 0;

  beforeEach(async () => {
    store = new MigrationStore(`codex_vault_migrations_test_${dbCounter++}`);
    await store.clear();
  });

  it("T016: should prune migration_log to keep only the last 5 entries", async () => {
    // Insert 6 entries
    for (let i = 1; i <= 6; i++) {
      await store.addEntry({
        version: i,
        timestamp: Date.now() + i,
        status: "success",
      });
    }

    const logs = await store.getLog();
    // It should have pruned the oldest (version 1)
    expect(logs.length).toBe(5);
    expect(logs.find((l) => l.version === 1)).toBeUndefined();
    expect(logs.find((l) => l.version === 6)).toBeDefined();
  });

  it("T015: should abort migration if pre-migration OPFS snapshot fails", async () => {
    // We'll mock the OPFS handle to throw an error when trying to get a directory handle for snapshot
    const mockOpfsRoot = {
      getDirectoryHandle: vi.fn().mockRejectedValue(new Error("Storage full")),
      entries: async function* () {},
    } as unknown as FileSystemDirectoryHandle;

    const migrationTask = vi.fn().mockResolvedValue(undefined);

    await expect(
      runMigration(mockOpfsRoot, store, 2, migrationTask),
    ).rejects.toThrow(
      "Migration aborted: Pre-migration snapshot failed. Storage full",
    );

    expect(migrationTask).not.toHaveBeenCalled();
    const entry = await store.getEntry(2);
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("failed");
  });

  it("T017: should log successful migration with rollback reference", async () => {
    // Mock OPFS snapshot to succeed
    const mockSnapshotHandle = {
      getDirectoryHandle: vi.fn().mockResolvedValue({}),
    } as unknown as FileSystemDirectoryHandle;
    const mockOpfsRoot = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mockSnapshotHandle),
      entries: async function* () {},
    } as unknown as FileSystemDirectoryHandle;

    const migrationTask = vi.fn().mockResolvedValue(undefined);

    await runMigration(mockOpfsRoot, store, 3, migrationTask);

    expect(migrationTask).toHaveBeenCalled();
    const entry = await store.getEntry(3);
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("success");
    expect(entry?.rollbackSnapshotId).toMatch(
      /^snapshots\/v2_before_v3_\d{4}-\d{2}-\d{2}T/,
    );
  });

  it("T018: should copy existing OPFS contents into the rollback snapshot", async () => {
    const opfsRoot = createMemoryDirectory();
    opfsRoot.setFile(["vaults", "main", "entity.md"], "before migration");

    await runMigration(opfsRoot, store, 4, async () => {
      opfsRoot.setFile(["vaults", "main", "entity.md"], "after migration");
    });

    const entry = await store.getEntry(4);
    expect(entry?.rollbackSnapshotId).toBeDefined();
    const snapshotPath = entry?.rollbackSnapshotId.split("/") ?? [];

    expect(
      await opfsRoot.readText([...snapshotPath, "vaults", "main", "entity.md"]),
    ).toBe("before migration");
    expect(await opfsRoot.readText(["vaults", "main", "entity.md"])).toBe(
      "after migration",
    );
  });

  it("uses injected IdGenerator for migration snapshot name", async () => {
    const opfsRoot = createMemoryDirectory();
    const mockClock = { now: () => 1700000000000 };
    const mockIdGen = { uuid: () => "custom-nonce-abc" };

    await runMigration(
      opfsRoot,
      store,
      5,
      async () => {},
      mockClock,
      mockIdGen,
    );

    const entry = await store.getEntry(5);
    expect(entry?.rollbackSnapshotId).toContain("custom-nonce-abc");
  });
});
