import { describe, expect, it, vi } from "vitest";
import { AppEventBus } from "@codex/events";
import { initSessionJournalCapture } from "./session-journal-events";

const publish = (bus: AppEventBus) =>
  bus.emit({
    type: "JOURNAL:CAPTURE",
    domain: "journal",
    payload: { entryType: "dice-roll", content: "Rolled 1d20: 5" },
    metadata: { timestamp: 1 },
  } as any);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeStore = () => ({
  current: { status: "active" },
  activeSectionId: undefined,
  appendEntry: vi.fn().mockResolvedValue(undefined),
});

describe("initSessionJournalCapture", () => {
  it("captures published events while the app is running", async () => {
    const bus = new AppEventBus();
    const store = makeStore();
    initSessionJournalCapture({ store, bus, isGuestMode: () => false });

    publish(bus);
    await flush();

    expect(store.appendEntry).toHaveBeenCalledTimes(1);
  });

  it("captures nothing in a guest session (negative, FR-033)", async () => {
    const bus = new AppEventBus();
    const store = makeStore();
    initSessionJournalCapture({ store, bus, isGuestMode: () => true });

    publish(bus);
    await flush();

    expect(store.appendEntry).not.toHaveBeenCalled();
  });

  it("checks guest mode when the event arrives, not when it starts", async () => {
    const bus = new AppEventBus();
    const store = makeStore();
    let guest = false;
    initSessionJournalCapture({ store, bus, isGuestMode: () => guest });

    guest = true;
    publish(bus);
    await flush();

    expect(store.appendEntry).not.toHaveBeenCalled();
  });

  it("stops capturing once the returned function is called", async () => {
    const bus = new AppEventBus();
    const store = makeStore();
    const stop = initSessionJournalCapture({
      store,
      bus,
      isGuestMode: () => false,
    });

    stop();
    publish(bus);
    await flush();

    expect(store.appendEntry).not.toHaveBeenCalled();
  });
});
