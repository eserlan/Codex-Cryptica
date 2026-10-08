import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { AppEventBus } from "@codex/events";
import type { JournalCapturePayload } from "session-journal-engine";
import {
  SessionJournalCapture,
  SESSION_JOURNAL_CAPTURE_LISTENER,
} from "./session-journal-capture";

function fakeStore(overrides: Record<string, unknown> = {}) {
  const appended: any[] = [];
  const store = {
    current: {
      id: "journal-1",
      vaultId: "vault-1",
      status: "active",
    } as
      | {
          id: string;
          vaultId: string;
          status: string;
          captureMapMoves?: boolean;
          captureOff?: string[];
        }
      | undefined,
    activeSectionId: undefined as string | undefined,
    appendEntry: vi.fn(async (input: any) => {
      appended.push(input);
      return input;
    }),
    ...overrides,
  };
  return { store, appended };
}

const publish = (
  bus: AppEventBus,
  payload: JournalCapturePayload,
  metadata: Record<string, unknown> = {},
) =>
  bus.emit({
    type: "JOURNAL:CAPTURE",
    domain: "journal",
    payload,
    metadata: { timestamp: 1, ...metadata },
  } as any);

/** Lets the capture queue drain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("SessionJournalCapture", () => {
  let bus: AppEventBus;
  let log: Mock<(message: string, error: unknown) => void>;

  beforeEach(() => {
    bus = new AppEventBus();
    log = vi.fn();
  });

  const make = (
    store: any,
    isCaptureAllowed: () => boolean = () => true,
  ): SessionJournalCapture => {
    const capture = new SessionJournalCapture({
      store,
      bus,
      isCaptureAllowed,
      log,
    });
    capture.start();
    return capture;
  };

  it("appends a captured event to the active journal (FR-025)", async () => {
    const { store, appended } = fakeStore();
    make(store);

    publish(bus, {
      entryType: "dice-roll",
      content: "Rolled 1d20: 14",
      sourceRef: { total: 14 },
    });
    await flush();

    expect(appended).toEqual([
      {
        type: "dice-roll",
        content: "Rolled 1d20: 14",
        sourceRef: { total: 14 },
      },
    ]);
  });

  it("honours the map capture switch without affecting dice capture", async () => {
    const { store, appended } = fakeStore({
      current: {
        id: "journal-1",
        vaultId: "vault-1",
        status: "active",
        captureMapMoves: false,
      },
    });
    make(store);
    publish(bus, { entryType: "map-move", content: "Moved 1 hex (6 mi)." });
    publish(bus, { entryType: "dice-roll", content: "Rolled 1d20: 14" });
    await flush();
    expect(appended).toEqual([expect.objectContaining({ type: "dice-roll" })]);
  });

  it("honours turning map capture off while a map move waits in the save queue", async () => {
    let releaseFirstWrite!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const { store, appended } = fakeStore({
      appendEntry: vi.fn(async (input: any) => {
        if (input.content === "slow dice") await firstWrite;
        appended.push(input);
      }),
    });
    make(store);

    publish(bus, { entryType: "dice-roll", content: "slow dice" });
    publish(bus, { entryType: "map-move", content: "Moved 1 hex (6 mi)." });
    store.current!.captureMapMoves = false;
    releaseFirstWrite();
    await flush();

    expect(appended).toEqual([expect.objectContaining({ type: "dice-roll" })]);
  });

  it("captures map moves by default when the field is absent", async () => {
    const { store, appended } = fakeStore();
    make(store);
    publish(bus, { entryType: "map-move", content: "Moved 1 hex (6 mi)." });
    await flush();
    expect(appended[0].type).toBe("map-move");
  });

  it("puts the entry in the store's current section (FR-032)", async () => {
    const { store, appended } = fakeStore({ activeSectionId: "s1" });
    make(store);

    publish(bus, { entryType: "dice-roll", content: "Rolled 1d6: 3" });
    await flush();

    expect(appended[0].sectionId).toBe("s1");
  });

  it("appends a burst of events in order with none dropped (FR-031)", async () => {
    const saved: any[] = [];
    const { store } = fakeStore({
      appendEntry: vi.fn(async (input: any) => {
        // Slower for the first event, to prove order comes from the queue.
        await new Promise((r) => setTimeout(r, input.content === "1" ? 8 : 0));
        saved.push(input);
      }),
    });
    make(store);

    for (let i = 1; i <= 10; i++) {
      publish(bus, { entryType: "dice-roll", content: String(i) });
    }
    await vi.waitFor(() => expect(saved).toHaveLength(10));

    expect(saved.map((e) => e.content)).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 1)),
    );
  });

  it("appends an entry type it has never seen, unchanged (SC-011)", async () => {
    const { store, appended } = fakeStore();
    make(store);

    publish(bus, {
      entryType: "generator-output",
      content: "A tavern called The Cracked Mug",
      sourceRef: { generator: "tavern" },
    });
    await flush();

    expect(appended[0]).toMatchObject({
      type: "generator-output",
      content: "A tavern called The Cracked Mug",
    });
  });

  it("keeps listening after the bus is reset, because it is named", async () => {
    const { store, appended } = fakeStore();
    make(store);

    bus.reset();
    publish(bus, { entryType: "dice-roll", content: "still here" });
    await flush();

    expect(appended).toHaveLength(1);
  });

  it("registers under its fixed listener name", () => {
    const { store } = fakeStore();
    const subscribe = vi.spyOn(bus, "subscribe");
    make(store);
    expect(subscribe).toHaveBeenCalledWith(
      "JOURNAL:CAPTURE",
      expect.any(Function),
      SESSION_JOURNAL_CAPTURE_LISTENER,
    );
  });

  it("stops listening after stop(), and start() is idempotent", async () => {
    const { store, appended } = fakeStore();
    const capture = make(store);
    capture.start();

    publish(bus, { entryType: "dice-roll", content: "one" });
    await flush();
    expect(appended).toHaveLength(1);

    capture.stop();
    publish(bus, { entryType: "dice-roll", content: "two" });
    await flush();
    expect(appended).toHaveLength(1);
  });

  describe("does nothing, quietly (negative)", () => {
    it("with no journal at all (FR-029)", async () => {
      const { store } = fakeStore({ current: undefined });
      make(store);
      publish(bus, { entryType: "dice-roll", content: "x" });
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });

    it("with an ended journal (FR-029)", async () => {
      const { store } = fakeStore({ current: { status: "ended" } });
      make(store);
      publish(bus, { entryType: "dice-roll", content: "x" });
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });

    it("when the journal ends before the entry is saved", async () => {
      const { store } = fakeStore();
      make(store);
      publish(bus, { entryType: "dice-roll", content: "x" });
      (store as any).current = { status: "ended" };
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });

    it("when another journal becomes active before a queued entry is saved", async () => {
      let release!: () => void;
      const firstSave = new Promise<void>((resolve) => (release = resolve));
      const appended: any[] = [];
      const { store } = fakeStore({
        appendEntry: vi.fn(async (input: any) => {
          if (input.content === "first") await firstSave;
          appended.push(input);
        }),
      });
      make(store);

      publish(bus, { entryType: "dice-roll", content: "first" });
      publish(bus, { entryType: "dice-roll", content: "from old journal" });
      await flush();
      store.current = {
        id: "journal-2",
        vaultId: "vault-2",
        status: "active",
      };
      release();
      await flush();

      expect(appended.map((entry) => entry.content)).toEqual(["first"]);
    });

    it("in a guest session (FR-033)", async () => {
      const { store } = fakeStore();
      make(store, () => false);
      publish(bus, { entryType: "dice-roll", content: "x" });
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
    });

    it("for an event relayed from another tab (FR-031)", async () => {
      const { store } = fakeStore();
      make(store);
      publish(bus, { entryType: "dice-roll", content: "x" }, { remote: true });
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
    });

    it("for a malformed payload", async () => {
      const { store } = fakeStore();
      make(store);
      publish(bus, { entryType: "", content: "x" });
      publish(bus, { entryType: "dice-roll", content: "   " });
      publish(bus, undefined as any);
      await flush();
      expect(store.appendEntry).not.toHaveBeenCalled();
    });
  });

  it("swallows and logs a failure while saving, and keeps going (FR-030)", async () => {
    const appended: any[] = [];
    const { store } = fakeStore({
      appendEntry: vi
        .fn()
        .mockRejectedValueOnce(new Error("storage full"))
        .mockImplementation(async (input: any) => {
          appended.push(input);
        }),
    });
    make(store);

    publish(bus, { entryType: "dice-roll", content: "fails" });
    publish(bus, { entryType: "dice-roll", content: "works" });
    await flush();
    await flush();

    expect(log).toHaveBeenCalledTimes(1);
    expect(appended.map((e) => e.content)).toEqual(["works"]);
  });

  describe("capture switches (spec 174, US4)", () => {
    const KIND_ENTRIES: [string, string][] = [
      ["dice", "dice-roll"],
      ["tables", "table-result"],
      ["decks", "card-draw"],
      ["map-moves", "map-move"],
      ["scenes", "scene"],
      ["oracle", "oracle-answer"],
      ["oracle", "random-event"],
      ["tension", "tension-change"],
      ["threads", "thread-change"],
      ["party", "party-change"],
      ["generated", "generated-result"],
    ];

    it.each(KIND_ENTRIES)(
      "blocks %s entries (%s) when that kind is switched off",
      async (kind, entryType) => {
        const { store, appended } = fakeStore({
          current: {
            id: "journal-1",
            vaultId: "vault-1",
            status: "active",
            captureOff: [kind],
          },
        });
        make(store);
        publish(bus, { entryType, content: "blocked" });
        await flush();
        expect(appended).toEqual([]);
      },
    );

    it("still records every other kind when one is switched off", async () => {
      const { store, appended } = fakeStore({
        current: {
          id: "journal-1",
          vaultId: "vault-1",
          status: "active",
          captureOff: ["oracle"],
        },
      });
      make(store);
      publish(bus, { entryType: "oracle-answer", content: "blocked" });
      publish(bus, { entryType: "dice-roll", content: "Rolled 1d20: 9" });
      publish(bus, { entryType: "tension-change", content: "Tension: 5 → 6" });
      await flush();
      expect(appended.map((e) => e.type)).toEqual([
        "dice-roll",
        "tension-change",
      ]);
    });

    it("honours a kind switched off while an entry waits in the save queue", async () => {
      let releaseFirstWrite!: () => void;
      const firstWrite = new Promise<void>((resolve) => {
        releaseFirstWrite = resolve;
      });
      const { store, appended } = fakeStore({
        appendEntry: vi.fn(async (input: any) => {
          if (input.content === "slow dice") await firstWrite;
          appended.push(input);
        }),
      });
      make(store);
      publish(bus, { entryType: "dice-roll", content: "slow dice" });
      publish(bus, { entryType: "oracle-answer", content: "waiting" });
      store.current!.captureOff = ["oracle"];
      releaseFirstWrite();
      await flush();
      expect(appended.map((e) => e.type)).toEqual(["dice-roll"]);
    });
  });
});
