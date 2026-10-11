import { describe, expect, it } from "vitest";
import { createThread, type Thread } from "solo-session-engine";
import {
  THREADS_PATH,
  loadThreads,
  saveThreads,
  type VaultFileAccess,
} from "./vault-threads-file";

const memoryFiles = (
  initial?: string,
): VaultFileAccess & { store: Map<string, string> } => {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(THREADS_PATH.join("/"), initial);
  return {
    store,
    async read(path) {
      return store.get(path.join("/")) ?? null;
    },
    async write(path, text) {
      store.set(path.join("/"), text);
    },
  };
};

const thread = (title: string): Thread => {
  const r = createThread(
    { title, kind: "lead" },
    { ids: { uuid: () => title }, clock: { now: () => 1000 } },
    [],
  );
  if (!r.ok) throw new Error(r.error);
  return r.thread;
};

describe("vault threads file", () => {
  it("reads no threads when the file does not exist yet", async () => {
    expect(await loadThreads(memoryFiles())).toEqual({
      threads: [],
      valid: true,
    });
  });

  it("round-trips threads through save and load", async () => {
    const files = memoryFiles();
    await saveThreads(files, [thread("Why is the keeper lying?")]);
    const loaded = await loadThreads(files);
    expect(loaded.valid).toBe(true);
    expect(loaded.threads.map((t) => t.title)).toEqual([
      "Why is the keeper lying?",
    ]);
  });

  it("marks a file that is not valid JSON as invalid, so it is not overwritten", async () => {
    const files = memoryFiles("{ not json");
    expect(await loadThreads(files)).toEqual({ threads: [], valid: false });
  });

  it("marks a file with another version as invalid", async () => {
    const files = memoryFiles(JSON.stringify({ version: 2, threads: [] }));
    expect((await loadThreads(files)).valid).toBe(false);
  });

  it("lets a write error reach the caller", async () => {
    const files: VaultFileAccess = {
      read: async () => null,
      write: async () => {
        throw new Error("disk full");
      },
    };
    await expect(saveThreads(files, [])).rejects.toThrow("disk full");
  });
});

/** A minimal in-memory OPFS directory, enough for the folder walk and the threads file. */
function fakeDirectory(name = "root") {
  type Node =
    | { kind: "file"; name: string; text: string }
    | { kind: "directory"; name: string; children: Map<string, Node> };
  const children = new Map<string, Node>();
  const dir = {
    kind: "directory" as const,
    name,
    async *entries() {
      for (const [key, node] of children) yield [key, handleFor(node)] as const;
    },
    async getDirectoryHandle(child: string, opts?: { create?: boolean }) {
      let node = children.get(child);
      if (!node) {
        if (!opts?.create)
          throw Object.assign(new Error("missing"), { name: "NotFoundError" });
        node = { kind: "directory", name: child, children: new Map() };
        children.set(child, node);
      }
      if (node.kind !== "directory") throw new Error("not a directory");
      return handleFor(node) as never;
    },
    async getFileHandle(child: string, opts?: { create?: boolean }) {
      let node = children.get(child);
      if (!node) {
        if (!opts?.create)
          throw Object.assign(new Error("missing"), { name: "NotFoundError" });
        node = { kind: "file", name: child, text: "" };
        children.set(child, node);
      }
      if (node.kind !== "file") throw new Error("not a file");
      return handleFor(node) as never;
    },
    async removeEntry(child: string) {
      children.delete(child);
    },
  };
  function handleFor(node: Node): unknown {
    if (node.kind === "directory") {
      const sub = node.children;
      return {
        kind: "directory",
        name: node.name,
        async *entries() {
          for (const [key, child] of sub)
            yield [key, handleFor(child)] as const;
        },
        async getDirectoryHandle(child: string, opts?: { create?: boolean }) {
          let next = sub.get(child);
          if (!next) {
            if (!opts?.create)
              throw Object.assign(new Error("missing"), {
                name: "NotFoundError",
              });
            next = { kind: "directory", name: child, children: new Map() };
            sub.set(child, next);
          }
          return handleFor(next);
        },
        async getFileHandle(child: string, opts?: { create?: boolean }) {
          let next = sub.get(child);
          if (!next) {
            if (!opts?.create)
              throw Object.assign(new Error("missing"), {
                name: "NotFoundError",
              });
            next = { kind: "file", name: child, text: "" };
            sub.set(child, next);
          }
          return handleFor(next);
        },
        async removeEntry(child: string) {
          sub.delete(child);
        },
      };
    }
    return {
      kind: "file",
      name: node.name,
      async getFile() {
        return new Blob([node.text]);
      },
      async createWritable() {
        let buffer = "";
        return {
          async write(data: string) {
            buffer = data;
          },
          async close() {
            node.text = buffer;
          },
        };
      },
    };
  }
  return { dir, children };
}

describe("threads file in a vault folder", () => {
  it("is part of the folder walk, so folder saves and exports include it", async () => {
    const { walkOpfsDirectory } = await import("$lib/utils/opfs");
    const { dir } = fakeDirectory();
    const files = await (
      await import("./vault-threads-file")
    ).opfsVaultFiles(dir as never, "v1");
    await files.write(
      THREADS_PATH,
      JSON.stringify({ version: 1, threads: [] }),
    );
    const walked = await walkOpfsDirectory(dir as never);
    expect(walked.map((entry) => entry.path.join("/"))).toContain(
      ".codex/threads.json",
    );
  });

  it("keeps the threads when the file is read back from the folder", async () => {
    const { opfsVaultFiles } = await import("./vault-threads-file");
    const { dir } = fakeDirectory();
    const files = opfsVaultFiles(dir as never, "v1");
    const thread = createThread(
      { title: "Why is the keeper lying?", kind: "mystery" },
      { ids: { uuid: () => "t1" }, clock: { now: () => 1 } },
      [],
    );
    if (!thread.ok) throw new Error("create failed");
    await saveThreads(files, [thread.thread]);
    const loaded = await loadThreads(opfsVaultFiles(dir as never, "v1"));
    expect(loaded.valid).toBe(true);
    expect(loaded.threads.map((t) => t.title)).toEqual([
      "Why is the keeper lying?",
    ]);
  });
});
