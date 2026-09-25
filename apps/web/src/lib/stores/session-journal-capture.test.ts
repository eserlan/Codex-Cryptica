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
    current: { status: "active" } as { status: string } | undefined,
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
    await new Promise((r) => setTimeout(r, 60));

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
});
