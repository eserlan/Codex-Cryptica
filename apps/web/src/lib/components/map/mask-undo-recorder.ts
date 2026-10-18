export interface MaskUndoRecorderDeps {
  getMaskCanvas: () => HTMLCanvasElement | null;
  createCanvas: () => HTMLCanvasElement;
  mapStore: {
    readonly activeMapId: string | null;
    saveMask(canvas: HTMLCanvasElement): Promise<void>;
  };
  oracle: {
    pushUndoAction(
      name: string,
      undo: () => Promise<void>,
      messageId: string | undefined,
      redo: () => Promise<void>,
    ): void;
  };
}

function copyCanvas(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement,
) {
  const copy = createCanvas();
  copy.width = source.width;
  copy.height = source.height;
  if (source.width > 0 && source.height > 0) {
    copy.getContext("2d")?.drawImage(source, 0, 0);
  }
  return copy;
}

export class MaskUndoRecorder {
  constructor(private readonly deps: MaskUndoRecorderDeps) {}

  snapshot(): HTMLCanvasElement | null {
    const mask = this.deps.getMaskCanvas();
    return mask ? copyCanvas(mask, this.deps.createCanvas) : null;
  }

  commit(label: string, before: HTMLCanvasElement | null): void {
    const mask = this.deps.getMaskCanvas();
    const mapId = this.deps.mapStore.activeMapId;
    if (!mask || !mapId || !before) return;
    const after = copyCanvas(mask, this.deps.createCanvas);
    const restore = async (snapshot: HTMLCanvasElement) => {
      const live = this.deps.getMaskCanvas();
      if (!live || this.deps.mapStore.activeMapId !== mapId) return;
      const ctx = live.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, live.width, live.height);
      if (snapshot.width > 0 && snapshot.height > 0)
        ctx.drawImage(snapshot, 0, 0);
      await this.deps.mapStore.saveMask(live);
    };
    this.deps.oracle.pushUndoAction(
      label,
      () => restore(before),
      undefined,
      () => restore(after),
    );
  }
}
