// apps/web/src/tests/mocks/storage.ts
import { vi } from "vitest";

/**
 * Creates a robust mock for the FileSystemDirectoryHandle (OPFS).
 */
export function createMockOpfs(rootName = "root") {
  const files = new Map<string, string | Blob>();
  const directories = new Map<string, any>();

  const createMockFileHandle = (name: string, path: string[]) => ({
    kind: "file" as const,
    name,
    getFile: vi.fn().mockImplementation(async () => {
      const content = files.get(path.join("/")) || "";
      return {
        text: async () => (typeof content === "string" ? content : ""),
        arrayBuffer: async () => new ArrayBuffer(0),
        slice: () => new Blob(),
        lastModified: Date.now(),
        size: typeof content === "string" ? content.length : content.size,
        type: typeof content === "string" ? "text/plain" : content.type,
      };
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn().mockImplementation(async (data) => {
        files.set(path.join("/"), data);
      }),
      close: vi.fn(),
    }),
  });

  const createMockDirHandle = (name: string, currentPath: string[]): any => {
    const handle = {
      kind: "directory" as const,
      name,
      getDirectoryHandle: vi
        .fn()
        .mockImplementation(async (subName, options) => {
          const fullPath = [...currentPath, subName].join("/");
          if (!directories.has(fullPath)) {
            if (options?.create) {
              directories.set(
                fullPath,
                createMockDirHandle(subName, [...currentPath, subName]),
              );
            } else {
              const err = new Error("Not Found");
              err.name = "NotFoundError";
              throw err;
            }
          }
          return directories.get(fullPath);
        }),
      getFileHandle: vi.fn().mockImplementation(async (fileName, options) => {
        const fullPath = [...currentPath, fileName].join("/");
        if (!files.has(fullPath)) {
          if (options?.create) {
            files.set(fullPath, "");
          } else {
            const err = new Error("Not Found");
            err.name = "NotFoundError";
            throw err;
          }
        }
        return createMockFileHandle(fileName, [...currentPath, fileName]);
      }),
      removeEntry: vi.fn().mockImplementation(async (entryName) => {
        const fullPath = [...currentPath, entryName].join("/");
        files.delete(fullPath);
        directories.delete(fullPath);
      }),
      entries: vi.fn().mockImplementation(async function* () {
        // This is a simplified version for tests
        yield* [];
      }),
      values: vi.fn().mockImplementation(async function* () {
        yield* [];
      }),
    };
    return handle;
  };

  return createMockDirHandle(rootName, []);
}

/**
 * Creates a robust mock for IndexedDB (idb).
 */
export function createMockIDB() {
  const stores: Record<string, Map<any, any>> = {
    settings: new Map(),
    vaults: new Map(),
    chat_history: new Map(),
    vault_cache: new Map(),
  };

  return {
    get: vi
      .fn()
      .mockImplementation(async (storeName, key) =>
        stores[storeName]?.get(key),
      ),
    put: vi.fn().mockImplementation(async (storeName, val, key) => {
      const k = key || (val && typeof val === "object" ? val.id : undefined);
      stores[storeName]?.set(k, val);
      return k;
    }),
    delete: vi
      .fn()
      .mockImplementation(async (storeName, key) =>
        stores[storeName]?.delete(key),
      ),
    getAll: vi
      .fn()
      .mockImplementation(async (storeName) =>
        Array.from(stores[storeName]?.values() || []),
      ),
    clear: vi
      .fn()
      .mockImplementation(async (storeName) => stores[storeName]?.clear()),
    transaction: vi.fn().mockImplementation((storeNames, _mode) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      return {
        store: {
          get: vi
            .fn()
            .mockImplementation(async (key) => stores[names[0]]?.get(key)),
          put: vi.fn().mockImplementation(async (val, key) => {
            const k =
              key || (val && typeof val === "object" ? val.id : undefined);
            stores[names[0]]?.set(k, val);
            return k;
          }),
          clear: vi
            .fn()
            .mockImplementation(async () => stores[names[0]]?.clear()),
          delete: vi
            .fn()
            .mockImplementation(async (key) => stores[names[0]]?.delete(key)),
        },
        done: Promise.resolve(),
      };
    }),
  };
}
