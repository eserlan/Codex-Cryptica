import type { CanvasStore } from "@codex/canvas-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { createFlowFileNode } from "../canvas-workspace-helpers";
import {
  centerScreenPosition,
  extractImageFilesFromClipboardData,
  extractImageFilesFromClipboardItems,
  formatFileFailure,
} from "../canvas-file-import-helpers";
import type { CanvasLogic } from "./canvas-logic-type";

export function useCanvasFileImport(deps: {
  logic: CanvasLogic;
  getEngine: () => CanvasStore;
  vault: typeof VaultStore;
  isEditableTarget: (target: EventTarget | null) => boolean;
}) {
  const { logic, getEngine, vault, isEditableTarget } = deps;
  let isImporting = $state(false);

  async function handleExternalFiles(
    files: File[],
    screenPosition?: { x: number; y: number },
  ) {
    if (vault.isGuest || files.length === 0 || isImporting) return;
    isImporting = true;
    try {
      const start = screenPosition
        ? logic.screenToFlowPosition(screenPosition)
        : {
            x: 80 + logic.nodes.length * 24,
            y: 80 + logic.nodes.length * 24,
          };
      const failures: string[] = [];
      let added = 0;

      for (const file of files) {
        const result = await vault.importFileToVault(file);
        if (!result.ok) {
          failures.push(formatFileFailure(file, result.reason));
          continue;
        }
        const position = { x: start.x + added * 28, y: start.y + added * 28 };
        const nodeId = getEngine().addFileNode(result.file, position);
        logic.nodes = [
          ...logic.nodes,
          createFlowFileNode(result.file, position, nodeId),
        ];
        added++;
      }

      if (added > 0 && failures.length > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added. ${failures.join(" ")}`,
          "info",
        );
      } else if (added > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added to the vault and canvas.`,
          "success",
        );
      } else if (failures.length) {
        notificationStore.notify(failures.join(" "), "error");
      }
    } catch {
      notificationStore.notify(
        "Files could not be added. Please try again.",
        "error",
      );
    } finally {
      isImporting = false;
    }
  }

  function onDragOver(event: DragEvent) {
    const hasFiles = (event.dataTransfer?.files.length ?? 0) > 0;
    if (vault.isGuest) {
      if (hasFiles) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
    }
  }

  async function onDrop(event: DragEvent) {
    const files = Array.from(event.dataTransfer?.files || []);
    if (vault.isGuest) {
      if (files.length > 0) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (files.length > 0) {
      await handleExternalFiles(files, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;

    const position = logic.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    logic.handleQuickSpawn(entityId, position);
  }

  async function handleCanvasPaste(event: ClipboardEvent) {
    if (vault.isGuest || isEditableTarget(event.target)) return;
    const files = extractImageFilesFromClipboardData(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await handleExternalFiles(files, centerScreenPosition());
  }

  async function handlePasteFromClipboard(screenPosition: {
    x: number;
    y: number;
  }) {
    if (vault.isGuest) return;
    if (!navigator.clipboard?.read) {
      notificationStore.notify(
        "Pasting from the clipboard isn't supported in this browser.",
        "error",
      );
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = await extractImageFilesFromClipboardItems(items);
      if (files.length === 0) {
        notificationStore.notify("No image found in clipboard.", "info");
        return;
      }
      await handleExternalFiles(files, screenPosition);
    } catch {
      notificationStore.notify(
        "Couldn't read the clipboard. Your browser may need permission.",
        "error",
      );
    }
  }

  return {
    get isImporting() {
      return isImporting;
    },
    handleExternalFiles,
    onDragOver,
    onDrop,
    handleCanvasPaste,
    handlePasteFromClipboard,
  };
}
