import { describe, it, expect, vi, afterEach } from "vitest";
import { appEventBus } from "@codex/events";
import { initOracleEventListeners } from "$lib/listeners/oracle-events";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

afterEach(() => {
  appEventBus.reset();
  vi.clearAllMocks();
});

describe("Oracle Event Listeners Integration", () => {
  afterEach(() => {
    notificationStore.notify = vi.fn();
  });

  it("should notify UI when entity is created", () => {
    notificationStore.notify = vi.fn();
    initOracleEventListeners();

    appEventBus.emit({
      type: ORACLE_EVENTS.ENTITY_CREATED,
      domain: "oracle",
      payload: { title: "Test Entity", entityId: "123" },
      metadata: { timestamp: Date.now() },
    });

    expect(notificationStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("Created: Test Entity"),
      "success",
    );
  });

  it("should notify UI on command failure", () => {
    notificationStore.notify = vi.fn();
    initOracleEventListeners();

    appEventBus.emit({
      type: ORACLE_EVENTS.COMMAND_FAILED,
      domain: "oracle",
      payload: { error: "Failed to do thing", intent: { type: "chat" } },
      metadata: { timestamp: Date.now() },
    });

    expect(notificationStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("Failed to do thing"),
      "error",
    );
  });
});
