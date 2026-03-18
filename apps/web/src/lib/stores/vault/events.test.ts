import { describe, it, expect, vi } from "vitest";
import { VaultEventBus } from "./events";

describe("VaultEventBus", () => {
  it("should subscribe and emit events", () => {
    const bus = new VaultEventBus();
    const listener = vi.fn();

    bus.subscribe(listener);
    bus.emit({ type: "SYNC_COMPLETE", vaultId: "test" });

    expect(listener).toHaveBeenCalledWith({
      type: "SYNC_COMPLETE",
      vaultId: "test",
    });
  });

  it("should handle named subscriptions", () => {
    const bus = new VaultEventBus();
    const listener = vi.fn();

    bus.subscribe(listener, "my-listener");
    bus.emit({ type: "SYNC_COMPLETE", vaultId: "test" });

    expect(listener).toHaveBeenCalled();
  });

  it("should reset anonymous listeners but keep named ones by default", () => {
    const bus = new VaultEventBus();
    const anonListener = vi.fn();
    const namedListener = vi.fn();

    bus.subscribe(anonListener);
    bus.subscribe(namedListener, "named");

    bus.reset();

    bus.emit({ type: "SYNC_COMPLETE", vaultId: "test" });

    expect(anonListener).not.toHaveBeenCalled();
    expect(namedListener).toHaveBeenCalled();
  });

  it("should clear everything when reset(false) is called", () => {
    const bus = new VaultEventBus();
    const namedListener = vi.fn();

    bus.subscribe(namedListener, "named");
    bus.reset(false);

    bus.emit({ type: "SYNC_COMPLETE", vaultId: "test" });

    expect(namedListener).not.toHaveBeenCalled();
  });

  it("should handle async listeners", async () => {
    const bus = new VaultEventBus();
    let called = false;

    bus.subscribe(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      called = true;
    });

    bus.emit({ type: "SYNC_COMPLETE", vaultId: "test" });

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(called).toBe(true);
  });
});
