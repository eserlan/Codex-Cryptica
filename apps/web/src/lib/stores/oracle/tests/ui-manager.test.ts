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

  describe("pending prompt (Solo Play Loop, FR-019)", () => {
    it("holds a prompt until the chat takes it", () => {
      manager.setPendingPrompt("How does this NPC react?");
      expect(manager.pendingPrompt).toBe("How does this NPC react?");
      expect(manager.takePendingPrompt()).toBe("How does this NPC react?");
      expect(manager.pendingPrompt).toBeNull();
      expect(manager.takePendingPrompt()).toBeNull();
    });

    it("trims the prompt, and empty text clears it", () => {
      manager.setPendingPrompt("  Add a complication  ");
      expect(manager.pendingPrompt).toBe("Add a complication");
      manager.setPendingPrompt("   ");
      expect(manager.pendingPrompt).toBeNull();
    });

    it("does not send anything: setting a prompt never calls the store", () => {
      let asked = 0;
      mockStore.ask = () => {
        asked += 1;
        return Promise.resolve();
      };
      manager.setPendingPrompt("What happens next?");
      expect(asked).toBe(0);
    });
  });
});
