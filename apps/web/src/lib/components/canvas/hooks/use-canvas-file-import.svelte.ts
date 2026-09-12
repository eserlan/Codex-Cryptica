import type { Node } from "@xyflow/svelte";
import type { CanvasStore } from "@codex/canvas-engine";
import type {
  FileImportFailureReason,
  FileImportResult,
} from "@codex/vault-engine";
import { createFlowFileNode } from "../canvas-workspace-helpers";

export interface CanvasFileImportDeps {
  vault: {
    isGuest: boolean;
    importFileToVault: (file: File) => Promise<FileImportResult>;
  };
  engine: Pick<CanvasStore, "addFileNode">;
  logic: {
    nodes: Node[];
    screenToFlowPosition: (position: { x: number; y: number }) => {
      x: number;
      y: number;
    };
    saveNow: () => void;
  };
  isEditableTarget: (target: EventTarget | null) => boolean;
  notify: (message: string, level: "success" | "info" | "error") => void;
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
}

export function centerScreenPosition() {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function formatFileFailure(file: File, reason: FileImportFailureReason) {
  const descriptions: Record<FileImportFailureReason, string> = {
    empty: "is empty",
    too_large: "is larger than 10 MB",
    vault_unavailable: "could not be saved because the vault is unavailable",
    write_failed: "could not be saved to the vault",
  };
  return `${file.name || "A file"} ${descriptions[reason] || "could not be added"}.`;
}

export function imageFileFromBlob(blob: Blob, mimeType: string) {
  const extension = mimeType.split("/")[1]?.split("+")[0] || "png";
  return new File([blob], `pasted-image-${Date.now()}.${extension}`, {
    type: mimeType,
  });
}

export function extractImageFilesFromClipboardData(
  clipboardData: DataTransfer | null,
) {
  if (!clipboardData) return [];
  const fromFiles = Array.from(clipboardData.files).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (fromFiles.length > 0) return fromFiles;
  // Some browsers only populate `items` (with getAsFile()) for pasted
  // images, leaving `files` empty.
  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

export async function extractImageFilesFromClipboardItems(
  items: ClipboardItem[],
) {
  const files: File[] = [];
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    files.push(imageFileFromBlob(blob, imageType));
  }
  return files;
}

export function useCanvasFileImport(deps: CanvasFileImportDeps) {
  let isImportingExternalFiles = $state(false);

  async function handleExternalFiles(
    files: File[],
    screenPosition?: { x: number; y: number },
  ) {
    if (deps.vault.isGuest || files.length === 0 || isImportingExternalFiles) {
      return;
    }
    isImportingExternalFiles = true;
    try {
      const start = screenPosition
        ? deps.logic.screenToFlowPosition(screenPosition)
        : {
            x: 80 + deps.logic.nodes.length * 24,
            y: 80 + deps.logic.nodes.length * 24,
          };
      const failures: string[] = [];
      let added = 0;

      for (const file of files) {
        const result = await deps.vault.importFileToVault(file);
        if (!result.ok) {
          failures.push(formatFileFailure(file, result.reason));
          continue;
        }
        const position = { x: start.x + added * 28, y: start.y + added * 28 };
        const nodeId = deps.engine.addFileNode(result.file, position);
        deps.setNodes((nodes) => [
          ...nodes,
          createFlowFileNode(result.file, position, nodeId),
        ]);
        added++;
      }

      if (added > 0 && failures.length > 0) {
        deps.logic.saveNow();
        deps.notify(
          `${added} file${added === 1 ? "" : "s"} added. ${failures.join(" ")}`,
          "info",
        );
      } else if (added > 0) {
        deps.logic.saveNow();
        deps.notify(
          `${added} file${added === 1 ? "" : "s"} added to the vault and canvas.`,
          "success",
        );
      } else if (failures.length) {
        deps.notify(failures.join(" "), "error");
      }
    } catch {
      deps.notify("Files could not be added. Please try again.", "error");
    } finally {
      isImportingExternalFiles = false;
    }
  }

  async function handleCanvasPaste(event: ClipboardEvent) {
    if (deps.vault.isGuest || deps.isEditableTarget(event.target)) return;
    const files = extractImageFilesFromClipboardData(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await handleExternalFiles(files, centerScreenPosition());
  }

  async function handlePasteFromClipboard(screenPosition: {
    x: number;
    y: number;
  }) {
    if (deps.vault.isGuest) return;
    if (!navigator.clipboard?.read) {
      deps.notify(
        "Pasting from the clipboard isn't supported in this browser.",
        "error",
      );
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = await extractImageFilesFromClipboardItems(items);
      if (files.length === 0) {
        deps.notify("No image found in clipboard.", "info");
        return;
      }
      await handleExternalFiles(files, screenPosition);
    } catch {
      deps.notify(
        "Couldn't read the clipboard. Your browser may need permission.",
        "error",
      );
    }
  }

  return {
    get isImportingExternalFiles() {
      return isImportingExternalFiles;
    },
    handleExternalFiles,
    handleCanvasPaste,
    handlePasteFromClipboard,
  };
}
