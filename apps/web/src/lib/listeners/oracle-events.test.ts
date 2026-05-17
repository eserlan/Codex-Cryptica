import { describe, it, expect, vi, afterEach } from "vitest";
import { appEventBus } from "@codex/events";
import { initOracleEventListeners } from "./oracle-events";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import { uiStore } from "../stores/ui.svelte";

vi.mock("../stores/ui.svelte", () => ({
  uiStore: {
    notify: vi.fn(),
  },
}));

afterEach(() => {
  appEventBus.reset();
  vi.clearAllMocks();
});

describe("Oracle Event Listeners Integration", () => {
  it("should notify UI when entity is created", () => {
    initOracleEventListeners();

    appEventBus.emit({
      type: ORACLE_EVENTS.ENTITY_CREATED,
      domain: "oracle",
      payload: { title: "Test Entity", entityId: "123" },
      metadata: { timestamp: Date.now() },
    });

    expect(uiStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("Created: Test Entity"),
      "success",
    );
  });

  it("should notify UI on command failure", () => {
    initOracleEventListeners();

    appEventBus.emit({
      type: ORACLE_EVENTS.COMMAND_FAILED,
      domain: "oracle",
      payload: { error: "Failed to do thing", intent: { type: "chat" } },
      metadata: { timestamp: Date.now() },
    });

    expect(uiStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("Failed to do thing"),
      "error",
    );
  });
});
