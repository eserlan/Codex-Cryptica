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

  it("should trigger image generation", async () => {
    controller.selectedNodes = ["node-1"];
    await controller.handleGenerateImage();

    expect(deps.oracle.drawEntity).toHaveBeenCalledWith("node-1");
  });

  it("should handle node deletion with confirmation", async () => {
    controller.selectedNodes = ["node-1"];
    await controller.deleteNodes();

    expect(deps.notificationStore.confirm).toHaveBeenCalled();
    expect(deps.vault.deleteEntity).toHaveBeenCalledWith("node-1");
  });
});
