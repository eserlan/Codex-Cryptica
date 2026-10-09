export interface CanvasDropTransfer {
  files: ArrayLike<File>;
  dropEffect: string;
  getData(type: string): string;
}

export interface CanvasDropEvent {
  dataTransfer?: CanvasDropTransfer | null;
  clientX: number;
  clientY: number;
  preventDefault(): void;
}

export interface CanvasDropHandlersOptions {
  isGuest: () => boolean;
  handleExternalFiles: (
    files: File[],
    position: { x: number; y: number },
  ) => Promise<void>;
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  handleQuickSpawn: (
    entityId: string,
    position: { x: number; y: number },
  ) => void;
}

export function createCanvasDropHandlers(options: CanvasDropHandlersOptions) {
  function onDragOver(event: CanvasDropEvent) {
    const hasFiles = (event.dataTransfer?.files.length ?? 0) > 0;
    if (options.isGuest()) {
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

  async function onDrop(event: CanvasDropEvent) {
    const files = Array.from(event.dataTransfer?.files || []);
    if (options.isGuest()) {
      if (files.length > 0) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (files.length > 0) {
      await options.handleExternalFiles(files, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;

    const position = options.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    options.handleQuickSpawn(entityId, position);
  }

  return { onDragOver, onDrop };
}
