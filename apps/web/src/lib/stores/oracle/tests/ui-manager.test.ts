import { describe, it, expect, beforeEach } from "vitest";
import { OracleUiManager } from "../ui-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleUiManager", () => {
  let manager: OracleUiManager;
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      init: () => Promise.resolve(),
    };
    manager = new OracleUiManager(mockStore as IOracleStore);
  });

  it("should handle visibility", () => {
    expect(manager.isOpen).toBe(false);
    manager.isOpen = true;
    expect(manager.isOpen).toBe(true);
  });

  it("should handle thinking state", () => {
    expect(manager.isThinking).toBe(false);
    manager.updateThinking(1);
    expect(manager.isThinking).toBe(true);
    manager.updateThinking(-1);
    expect(manager.isThinking).toBe(false);
  });

  it("should handle visualization tracking", () => {
    expect(manager.visualizingEntityId).toBeNull();
    manager.visualizingEntityId = "e1";
    expect(manager.visualizingEntityId).toBe("e1");
  });
});
