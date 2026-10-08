import { describe, expect, it, vi } from "vitest";
import type { VaultFileAccess } from "$lib/services/vault-threads-file";
import { THREADS_PATH } from "$lib/services/vault-threads-file";
import { SoloThreadsStore, type SoloThreadsDeps } from "./solo-threads.svelte";

const memoryFiles = (initial?: string) => {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(THREADS_PATH.join("/"), initial);
  const files: VaultFileAccess = {
    async read(path) {
      return store.get(path.join("/")) ?? null;
    },
    async write(path, text) {
      store.set(path.join("/"), text);
    },
  };
  return { files, store };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function build(
  opts: {
    vault?: string | null;
    files?: VaultFileAccess | null;
    readOnly?: boolean;
    entities?: string[];
    publishCapture?: (p: unknown) => void;
    notify?: (m: string) => void;
  } = {},
) {
  let n = 0;
  const memory = memoryFiles();
  const deps: SoloThreadsDeps = {
    vaultId: () => (opts.vault === undefined ? "v1" : opts.vault),
    files: () => (opts.files === undefined ? memory.files : opts.files),
    readOnly: () => opts.readOnly ?? false,
    entityIds: () => new Set(opts.entities ?? []),
    ids: { uuid: () => `t${++n}` },
    clock: { now: () => 1000 },
    publishCapture:
      (opts.publishCapture as SoloThreadsDeps["publishCapture"]) ?? (() => {}),
    notify: opts.notify ?? vi.fn(),
  };
  return { store: new SoloThreadsStore(deps), memory, deps };
}

describe("SoloThreadsStore", () => {
  it("loads each vault's threads and keeps them apart", async () => {
    const a = memoryFiles();
    const b = memoryFiles();
    const { store } = build({ vault: "a", files: a.files });
    await store.load("a");
    store.add({ title: "In A", kind: "lead" });
    await flush();
    const other = new SoloThreadsStore({
      ...build({ files: b.files }).deps,
      vaultId: () => "b",
    });
    await other.load("b");
    expect(other.threads).toEqual([]);
    await store.load("a");
    expect(store.threads.map((t) => t.title)).toEqual(["In A"]);
  });

  it("adds, edits, closes, reopens and removes, and saves each change", async () => {
    const { store, memory } = build();
    await store.load("v1");
    const added = store.add({
      title: "Why is the keeper lying?",
      kind: "mystery",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    store.close(added.thread.id, "She was his daughter");
    store.reopen(added.thread.id);
    store.edit(added.thread.id, { note: "Check the logbook" });
    await flush();
    const saved = JSON.parse(memory.store.get(THREADS_PATH.join("/"))!);
    expect(saved.threads[0].note).toBe("Check the logbook");
    expect(saved.threads[0].status).toBe("open");
    expect(saved.threads[0].closingNote).toBe("She was his daughter");
    store.remove(added.thread.id);
    await flush();
    expect(
      JSON.parse(memory.store.get(THREADS_PATH.join("/"))!).threads,
    ).toEqual([]);
  });

  it("publishes an opened, closed and reopened capture, but not for edits", async () => {
    const publishCapture = vi.fn();
    const { store } = build({ publishCapture });
    await store.load("v1");
    const added = store.add({ title: "Lead", kind: "lead" });
    if (!added.ok) throw new Error("add failed");
    store.edit(added.thread.id, { note: "more" });
    store.close(added.thread.id, "done");
    store.reopen(added.thread.id);
    const types = publishCapture.mock.calls.map((c) => c[0].content);
    expect(types).toEqual([
      "Thread opened (lead): Lead",
      "Thread closed: Lead — done",
      "Thread reopened: Lead",
    ]);
  });

  it("serialises saves so two quick edits both survive", async () => {
    const { store, memory } = build();
    await store.load("v1");
    const first = store.add({ title: "One", kind: "lead" });
    const second = store.add({ title: "Two", kind: "lead" });
    if (!first.ok || !second.ok) throw new Error("add failed");
    await flush();
    const saved = JSON.parse(memory.store.get(THREADS_PATH.join("/"))!);
    expect(saved.threads.map((t: { title: string }) => t.title)).toEqual([
      "One",
      "Two",
    ]);
  });

  it("keeps the in-memory change and tells the player when a save fails", async () => {
    const notify = vi.fn();
    const failing: VaultFileAccess = {
      read: async () => null,
      write: async () => {
        throw new Error("disk full");
      },
    };
    const { store } = build({ files: failing, notify });
    await store.load("v1");
    store.add({ title: "Kept", kind: "lead" });
    await flush();
    expect(store.threads.map((t) => t.title)).toEqual(["Kept"]);
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("could not be saved"),
    );
  });

  it("refuses edits in a read-only vault, and says so", async () => {
    const notify = vi.fn();
    const { store } = build({ readOnly: true, notify });
    await store.load("v1");
    const result = store.add({ title: "Nope", kind: "lead" });
    expect(result.ok).toBe(false);
    expect(store.threads).toEqual([]);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("read-only"));
  });

  it("never overwrites a file it could not read, and refuses changes", async () => {
    const notify = vi.fn();
    const { store, memory } = build({ notify });
    memory.store.set(
      THREADS_PATH.join("/"),
      JSON.stringify({ version: 9, threads: [] }),
    );
    await store.load("v1");
    expect(store.editable).toBe(false);
    expect(store.add({ title: "Blocked", kind: "lead" }).ok).toBe(false);
    await flush();
    expect(memory.store.get(THREADS_PATH.join("/"))).toContain('"version":9');
    expect(notify).toHaveBeenCalled();
  });

  it("drops links to entries that were deleted, when the file is loaded", async () => {
    const { store, memory } = build({ entities: ["keep"] });
    memory.store.set(
      THREADS_PATH.join("/"),
      JSON.stringify({
        version: 1,
        threads: [
          {
            id: "t1",
            title: "Keeper",
            kind: "mystery",
            note: "",
            status: "open",
            closingNote: "",
            entityIds: ["keep", "gone"],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      }),
    );
    await store.load("v1");
    expect(store.threads[0].entityIds).toEqual(["keep"]);
  });

  it("starts empty with no vault and when the vault has no file access", async () => {
    const none = build({ vault: null });
    await none.store.load(null);
    expect(none.store.threads).toEqual([]);
    const guest = build({ files: null });
    await guest.store.load("v1");
    expect(guest.store.threads).toEqual([]);
  });

  it("clears the old vault's threads and refuses edits while a new vault loads", async () => {
    const stores = new Map<string, Map<string, string>>([
      [
        "a",
        new Map([
          [
            THREADS_PATH.join("/"),
            JSON.stringify({
              version: 1,
              threads: [
                {
                  id: "a1",
                  title: "In A",
                  kind: "lead",
                  note: "",
                  status: "open",
                  closingNote: "",
                  entityIds: [],
                  createdAt: 1,
                  updatedAt: 1,
                },
              ],
            }),
          ],
        ]),
      ],
      ["b", new Map()],
    ]);
    let releaseB!: () => void;
    const bRead = new Promise<void>((resolve) => {
      releaseB = resolve;
    });
    let current = "a";
    const store = new SoloThreadsStore({
      vaultId: () => current,
      files: (vaultId) => ({
        read: async (path) => {
          if (vaultId === "b") await bRead;
          return stores.get(vaultId)!.get(path.join("/")) ?? null;
        },
        write: async (path, text) => {
          stores.get(vaultId)!.set(path.join("/"), text);
        },
      }),
      readOnly: () => false,
      entityIds: () => new Set(),
      ids: { uuid: () => "new" },
      clock: { now: () => 2 },
      publishCapture: () => {},
      notify: () => {},
    });
    await store.load("a");
    expect(store.threads.map((t) => t.title)).toEqual(["In A"]);

    current = "b";
    const loading = store.load("b");
    expect(store.threads).toEqual([]);
    expect(store.editable).toBe(false);
    expect(store.add({ title: "Sneaks into B", kind: "lead" }).ok).toBe(false);

    releaseB();
    await loading;
    await flush();
    expect(store.editable).toBe(true);
    expect(stores.get("b")!.has(THREADS_PATH.join("/"))).toBe(false);
    expect(
      JSON.parse(stores.get("a")!.get(THREADS_PATH.join("/"))!).threads,
    ).toHaveLength(1);
  });

  it("a save queued before a vault switch still lands in the vault it was made for", async () => {
    const stores = new Map<string, Map<string, string>>([
      ["a", new Map()],
      ["b", new Map()],
    ]);
    let releaseWrite!: () => void;
    const slowWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let current = "a";
    const store = new SoloThreadsStore({
      vaultId: () => current,
      files: (vaultId) => ({
        read: async (path) => stores.get(vaultId)!.get(path.join("/")) ?? null,
        write: async (path, text) => {
          if (vaultId === "a") await slowWrite;
          stores.get(vaultId)!.set(path.join("/"), text);
        },
      }),
      readOnly: () => false,
      entityIds: () => new Set(),
      ids: {
        uuid: (() => {
          let n = 0;
          return () => `t${++n}`;
        })(),
      },
      clock: { now: () => 2 },
      publishCapture: () => {},
      notify: () => {},
    });
    await store.load("a");
    store.add({ title: "Belongs to A", kind: "lead" });

    current = "b";
    await store.load("b");
    releaseWrite();
    await flush();
    await flush();

    const savedA = JSON.parse(stores.get("a")!.get(THREADS_PATH.join("/"))!);
    expect(savedA.threads.map((t: { title: string }) => t.title)).toEqual([
      "Belongs to A",
    ]);
    expect(stores.get("b")!.has(THREADS_PATH.join("/"))).toBe(false);
  });
});
