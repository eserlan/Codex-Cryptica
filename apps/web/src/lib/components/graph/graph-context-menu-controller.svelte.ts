import type { graph as graphStoreType } from "$lib/stores/graph.svelte";
import type { vault as vaultStoreType } from "$lib/stores/vault.svelte";
import type { oracle as oracleStoreType } from "$lib/stores/oracle.svelte";
import type { regenerationService as regenerationServiceType } from "$lib/services/RegenerationService.svelte";
import type { canvasRegistry as canvasRegistryType } from "$lib/stores/canvas-registry.svelte";
import type { modalUIStore as modalUIStoreType } from "$lib/stores/ui/modal-ui.svelte";
import type { connectionModeStore as connectionModeStoreType } from "$lib/stores/ui/connection-mode.svelte";
import type { notificationStore as notificationStoreType } from "$lib/stores/ui/notification.svelte";
import type { Core, EventObject, NodeSingular } from "cytoscape";

export interface GraphContextMenuDependencies {
  graph: typeof graphStoreType;
  vault: typeof vaultStoreType;
  oracle: typeof oracleStoreType;
  regenerationService: typeof regenerationServiceType;
  canvasRegistry: typeof canvasRegistryType;
  modalUIStore: typeof modalUIStoreType;
  connectionModeStore: typeof connectionModeStoreType;
  notificationStore: typeof notificationStoreType;
}

export class GraphContextMenuController {
  getCy: () => Core;
  private deps: GraphContextMenuDependencies;

  contextMenuOpen = $state(false);
  canvasPickerOpen = $state(false);
  categoryPickerOpen = $state(false);
  imagePickerOpen = $state(false);

  position = $state({ x: 0, y: 0 });
  pickerPosition = $state({ x: 0, y: 0 });
  categoryPickerPosition = $state({ x: 0, y: 0 });
  imagePickerPosition = $state({ x: 0, y: 0 });

  targetId = $state<string | null>(null);
  selectedNodes = $state<string[]>([]);

  pickerTimeout: number | null = null;
  categoryPickerTimeout: number | null = null;
  imagePickerTimeout: number | null = null;

  pickerAnchor = $state<HTMLButtonElement>();
  categoryPickerAnchor = $state<HTMLButtonElement>();
  imagePickerAnchor = $state<HTMLButtonElement>();

  constructor(getCy: () => Core, deps: GraphContextMenuDependencies) {
    this.getCy = getCy;
    this.deps = deps;
  }

  hasImage = $derived.by(() => {
    if (this.selectedNodes.length !== 1) return false;
    return !!this.deps.vault.entities[this.selectedNodes[0]]?.image;
  });

  imageActionLabel = $derived.by(() => {
    return this.hasImage ? "Regen Image" : "Gen Image";
  });

  isImportant = $derived.by(() => {
    if (this.selectedNodes.length === 0) return false;
    return this.selectedNodes.every((id) => {
      const labels = this.deps.vault.entities[id]?.labels || [];
      return labels.some((l) => l.toLowerCase() === "important");
    });
  });

  importantActionLabel = $derived.by(() => {
    return this.isImportant ? "Remove Important" : "Mark Important";
  });

  setupEvents = () => {
    const openHandler = (evt: EventObject) => {
      const node = evt.target;
      this.targetId = node.id();
      this.position = evt.renderedPosition || { x: 0, y: 0 };

      const selection = this.getCy().$("node:selected");
      if (node.selected()) {
        this.selectedNodes = selection.map((n: NodeSingular) => n.id());
      } else {
        this.selectedNodes = [this.targetId!];
      }

      this.contextMenuOpen = true;
    };

    const closeHandler = () => {
      this.clearPickerTimeout();
      this.contextMenuOpen = false;
      this.canvasPickerOpen = false;
      this.categoryPickerOpen = false;
      this.imagePickerOpen = false;
    };

    this.getCy().on("cxttap", "node", openHandler);
    this.getCy().on("tap", closeHandler);

    return () => {
      this.clearPickerTimeout();
      this.getCy().off("cxttap", "node", openHandler);
      this.getCy().off("tap", closeHandler);
    };
  };

