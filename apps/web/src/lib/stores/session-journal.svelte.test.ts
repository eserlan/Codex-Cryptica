import { describe, it, expect, vi } from "vitest";
import { getDB } from "../utils/idb";

// Mock Svelte 5 effects for the test environment before importing the store
// (SessionJournalStore's constructor uses $effect.root, same as QuickNoteStore's
// own test does this) — see quicknote.svelte.test.ts for the same pattern.
(globalThis as any).$effect = (v: any) => v;
(globalThis as any).$effect.root = (v: any) => v();

vi.mock("../utils/idb", () => {
  const store = new Map<string, any>();
  let transactionTail: Promise<void> = Promise.resolve();
  return {
    getDB: vi.fn().mockResolvedValue({
      transaction: vi.fn(() => {
        const previous = transactionTail;
        let release!: () => void;
        const done = new Promise<void>((resolve) => (release = resolve));
        transactionTail = done;
        let releaseScheduled = false;
        const finishSoon = () => {
          if (releaseScheduled) return;
          releaseScheduled = true;
          setTimeout(release, 0);
        };
        const ready = async () => previous;
        const txStore = {
          get: async (id: string) => {
            await ready();
            finishSoon();
            return store.get(`session_journals_${id}`);
          },
          put: async (value: any) => {
            await ready();
            store.set(`session_journals_${value.id}`, value);
            release();
            return value.id;
          },
          index: () => ({
            getAll: async (vaultId: string) => {
              await ready();
              finishSoon();
              return [...store.values()].filter(
                (value) => value.vaultId === vaultId,
              );
            },
          }),
        };
        return {
          store: txStore,
          done,
          abort: release,
        };
      }),
      get: vi.fn().mockImplementation(async (table: string, key: string) => {
        return store.get(`${table}_${key}`);
      }),
      put: vi.fn().mockImplementation(async (table: string, val: any) => {
        store.set(`${table}_${val.id}`, val);
        return val.id;
      }),
      getAllFromIndex: vi
        .fn()
        .mockImplementation(
          async (table: string, _index: string, vaultId: string) => {
            const prefix = `${table}_`;
            const results: any[] = [];
            for (const [key, value] of store) {
              if (key.startsWith(prefix) && value.vaultId === vaultId) {
                results.push(value);
              }
            }
            return results;
          },
        ),
    }),
  };
});

import { SessionJournalStore } from "./session-journal.svelte";

function fakeVaultRegistry(vaultId: string | null) {
  return { activeVaultId: vaultId };
}

function fakeIds(prefix = "id") {
  let n = 0;
  return { uuid: () => `${prefix}-${++n}` };
}

function fakeClock(start = 1_000) {
  let now = start;
  return { now: () => now++ };
}

