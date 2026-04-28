import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppEventBus } from "../src/AppEventBus";
import type { AppEvent } from "../src/types";

describe("AppEventBus", () => {
  let bus: AppEventBus;

  beforeEach(() => {
    bus = new AppEventBus();
  });

  it("should subscribe and emit specific events", () => {
    const listener = vi.fn();
    bus.subscribe("VAULT:ENTITY_UPDATED", listener);

    const event: AppEvent = {
      type: "VAULT:ENTITY_UPDATED",
      domain: "vault",
      payload: { id: "1", patch: {} },
      metadata: { timestamp: Date.now() },
    };

    bus.emit(event);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("should support domain wildcard filtering", () => {
    const listener = vi.fn();
    bus.subscribe("VAULT:*", listener);

    const event1: AppEvent = {
      type: "VAULT:ENTITY_UPDATED",
      domain: "vault",
      payload: { id: "1", patch: {} },
      metadata: { timestamp: Date.now() },
    };

    const event2: AppEvent = {
      type: "VAULT:VAULT_SWITCHED",
      domain: "vault",
      payload: { id: "v1" },
      metadata: { timestamp: Date.now() },
    };

    const event3: AppEvent = {
      type: "UI:SIDEBAR_TOGGLED",
      domain: "ui",
      payload: { open: true },
      metadata: { timestamp: Date.now() },
    };

    bus.emit(event1);
    bus.emit(event2);
    bus.emit(event3);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(event1);
    expect(listener).toHaveBeenCalledWith(event2);
  });

  it("should support global wildcard filtering", () => {
    const listener = vi.fn();
    bus.subscribe("*", listener);

    bus.emit({
      type: "UI:SIDEBAR_TOGGLED",
      domain: "ui",
      payload: { open: true },
      metadata: { timestamp: Date.now() },
    } as AppEvent);

    expect(listener).toHaveBeenCalled();
  });

  it("should prevent duplicate named listeners", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.subscribe("VAULT:*", listener1, "test-listener");
    bus.subscribe("VAULT:*", listener2, "test-listener");

    bus.emit({
      type: "VAULT:VAULT_SWITCHED",
      domain: "vault",
      payload: { id: "v1" },
      metadata: { timestamp: Date.now() },
    });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it("should preserve named listeners when reset is called", () => {
    const namedListener = vi.fn();
    const anonymousListener = vi.fn();

    bus.subscribe("VAULT:*", namedListener, "long-lived-service");
    bus.subscribe("VAULT:*", anonymousListener);

    bus.reset();

    bus.emit({
      type: "VAULT:VAULT_SWITCHED",
      domain: "vault",
      payload: { id: "v1" },
      metadata: { timestamp: Date.now() },
    });

    expect(namedListener).toHaveBeenCalledTimes(1);
    expect(anonymousListener).not.toHaveBeenCalled();
  });

  it("should not let an old unsubscribe remove a newer named listener", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const oldUnsubscribe = bus.subscribe("VAULT:*", listener1, "replaceable");
    bus.subscribe("VAULT:*", listener2, "replaceable");

    oldUnsubscribe();

    bus.emit({
      type: "VAULT:VAULT_SWITCHED",
      domain: "vault",
      payload: { id: "v1" },
      metadata: { timestamp: Date.now() },
    });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("should cleanup listeners on unsubscribe", () => {
    const listener = vi.fn();
    const unsub = bus.subscribe("VAULT:*", listener);

    unsub();

    bus.emit({
      type: "VAULT:VAULT_SWITCHED",
      domain: "vault",
      payload: { id: "v1" },
      metadata: { timestamp: Date.now() },
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("should isolate listener errors", () => {
    const faultyListener = vi.fn(() => {
      throw new Error("Boom");
    });
    const healthyListener = vi.fn();

    bus.subscribe("*", faultyListener);
    bus.subscribe("*", healthyListener);

    bus.emit({
      type: "UI:SIDEBAR_TOGGLED",
      domain: "ui",
      payload: { open: true },
      metadata: { timestamp: Date.now() },
    } as AppEvent);

    expect(healthyListener).toHaveBeenCalled();
  });
});