  clearPickerTimeout = () => {
    if (this.pickerTimeout) {
      clearTimeout(this.pickerTimeout);
      this.pickerTimeout = null;
    }
    if (this.categoryPickerTimeout) {
      clearTimeout(this.categoryPickerTimeout);
      this.categoryPickerTimeout = null;
    }
    if (this.imagePickerTimeout) {
      clearTimeout(this.imagePickerTimeout);
      this.imagePickerTimeout = null;
    }
  };

  setCentralNode = () => {
    if (this.targetId) {
      this.deps.graph.setCentralNode(this.targetId);
      this.contextMenuOpen = false;
    }
  };

  handleMerge = () => {
    if (this.selectedNodes.length > 1) {
      this.deps.modalUIStore.openMergeDialog(this.selectedNodes);
      this.contextMenuOpen = false;
    }
  };

  handleConnectSelection = () => {
    if (this.selectedNodes.length === 2) {
      this.deps.connectionModeStore.startSelectionConnection();
      this.contextMenuOpen = false;
    }
  };

  handleBulkLabel = () => {
    if (this.selectedNodes.length >= 1) {
      this.deps.modalUIStore.openBulkLabelDialog(this.selectedNodes);
      this.contextMenuOpen = false;
    }
  };

  handleMarkImportant = async () => {
    const nodesToUpdate = $state.snapshot(this.selectedNodes);
    if (nodesToUpdate.length === 0) return;

    this.contextMenuOpen = false;
    this.canvasPickerOpen = false;
    this.categoryPickerOpen = false;
    this.imagePickerOpen = false;

    try {
      if (this.isImportant) {
        const count = await this.deps.vault.bulkRemoveLabel(
          nodesToUpdate,
          "important",
        );
        if (count > 0) {
          this.deps.notificationStore.notify(
            count === 1
              ? 'Removed "important" status.'
              : `Removed "important" status from ${count} nodes.`,
            "success",
          );
        }
      } else {
        const count = await this.deps.vault.bulkAddLabel(
          nodesToUpdate,
          "important",
        );
        if (count > 0) {
          this.deps.notificationStore.notify(
            count === 1
              ? 'Marked as "important".'
              : `Marked ${count} nodes as "important".`,
            "success",
          );
        } else {
          this.deps.notificationStore.notify(
            nodesToUpdate.length === 1
              ? 'Already marked as "important".'
              : 'Selected nodes are already marked as "important".',
            "info",
          );
        }
      }
    } catch (err: any) {
      console.error("Failed to update important label", err);
      this.deps.notificationStore.notify(
        `Failed to update important label: ${err.message}`,
        "error",
      );
    }
  };

  handleChooseFull = () => {
    this.clearPickerTimeout();
    this.canvasPickerOpen = false;
    this.contextMenuOpen = false;
    this.deps.modalUIStore.openCanvasSelection(this.selectedNodes);
  };

  showCanvasPicker = () => {
    this.clearPickerTimeout();
    this.pickerTimeout = window.setTimeout(() => {
      if (this.pickerAnchor) {
        const rect = this.pickerAnchor.getBoundingClientRect();
        this.pickerPosition = {
          x: rect.right + 4,
          y: rect.top,
        };
      }
      this.canvasPickerOpen = true;
      this.categoryPickerOpen = false;
      this.imagePickerOpen = false;
    }, 100);
  };

  hideCanvasPicker = () => {
    if (this.pickerTimeout) clearTimeout(this.pickerTimeout);
    this.pickerTimeout = window.setTimeout(() => {
      this.canvasPickerOpen = false;
    }, 150);
  };