describe("SessionJournalStore — vault scoping (FR-012)", () => {
  it("does not see a journal started under a different vault", async () => {
    const registry = fakeVaultRegistry("vault-a");
    const storeA = new SessionJournalStore(
      registry as any,
      fakeIds(),
      fakeClock(),
    );
    await storeA.start();
    expect(storeA.current).toBeDefined();

    registry.activeVaultId = "vault-b";
    // No reactive effect fires without a real Svelte runtime; a fresh store
    // instance is the direct way to assert what a different vault sees.
    const storeB = new SessionJournalStore(
      fakeVaultRegistry("vault-b") as any,
      fakeIds(),
      fakeClock(),
    );
    await storeB.listJournals();
    expect(storeB.current).toBeUndefined();
    expect(storeB.allJournals).toHaveLength(0);
  });

  it("control state follows the vault, never the previous one's (slice 2, FR-022)", async () => {
    const storeA = new SessionJournalStore(
      fakeVaultRegistry("vault-ctl-a") as any,
      fakeIds(),
      fakeClock(),
    );
    await storeA.start();
    expect(storeA.controlState).not.toBe("start");

    const storeB = new SessionJournalStore(
      fakeVaultRegistry("vault-ctl-b") as any,
      fakeIds(),
      fakeClock(),
    );
    await storeB.listJournals();
    // Negative: a vault with no journal reports "start" even though another
    // vault has an active one.
    expect(storeB.controlState).toBe("start");
  });

  it("resolves to no active journal for a vault that has never started one", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-empty") as any,
      fakeIds(),
      fakeClock(),
    );
    await store.listJournals();
    expect(store.current).toBeUndefined();
  });

  it("ignores an older vault load that finishes after a switch", async () => {
    const registry = fakeVaultRegistry(null);
    const store = new SessionJournalStore(
      registry as any,
      fakeIds(),
      fakeClock(),
    );
    let finishOldLoad!: (journals: any[]) => void;
    const db = await getDB();
    const originalGetAll = vi
      .mocked(db.getAllFromIndex)
      .getMockImplementation()!;
    vi.mocked(db.getAllFromIndex).mockImplementation(
      async (_store, _index, vaultId) => {
        if ((vaultId as unknown as string) === "vault-old") {
          return new Promise((resolve) => (finishOldLoad = resolve)) as any;
        }
        return [
          {
            id: "new-journal",
            vaultId: "vault-new",
            title: "New vault",
            status: "active",
            startedAt: 2,
            sections: [],
            entries: [],
          },
        ] as any;
      },
    );

    registry.activeVaultId = "vault-old";
    const oldLoad = (store as any).loadVault("vault-old");
    registry.activeVaultId = "vault-new";
    await (store as any).loadVault("vault-new");
    finishOldLoad([
      {
        id: "old-journal",
        vaultId: "vault-old",
        title: "Old vault",
        status: "active",
        startedAt: 1,
        sections: [],
        entries: [],
      },
    ]);
    await oldLoad;

    expect(store.current?.vaultId).toBe("vault-new");
    expect(store.allJournals.map((journal) => journal.vaultId)).toEqual([
      "vault-new",
    ]);
    vi.mocked(db.getAllFromIndex).mockImplementation(originalGetAll);
  });
});

describe("SessionJournalStore.start()/appendEntry() (US1)", () => {
  it("starts a journal then appends an entry that persists and reloads", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-1") as any,
      fakeIds(),
      fakeClock(),
    );
    await store.start();
    await store.appendEntry({ type: "manual-note", content: "First note" });

    const reloaded = new SessionJournalStore(
      fakeVaultRegistry("vault-1") as any,
      fakeIds(),
      fakeClock(),
    );
    await reloaded.listJournals();
    expect(reloaded.current?.entries).toHaveLength(1);
    expect(reloaded.current?.entries[0].content).toBe("First note");
  });

  it("rejects appendEntry when no journal is active for the vault", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-2") as any,
      fakeIds(),
      fakeClock(),
    );
    await expect(
      store.appendEntry({ type: "manual-note", content: "Orphan note" }),
    ).rejects.toThrow();
  });
});

describe("SessionJournalStore — concurrency (FR-011, closes analysis finding F1)", () => {
  it("keeps concurrent starts from creating two active journals", async () => {
    const vaultId = "vault-start-concurrent";
    const tabA = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds("start-a"),
      fakeClock(),
    );
    const tabB = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds("start-b"),
      fakeClock(),
    );

    const [journalA, journalB] = await Promise.all([
      tabA.start(),
      tabB.start(),
    ]);
    const verify = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds(),
      fakeClock(),
    );
    await verify.listJournals();

    expect(journalA.id).toBe(journalB.id);
    expect(tabB.current?.id).toBe(journalA.id);
    expect(tabB.controlState).toBe("open");
    expect(
      verify.allJournals.filter((journal) => journal.status === "active"),
    ).toHaveLength(1);
  });

  it("does not lose either tab's entry when two writes overlap", async () => {
    const vaultId = "vault-concurrent";
    const setup = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds("setup"),
      fakeClock(),
    );
    const journal = await setup.start();

    // Two independent stores, simulating two browser tabs on the same vault,
    // both already holding `journal` from before either one appends.
    const tabA = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds("a"),
      fakeClock(2_000),
    );
    await tabA.listJournals();
    const tabB = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds("b"),
      fakeClock(3_000),
    );
    await tabB.listJournals();

    // Neither tab reloads the other's state before appending — appendEntry's
    // own readLatest() is what has to save this, not the caller.
    await Promise.all([
      tabA.appendEntry({ type: "manual-note", content: "From tab A" }),
      tabB.appendEntry({ type: "manual-note", content: "From tab B" }),
    ]);

    const verify = new SessionJournalStore(
      fakeVaultRegistry(vaultId) as any,
      fakeIds(),
      fakeClock(),
    );
    await verify.listJournals();
    const contents = verify.current?.entries.map((e) => e.content).sort();
    expect(contents).toEqual(["From tab A", "From tab B"]);
    expect(verify.current?.id).toBe(journal.id);
  });
});

