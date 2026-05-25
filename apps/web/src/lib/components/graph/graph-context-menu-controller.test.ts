import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphContextMenuController } from "./graph-context-menu-controller.svelte";

describe("GraphContextMenuController", () => {
  let deps: any;
  let cy: any;
  let controller: GraphContextMenuController;

  beforeEach(() => {
    cy = {
      on: vi.fn(),
      off: vi.fn(),
      $: vi.fn().mockReturnValue({
        map: vi.fn().mockReturnValue([]),
      }),
    };

    deps = {
      graph: { setCentralNode: vi.fn() },
      vault: {
        entities: {},
        updateEntity: vi.fn(),
        batchUpdate: vi.fn(),
        bulkAddLabel: vi.fn(),
        bulkRemoveLabel: vi.fn(),
        deleteEntity: vi.fn(),
        resolveImageUrl: vi.fn(),
      },
      oracle: { drawEntity: vi.fn() },
      regenerationService: { regenerate: vi.fn() },
      canvasRegistry: {
        addEntities: vi.fn(),
        createCanvas: vi.fn(),
        canvases: {},
      },
      modalUIStore: {
        openMergeDialog: vi.fn(),
        openBulkLabelDialog: vi.fn(),
        openCanvasSelection: vi.fn(),
        openLightbox: vi.fn(),
      },
      connectionModeStore: { startSelectionConnection: vi.fn() },
      notificationStore: {
        notify: vi.fn(),
        confirm: vi.fn().mockResolvedValue(true),
      },
    };

    controller = new GraphContextMenuController(cy, deps);
  });

  it("should set central node and close menu", () => {
    controller.targetId = "node-1";
    controller.contextMenuOpen = true;

    controller.setCentralNode();

    expect(deps.graph.setCentralNode).toHaveBeenCalledWith("node-1");
    expect(controller.contextMenuOpen).toBe(false);
  });

  it("should open merge dialog for multiple nodes", () => {
    controller.selectedNodes = ["node-1", "node-2"];
    controller.handleMerge();

    expect(deps.modalUIStore.openMergeDialog).toHaveBeenCalledWith([
      "node-1",
      "node-2",
    ]);
  });

  it("should update entity category", async () => {
    controller.selectedNodes = ["node-1"];
    await controller.handleSetCategory("person");

    expect(deps.vault.updateEntity).toHaveBeenCalledWith("node-1", {
      type: "person",
    });
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      "Category updated.",
      "success",
    );
  });

  it("should handle bulk category update", async () => {
    controller.selectedNodes = ["node-1", "node-2"];
    await controller.handleSetCategory("place");

    expect(deps.vault.batchUpdate).toHaveBeenCalled();
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      "Updated 2 nodes.",
      "success",
    );
  });

  it("should return correct labels and isImportant status", () => {
    controller.selectedNodes = [];
    expect(controller.isImportant).toBe(false);
    expect(controller.importantActionLabel).toBe("Mark Important");

    controller.selectedNodes = ["node-1", "node-2"];
    deps.vault.entities = {
      "node-1": { id: "node-1", labels: ["important"] },
      "node-2": { id: "node-2", labels: ["not-important"] },
    };
    expect(controller.isImportant).toBe(false);
    expect(controller.importantActionLabel).toBe("Mark Important");

    deps.vault.entities = {
      "node-1": { id: "node-1", labels: ["important"] },
      "node-2": { id: "node-2", labels: ["IMPORTANT"] },
    };
    expect(controller.isImportant).toBe(true);
    expect(controller.importantActionLabel).toBe("Remove Important");
  });

  it("should untoggle important status if nodes are already important", async () => {
    deps.vault.bulkRemoveLabel.mockResolvedValue(2);
    controller.contextMenuOpen = true;
    controller.selectedNodes = ["node-1", "node-2"];
    deps.vault.entities = {
      "node-1": { id: "node-1", labels: ["important"] },
      "node-2": { id: "node-2", labels: ["important"] },
    };

    await controller.handleMarkImportant();

    expect(deps.vault.bulkRemoveLabel).toHaveBeenCalledWith(
      ["node-1", "node-2"],
      "important",
    );
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      'Removed "important" status from 2 nodes.',
      "success",
    );
    expect(controller.contextMenuOpen).toBe(false);
  });

  it("should mark selected nodes important", async () => {
    deps.vault.bulkAddLabel.mockResolvedValue(2);
    controller.contextMenuOpen = true;
    controller.selectedNodes = ["node-1", "node-2"];

    await controller.handleMarkImportant();

    expect(deps.vault.bulkAddLabel).toHaveBeenCalledWith(
      ["node-1", "node-2"],
      "important",
    );
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      'Marked 2 nodes as "important".',
      "success",
    );
    expect(controller.contextMenuOpen).toBe(false);
  });

  it("should report when selected nodes are already important", async () => {
    deps.vault.bulkAddLabel.mockResolvedValue(0);
    controller.selectedNodes = ["node-1"];

    await controller.handleMarkImportant();

    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      'Already marked as "important".',
      "info",
    );
  });

  it("should report when multiple selected nodes are already important", async () => {
    deps.vault.bulkAddLabel.mockResolvedValue(0);
    controller.selectedNodes = ["node-1", "node-2"];

    await controller.handleMarkImportant();

    expect(deps.vault.bulkAddLabel).toHaveBeenCalledWith(
      ["node-1", "node-2"],
      "important",
    );
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      'Selected nodes are already marked as "important".',
      "info",
    );
  });

  it("should close open graph submenus when marking nodes important", async () => {
    deps.vault.bulkAddLabel.mockResolvedValue(1);
    controller.contextMenuOpen = true;
    controller.canvasPickerOpen = true;
    controller.categoryPickerOpen = true;
    controller.imagePickerOpen = true;
    controller.selectedNodes = ["node-1"];

    await controller.handleMarkImportant();

    expect(controller.contextMenuOpen).toBe(false);
    expect(controller.canvasPickerOpen).toBe(false);
    expect(controller.categoryPickerOpen).toBe(false);
    expect(controller.imagePickerOpen).toBe(false);
  });

  it("should not mark important when no nodes are selected", async () => {
    controller.selectedNodes = [];

    await controller.handleMarkImportant();

    expect(deps.vault.bulkAddLabel).not.toHaveBeenCalled();
    expect(deps.notificationStore.notify).not.toHaveBeenCalled();
  });

  it("should report important label failures", async () => {
    deps.vault.bulkAddLabel.mockRejectedValue(new Error("save failed"));
    controller.selectedNodes = ["node-1"];

    await controller.handleMarkImportant();

    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      "Failed to update important label: save failed",
      "error",
    );
  });

  it("should trigger image generation", async () => {
    controller.selectedNodes = ["node-1"];
    await controller.handleGenerateImage();

    expect(deps.oracle.drawEntity).toHaveBeenCalledWith("node-1");
  });

  it("should keep graph image generation on the central entity draw path", async () => {
    deps.vault.entities["node-1"] = {
      id: "node-1",
      title: "Glass Tower",
      type: "location",
    };
    controller.selectedNodes = ["node-1"];

    await controller.handleGenerateImage();

    expect(deps.oracle.drawEntity).toHaveBeenCalledTimes(1);
    expect(deps.oracle.drawEntity).toHaveBeenCalledWith("node-1");
  });

  it("should handle node deletion with confirmation", async () => {
    controller.selectedNodes = ["node-1"];
    await controller.deleteNodes();

    expect(deps.notificationStore.confirm).toHaveBeenCalled();
    expect(deps.vault.deleteEntity).toHaveBeenCalledWith("node-1");
  });
});
