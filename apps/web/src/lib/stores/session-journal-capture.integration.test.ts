// The real chain, end to end: a roll recorded in the roll history reaches the
// journal through the shared event bus, is saved, and comes back after a
// reload. Kept apart from the listener's own tests so the IndexedDB fake
// below does not leak into them.
(globalThis as any).$effect = (v: any) => v;
(globalThis as any).$effect.root = (v: any) => v();

import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/idb", () => {
  const store = new Map<string, any>();
  return {
    getDB: vi.fn().mockResolvedValue({
      transaction: vi.fn(() => {
        let finish!: () => void;
        const done = new Promise<void>((resolve) => (finish = resolve));
        return {
          store: {
            get: async (id: string) => store.get(`session_journals_${id}`),
            put: async (value: any) => {
              store.set(`session_journals_${value.id}`, value);
              finish();
              return value.id;
            },
            index: () => ({
              getAll: async (vaultId: string) =>
                [...store.values()].filter(
                  (value) => value.vaultId === vaultId,
                ),
            }),
          },
          done,
          abort: finish,
        };
      }),
      get: vi
        .fn()
        .mockImplementation(async (table: string, key: string) =>
          store.get(`${table}_${key}`),
        ),
      put: vi.fn().mockImplementation(async (table: string, val: any) => {
        store.set(`${table}_${val.id}`, val);
        return val.id;
      }),
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getAllFromIndex: vi
        .fn()
        .mockImplementation(
          async (table: string, _index: string, vaultId: string) => {
            const results: any[] = [];
            for (const [key, value] of store) {
              if (key.startsWith(`${table}_`) && value.vaultId === vaultId) {
                results.push(value);
              }
            }
            return results;
          },
        ),
    }),
  };
});

import { AppEventBus } from "@codex/events";
import { DiceHistoryStore } from "./dice-history.svelte";
import { SessionJournalStore } from "./session-journal.svelte";
import { SessionJournalCapture } from "./session-journal-capture";

const ids = (prefix: string) => {
  let n = 0;
  return { uuid: () => `${prefix}-${++n}` };
};
const clock = (start = 1_000) => {
  let now = start;
  return { now: () => now++ };
};

function chain(vaultId: string) {
  const bus = new AppEventBus();
  const journal = new SessionJournalStore(
    { activeVaultId: vaultId } as any,
    ids(`j-${vaultId}`),
    clock(),
  );
  const history = new DiceHistoryStore(ids(`h-${vaultId}`), bus, clock(50_000));
  const capture = new SessionJournalCapture({
    store: journal,
    bus,
    isCaptureAllowed: () => true,
    log: vi.fn(),
  });
  capture.start();
  return { bus, journal, history, capture };
}

const roll = (total: number) => ({
  total,
  timestamp: 1,
  formula: "1d20",
  parts: [{ type: "dice" as const, sides: 20, rolls: [total], value: total }],
});

describe("roll history -> journal, end to end (slice 3)", () => {
  it("one recorded roll becomes exactly one journal entry (SC-009)", async () => {
    const { journal, history } = chain("vault-e2e-1");
    await journal.start();

    await history.addResult(roll(14), "modal");
    await vi.waitFor(() => expect(journal.current?.entries).toHaveLength(1));

    const entry = journal.current!.entries[0];
    expect(entry.type).toBe("dice-roll");
    expect(entry.content).toContain("14");
    expect(entry.sourceRef).toMatchObject({ formula: "1d20", total: 14 });
  });

  it("does nothing, and does not throw, with no active journal (negative, SC-010)", async () => {
    const { journal, history } = chain("vault-e2e-none");

    await expect(history.addResult(roll(7), "chat")).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 30));

    expect(journal.current).toBeUndefined();
    expect(history.history).toHaveLength(1);
  });

  it("captures ten quick rolls in order, none lost (SC-009)", async () => {
    const { journal, history } = chain("vault-e2e-burst");
    await journal.start();

    for (let i = 1; i <= 10; i++) {
      void history.addResult(roll(i), "modal");
    }
    await vi.waitFor(() => expect(journal.current?.entries).toHaveLength(10));

    expect(
      journal.current!.entries.map((e) => (e.sourceRef as any).total),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  describe("durability (FR-034)", () => {
    it("survives a reload, keeps its order among typed notes, and reaches the backup input", async () => {
      const vault = "vault-e2e-durable";
      const { journal, history } = chain(vault);
      await journal.start();

      await journal.appendEntry({ type: "manual-note", content: "before" });
      await history.addResult(roll(17), "modal");
      await vi.waitFor(() => expect(journal.current?.entries).toHaveLength(2));
      await journal.appendEntry({ type: "manual-note", content: "after" });

      const reloaded = new SessionJournalStore(
        { activeVaultId: vault } as any,
        ids("reload"),
        clock(),
      );
      await reloaded.listJournals();

      expect(reloaded.current?.entries.map((e) => e.type)).toEqual([
        "manual-note",
        "dice-roll",
        "manual-note",
      ]);
      // `allJournals` is what the cloud backup payload is built from.
      const captured = reloaded.allJournals[0].entries[1];
      expect(captured.sourceRef).toMatchObject({ total: 17 });
    });

    it("is kept read-only once the journal ends, and later rolls are not added (negative)", async () => {
      const { journal, history } = chain("vault-e2e-ended");
      await journal.start();
      await history.addResult(roll(3), "modal");
      await vi.waitFor(() => expect(journal.current?.entries).toHaveLength(1));

      await journal.end();
      await history.addResult(roll(4), "modal");
      await new Promise((r) => setTimeout(r, 30));

      expect(journal.current?.status).toBe("ended");
      expect(journal.current?.entries).toHaveLength(1);
      await expect(
        journal.appendEntry({ type: "dice-roll", content: "late" }),
      ).rejects.toThrow();
    });
  });
});