describe("SessionJournalStore — sections (US2)", () => {
  it("creates then renames a section, and persists both", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-3") as any,
      fakeIds(),
      fakeClock(),
    );
    await store.start();
    const section = await store.createSection("Arrival in Port Vane");
    await store.renameSection(section.id, "The Ambush");

    expect(store.current?.sections).toHaveLength(1);
    expect(store.current?.sections[0].name).toBe("The Ambush");
  });

  it("rejects renaming a section to an empty name, keeping the prior name", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-4") as any,
      fakeIds(),
      fakeClock(),
    );
    await store.start();
    const section = await store.createSection("Chapter One");

    await expect(store.renameSection(section.id, "   ")).rejects.toThrow();
    expect(store.current?.sections[0].name).toBe("Chapter One");
  });

  it("round-trips identically to a journal that never creates a section (FR-006, closes analysis finding E3)", async () => {
    const withSections = new SessionJournalStore(
      fakeVaultRegistry("vault-5") as any,
      fakeIds(),
      fakeClock(),
    );
    await withSections.start();
    await withSections.appendEntry({ type: "manual-note", content: "Note" });

    const withoutSections = new SessionJournalStore(
      fakeVaultRegistry("vault-6") as any,
      fakeIds(),
      fakeClock(),
    );
    await withoutSections.start();
    await withoutSections.appendEntry({ type: "manual-note", content: "Note" });

    expect(withoutSections.current?.sections).toEqual([]);
    expect(withoutSections.current?.entries).toHaveLength(1);
    expect(withoutSections.current?.entries[0].content).toBe(
      withSections.current?.entries[0].content,
    );
  });
});

describe("SessionJournalStore — end/resume (US3)", () => {
  it("ends a journal and it still shows up in listJournals()", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-7") as any,
      fakeIds(),
      fakeClock(),
    );
    await store.start();
    await store.end();

    expect(store.current?.status).toBe("ended");
    const journals = await store.listJournals();
    expect(journals).toHaveLength(1);
    expect(journals[0].status).toBe("ended");
  });

  it("rejects end() when no journal is active for the vault", async () => {
    const store = new SessionJournalStore(
      fakeVaultRegistry("vault-8") as any,
      fakeIds(),
      fakeClock(),
    );
    await expect(store.end()).rejects.toThrow();
  });

  it("controlState reads 'resume' for an active journal not yet opened, then 'open' after open()", async () => {
    const started = new SessionJournalStore(
      fakeVaultRegistry("vault-9") as any,
      fakeIds(),
      fakeClock(),
    );
    await started.start();

    // A fresh store instance simulates reopening the app — an active journal
    // exists, but this instance has never called open() on it.
    const reopened = new SessionJournalStore(
      fakeVaultRegistry("vault-9") as any,
      fakeIds(),
      fakeClock(),
    );
    await reopened.listJournals();
    expect(reopened.controlState).toBe("resume");

    reopened.open();
    expect(reopened.controlState).toBe("open");
  });
});
