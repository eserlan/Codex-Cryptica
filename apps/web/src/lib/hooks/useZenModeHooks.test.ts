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

    it("hydrates content for the active edit session even without a selected entity", async () => {
      const mockVault = {
        selectedEntityId: null,
        entities: {
          "test-id": {
            ...mockEntity,
            content: "Hydrated Content",
            lore: "Hydrated Lore",
          },
        },
        loadEntityContent: vi.fn().mockResolvedValue(undefined),
      };

      const state = createEditState(null, mockVault);
      state.start({ ...mockEntity, content: "", lore: "" });

      await Promise.resolve();

      expect(mockVault.loadEntityContent).toHaveBeenCalledWith("test-id");
      expect(state.content).toBe("Hydrated Content");
      expect(state.lore).toBe("Hydrated Lore");
    });

    it("does not overwrite user edits when hydration finishes late", async () => {
      let resolveLoad!: () => void;
      const mockVault = {
        selectedEntityId: null,
        entities: {
          "test-id": {
            ...mockEntity,
            content: "Hydrated Content",
            lore: "Hydrated Lore",
          },
        },
        loadEntityContent: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveLoad = resolve;
            }),
        ),
      };

      const state = createEditState(null, mockVault);
      state.start({ ...mockEntity, content: "", lore: "" });
      state.content = "User draft";
      state.lore = "User lore";

      resolveLoad();
      await Promise.resolve();

      expect(state.content).toBe("User draft");
      expect(state.lore).toBe("User lore");
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
