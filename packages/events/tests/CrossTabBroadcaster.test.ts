import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppEventBus } from "../src/AppEventBus";
import { CrossTabBroadcaster } from "../src/CrossTabBroadcaster";
import type { AppEvent } from "../src/types";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  onmessage: ((message: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();

  constructor(public name: string) {
    MockBroadcastChannel.instances.push(this);
  }

  receive(data: unknown): void {
    this.onmessage?.({ data });
  }
}

describe("CrossTabBroadcaster", () => {
  let bus: AppEventBus;
  let broadcaster: CrossTabBroadcaster;

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    bus = new AppEventBus();
    broadcaster = new CrossTabBroadcaster(bus);
  });

  afterEach(() => {
    broadcaster.destroy();
    vi.unstubAllGlobals();
  });

  it("broadcasts local sync events as JSON strings", () => {
    const event: AppEvent = {
      type: "ORACLE:UNDO_PERFORMED",
      domain: "oracle",
      payload: { messageId: "m1" },
      metadata: { timestamp: 1, sync: true },
    };

    bus.emit(event);

    const channel = MockBroadcastChannel.instances[0];
    expect(channel.postMessage).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it("does not rebroadcast remote events", () => {
    const event: AppEvent = {
      type: "ORACLE:UNDO_PERFORMED",
      domain: "oracle",
      payload: { messageId: "m1" },
      metadata: { timestamp: 1, sync: true, remote: true },
    };

    bus.emit(event);

    expect(
      MockBroadcastChannel.instances[0].postMessage,
    ).not.toHaveBeenCalled();
  });

  it("re-emits valid remote events with remote metadata", () => {
    const listener = vi.fn();
    bus.subscribe("ORACLE:*", listener);

    const event: AppEvent = {
      type: "ORACLE:UNDO_PERFORMED",
      domain: "oracle",
      payload: { messageId: "m1" },
      metadata: { timestamp: 1, sync: true },
    };

    MockBroadcastChannel.instances[0].receive(JSON.stringify(event));

    expect(listener).toHaveBeenCalledWith({
      ...event,
      metadata: { ...event.metadata, remote: true },
    });
    expect(
      MockBroadcastChannel.instances[0].postMessage,
    ).not.toHaveBeenCalled();
  });

  it("rejects malformed remote messages", () => {
    const listener = vi.fn();
    bus.subscribe("*", listener);

    MockBroadcastChannel.instances[0].receive("not json");
    MockBroadcastChannel.instances[0].receive(JSON.stringify({ type: "NOPE" }));
    MockBroadcastChannel.instances[0].receive({
      type: "ORACLE:UNDO_PERFORMED",
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("unsubscribes and closes the channel on destroy", () => {
    const event: AppEvent = {
      type: "ORACLE:UNDO_PERFORMED",
      domain: "oracle",
      payload: { messageId: "m1" },
      metadata: { timestamp: 1, sync: true },
    };
    const channel = MockBroadcastChannel.instances[0];

    broadcaster.destroy();
    bus.emit(event);

    expect(channel.close).toHaveBeenCalled();
    expect(channel.postMessage).not.toHaveBeenCalled();
  });
});
