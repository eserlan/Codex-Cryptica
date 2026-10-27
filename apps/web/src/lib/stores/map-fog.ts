import type { Map } from "schema";
import { vault as defaultVault } from "./vault.svelte";
import { writeOpfsFile } from "../utils/opfs";

type FogState = {
  fogRevision: number;
  activeMapId: string | null;
  activeMap: Map | null | undefined;
};

/** Reads and writes the canvas mask independently of reactive fog display state. */
export class MapFog {
  constructor(
    private readonly state: FogState,
    private readonly vault: Pick<
      typeof defaultVault,
      "getActiveVaultHandle" | "saveQueue"
    > = defaultVault,
  ) {}

  async saveMask(canvas: HTMLCanvasElement) {
    this.state.fogRevision++;
    if (!this.state.activeMap?.fogOfWar || !this.state.activeMapId) return;
    const vaultDir = await this.vault.getActiveVaultHandle();
    if (!vaultDir) return;

    return this.vault.saveQueue.enqueue(
      `mask-${this.state.activeMapId}`,
      async () => {
        try {
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) =>
                b
                  ? resolve(b)
                  : reject(new Error("Failed to create blob from canvas")),
              "image/png",
            );
          });
          await writeOpfsFile(
            ["maps", `${this.state.activeMapId}_mask.png`],
            blob,
            vaultDir,
            vaultDir.name,
          );
        } catch (err) {
          console.error("[MapStore] Failed to save mask", err);
        }
      },
    );
  }

  async loadMask(width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    // Transparent mask pixels leave fog intact; opaque pixels erase it.
    ctx.clearRect(0, 0, width, height);
    if (!this.state.activeMap?.fogOfWar || !this.state.activeMapId)
      return canvas;

    const maskPath = this.state.activeMap.fogOfWar.maskPath;
    const isRemoteMask =
      /^([a-z]+:)?\/\//i.test(maskPath) ||
      maskPath.startsWith("blob:") ||
      maskPath.startsWith("data:");
    if (isRemoteMask) {
      await this.loadRemoteMask(maskPath, canvas);
    } else {
      await this.loadLocalMask(canvas);
    }
    return canvas;
  }

  private async paintMask(blob: Blob, canvas: HTMLCanvasElement) {
    const bitmap = await createImageBitmap(blob);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

  private async loadRemoteMask(path: string, canvas: HTMLCanvasElement) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote fog mask: ${path}`);
      }
      await this.paintMask(await response.blob(), canvas);
    } catch (e) {
      console.error("[MapStore] Failed to load remote fog mask:", e);
    }
  }

  private async loadLocalMask(canvas: HTMLCanvasElement) {
    const vaultDir = await this.vault.getActiveVaultHandle();
    if (!vaultDir) return;
    try {
      const mapsDir = await vaultDir.getDirectoryHandle("maps");
      const fileHandle = await mapsDir.getFileHandle(
        `${this.state.activeMapId}_mask.png`,
      );
      await this.paintMask(await fileHandle.getFile(), canvas);
    } catch (e: any) {
      if (e.name !== "NotFoundError") {
        console.error("[MapStore] Failed to load mask from disk:", e);
      }
    }
  }
}
