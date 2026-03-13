import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEditState } from "./useEditState.svelte";
import { createZenModeActions } from "./useZenModeActions.svelte";
import type { Entity } from "schema";

describe("ZenMode Hooks", () => {
  const mockEntity: Entity = {
    id: "test-id",
    title: "Initial Title",
    content: "Initial Content",
    type: "npc",
    connections: [],
    tags: [],
    labels: [],
  };

  describe("useEditState", () => {
    it("should initialize with isEditing as false", () => {
      const state = createEditState(null);
      expect(state.isEditing).toBe(false);
    });

    it("should populate buffer when started", () => {
      const state = createEditState(null);
      state.start(mockEntity);
      expect(state.isEditing).toBe(true);
      expect(state.title).toBe(mockEntity.title);
      expect(state.content).toBe(mockEntity.content);
    });

    it("should reset isEditing when canceled", () => {
      const state = createEditState(null);
      state.start(mockEntity);
      state.cancel();
      expect(state.isEditing).toBe(false);
    });
  });

  describe("useZenModeActions", () => {
    let mockVault: any;
    let mockUiStore: any;
    let mockEditState: any;

    beforeEach(() => {
      mockVault = {
        updateEntity: vi.fn().mockResolvedValue(undefined),
        deleteEntity: vi.fn().mockResolvedValue(undefined),
      };
      mockUiStore = {
        notify: vi.fn(),
      };
      mockEditState = createEditState(null);
      mockEditState.start(mockEntity);
    });

    it("should call updateEntity on save", async () => {
      const actions = createZenModeActions(mockEditState, {
        vault: mockVault,
        uiStore: mockUiStore,
      });
      mockEditState.title = "New Title";
      await actions.saveChanges("test-id");
      expect(mockVault.updateEntity).toHaveBeenCalledWith(
        "test-id",
        expect.objectContaining({
          title: "New Title",
        }),
      );
      expect(mockEditState.isEditing).toBe(false);
    });
  });
});
