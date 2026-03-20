import { describe, it, expect, vi, beforeEach } from "vitest";
import { createZenModeActions } from "./useZenModeActions.svelte";

describe("useZenModeActions", () => {
  let mockUiStore: any;
  let mockVault: any;
  let mockEditState: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn());

    // Mock stores
    mockUiStore = {
      notify: vi.fn(),
    };
    mockVault = {
      updateEntity: vi.fn().mockResolvedValue(undefined),
      deleteEntity: vi.fn().mockResolvedValue(undefined),
    };

    // Generic edit state mock
    mockEditState = {
      title: "Test Title",
      content: "Test Content",
      lore: "Test Lore",
      image: "image.png",
      date: "2024-01-01",
      startDate: "2024-01-01",
      endDate: "2024-01-02",
      type: "person",
      isEditing: true,
    };
  });

  it("should initialize with isSaving as false", () => {
    const actions = createZenModeActions(mockEditState, {
      uiStore: mockUiStore,
      vault: mockVault,
    });
    expect(actions.isSaving).toBe(false);
  });

  describe("saveChanges", () => {
    it("should update entity and stop editing on success", async () => {
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      const savePromise = actions.saveChanges("entity-1");
      expect(actions.isSaving).toBe(true);

      await savePromise;

      expect(mockVault.updateEntity).toHaveBeenCalledWith("entity-1", {
        title: "Test Title",
        content: "Test Content",
        lore: "Test Lore",
        image: "image.png",
        date: "2024-01-01",
        start_date: "2024-01-01",
        end_date: "2024-01-02",
        type: "person",
      });
      expect(mockEditState.isEditing).toBe(false);
      expect(actions.isSaving).toBe(false);
    });

    it("should log error and reset isSaving on failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockVault.updateEntity.mockRejectedValueOnce(new Error("Save failed"));

      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      await actions.saveChanges("entity-1");

      expect(consoleSpy).toHaveBeenCalled();
      expect(actions.isSaving).toBe(false);
      expect(mockEditState.isEditing).toBe(true); // Should still be editing
      consoleSpy.mockRestore();
    });

    it("should accept editState as a getter function", async () => {
      const getter = vi.fn().mockReturnValue(mockEditState);
      const actions = createZenModeActions(getter, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      await actions.saveChanges("entity-1");
      expect(getter).toHaveBeenCalled();
    });
  });

  describe("handleDelete", () => {
    const mockEntity = { id: "e1", title: "Target" } as any;

    it("should do nothing if confirm is cancelled", async () => {
      (global.confirm as any).mockReturnValue(false);
      const onDeleted = vi.fn();
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      await actions.handleDelete(mockEntity, onDeleted);

      expect(mockVault.deleteEntity).not.toHaveBeenCalled();
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it("should delete entity and notify on success", async () => {
      (global.confirm as any).mockReturnValue(true);
      const onDeleted = vi.fn();
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      await actions.handleDelete(mockEntity, onDeleted);

      expect(mockVault.deleteEntity).toHaveBeenCalledWith("e1");
      expect(mockUiStore.notify).toHaveBeenCalledWith(
        '"Target" deleted.',
        "success",
      );
      expect(onDeleted).toHaveBeenCalled();
      expect(mockEditState.isEditing).toBe(false);
    });

    it("should notify error on failure", async () => {
      (global.confirm as any).mockReturnValue(true);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockVault.deleteEntity.mockRejectedValueOnce(new Error("Delete failed"));

      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      await actions.handleDelete(mockEntity, vi.fn());

      expect(mockUiStore.notify).toHaveBeenCalledWith(
        "Error: Delete failed",
        "error",
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("handleClose", () => {
    it("should call onClose immediately if not editing", () => {
      mockEditState.isEditing = false;
      const onClose = vi.fn();
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      actions.handleClose(onClose);
      expect(onClose).toHaveBeenCalled();
    });

    it("should ask for confirmation if editing", () => {
      mockEditState.isEditing = true;
      (global.confirm as any).mockReturnValue(false); // User says "Keep editing"
      const onClose = vi.fn();
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      actions.handleClose(onClose);
      expect(onClose).not.toHaveBeenCalled();
      expect(mockEditState.isEditing).toBe(true);
    });

    it("should close and stop editing if user confirms discard", () => {
      mockEditState.isEditing = true;
      (global.confirm as any).mockReturnValue(true); // User says "Discard"
      const onClose = vi.fn();
      const actions = createZenModeActions(mockEditState, {
        uiStore: mockUiStore,
        vault: mockVault,
      });

      actions.handleClose(onClose);
      expect(onClose).toHaveBeenCalled();
      expect(mockEditState.isEditing).toBe(false);
    });
  });
});