  showCategoryPicker = () => {
    this.clearPickerTimeout();
    this.categoryPickerTimeout = window.setTimeout(() => {
      if (this.categoryPickerAnchor) {
        const rect = this.categoryPickerAnchor.getBoundingClientRect();
        this.categoryPickerPosition = {
          x: rect.right + 4,
          y: rect.top,
        };
      }
      this.categoryPickerOpen = true;
      this.canvasPickerOpen = false;
      this.imagePickerOpen = false;
    }, 100);
  };

  toggleCategoryPicker = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.categoryPickerOpen) {
      this.categoryPickerOpen = false;
    } else {
      this.showCategoryPicker();
    }
  };

  hideCategoryPicker = () => {
    if (this.categoryPickerTimeout) clearTimeout(this.categoryPickerTimeout);
    this.categoryPickerTimeout = window.setTimeout(() => {
      this.categoryPickerOpen = false;
    }, 150);
  };

  showImagePicker = () => {
    this.clearPickerTimeout();
    this.imagePickerTimeout = window.setTimeout(() => {
      if (this.imagePickerAnchor) {
        const rect = this.imagePickerAnchor.getBoundingClientRect();
        this.imagePickerPosition = {
          x: rect.right + 4,
          y: rect.top,
        };
      }
      this.imagePickerOpen = true;
      this.canvasPickerOpen = false;
      this.categoryPickerOpen = false;
    }, 100);
  };

  toggleImagePicker = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.imagePickerOpen) {
      this.imagePickerOpen = false;
    } else {
      this.showImagePicker();
    }
  };

  hideImagePicker = () => {
    if (this.imagePickerTimeout) clearTimeout(this.imagePickerTimeout);
    this.imagePickerTimeout = window.setTimeout(() => {
      this.imagePickerOpen = false;
    }, 150);
  };

  handleSetCategory = async (type: string) => {
    const nodesToUpdate = $state.snapshot(this.selectedNodes);
    this.clearPickerTimeout();
    this.categoryPickerOpen = false;
    this.contextMenuOpen = false;

    try {
      if (nodesToUpdate.length === 1) {
        await this.deps.vault.updateEntity(nodesToUpdate[0], { type });
        this.deps.notificationStore.notify("Category updated.", "success");
      } else if (nodesToUpdate.length > 1) {
        const updates: Record<string, { type: string }> = {};
        for (const id of nodesToUpdate) {
          updates[id] = { type };
        }
        await this.deps.vault.batchUpdate(updates);
        this.deps.notificationStore.notify(
          `Updated ${nodesToUpdate.length} nodes.`,
          "success",
        );
      }
    } catch (err: any) {
      console.error("Failed to update category", err);
      this.deps.notificationStore.notify(
        `Failed to update category: ${err.message}`,
        "error",
      );
    }
  };

  handleGenerateImage = async () => {
    const nodesToUpdate = $state.snapshot(this.selectedNodes);
    if (nodesToUpdate.length !== 1) return;

    this.contextMenuOpen = false;
    this.canvasPickerOpen = false;
    this.categoryPickerOpen = false;
    this.imagePickerOpen = false;

    try {
      await this.deps.oracle.drawEntity(nodesToUpdate[0]);
    } catch (err: any) {
      console.error("Failed to generate image", err);
      this.deps.notificationStore.notify(
        `Failed to generate image: ${err.message}`,
        "error",
      );
    }
  };

  handleRegenerateContent = async () => {
    const nodesToUpdate = $state.snapshot(this.selectedNodes);
    if (nodesToUpdate.length !== 1) return;

    this.contextMenuOpen = false;
    this.canvasPickerOpen = false;
    this.categoryPickerOpen = false;
    this.imagePickerOpen = false;

    try {
      const ok = await this.deps.regenerationService.regenerate(
        nodesToUpdate[0],
      );
      if (!ok) {
        this.deps.notificationStore.notify(
          `Failed to regenerate content: ${this.deps.regenerationService.error ?? "Unknown error"}`,
          "error",
        );
      }
    } catch (err: any) {
      console.error("Failed to regenerate content", err);
      this.deps.notificationStore.notify(
        `Failed to regenerate content: ${err.message}`,
        "error",
      );
    }
  };

  handleViewImage = async () => {
    const nodesToUpdate = $state.snapshot(this.selectedNodes);
    if (nodesToUpdate.length !== 1) return;

    const entity = this.deps.vault.entities[nodesToUpdate[0]];
    if (!entity || !entity.image) return;

    this.contextMenuOpen = false;
    this.imagePickerOpen = false;

    try {
      const url = await this.deps.vault.resolveImageUrl(entity.image);
      this.deps.modalUIStore.openLightbox(
        url,
        entity.title,
        null,
        entity.image,
      );
    } catch (err: any) {
      console.error("Failed to view image", err);
      this.deps.notificationStore.notify(
        `Failed to open image: ${err.message}`,
        "error",
      );
    }
  };

  handleImageMainClick = (e: MouseEvent | KeyboardEvent) => {
    if (this.hasImage) {
      this.handleViewImage();
    } else {
      this.toggleImagePicker(e);
    }
  };

  handleAddToCanvas = async (canvasId: string) => {
    this.clearPickerTimeout();
    this.canvasPickerOpen = false;
    this.contextMenuOpen = false;
    try {
      const result = await this.deps.canvasRegistry.addEntities(
        canvasId,
        this.selectedNodes,
      );

      if (result.added.length > 0) {
        const msg =
          result.added.length === 1
            ? `Added to "${this.deps.canvasRegistry.canvases[canvasId]?.name || "canvas"}"`
            : `Added ${result.added.length} entities to "${this.deps.canvasRegistry.canvases[canvasId]?.name || "canvas"}"`;
        this.deps.notificationStore.notify(msg, "success");
      }

      if (result.skipped.length > 0) {
        const msg =
          result.skipped.length === 1
            ? "1 entity already on canvas"
            : `${result.skipped.length} entities already on canvas`;
        this.deps.notificationStore.notify(msg, "info");
      }
    } catch (err: any) {
      console.error("Failed to add entities to canvas", err);
      this.deps.notificationStore.notify(
        `Failed to add to canvas: ${err.message}`,
        "error",
      );
    }
  };

  handleCreateCanvas = async () => {
    this.clearPickerTimeout();
    this.canvasPickerOpen = false;
    this.contextMenuOpen = false;
    try {
      const title = window.prompt("Enter canvas name (optional):");
      if (title === null) return;

      const trimmedTitle = title.trim();
      const result = await this.deps.canvasRegistry.createCanvas(
        this.selectedNodes,
        trimmedTitle || undefined,
      );

      if (result) {
        this.deps.notificationStore.notify(
          `Created canvas "${result.name}" with ${this.selectedNodes.length} entit${this.selectedNodes.length === 1 ? "y" : "ies"}`,
          "success",
        );
      }
    } catch (err: any) {
      console.error("Failed to create canvas", err);
      this.deps.notificationStore.notify(
        `Failed to create canvas: ${err.message}`,
        "error",
      );
    }
  };

  deleteNodes = async () => {
    const count = this.selectedNodes.length;
    const message =
      count > 1
        ? `Are you sure you want to delete ${count} nodes and all their connections? This cannot be undone.`
        : "Are you sure you want to delete this node and all its connections? This cannot be undone.";

    if (
      await this.deps.notificationStore.confirm({
        title: "Confirm Action",
        message,
        confirmLabel: "Delete",
        isDangerous: true,
      })
    ) {
      this.contextMenuOpen = false;
      this.canvasPickerOpen = false;
      this.categoryPickerOpen = false;
      this.imagePickerOpen = false;
      try {
        for (const id of this.selectedNodes) {
          await this.deps.vault.deleteEntity(id);
        }
        this.deps.notificationStore.notify(
          count > 1 ? `Deleted ${count} nodes.` : "Node deleted.",
          "success",
        );
      } catch (err: any) {
        console.error("Failed to delete nodes", err);
        this.deps.notificationStore.notify(
          `Failed to delete: ${err.message}`,
          "error",
        );
      }
    }
  };
}
