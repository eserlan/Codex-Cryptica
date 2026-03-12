import { getVaultDir } from "../utils/opfs";
import { vaultRegistry } from "./vault-registry.svelte";
import { uiStore } from "./ui.svelte";
import { saveCanvasToDisk, loadCanvasesFromDisk } from "./vault/io";
import type { KeyedTaskQueue } from "@codex/vault-engine";

class CanvasRegistryStore {
  canvases = $state<Record<string, any>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  isLoaded = $state(false);
  private saveQueue: KeyedTaskQueue | null = null;

  init(saveQueue: KeyedTaskQueue) {
    this.saveQueue = saveQueue;
  }

  get allCanvases() {
    return Object.values(this.canvases);
  }

  clear() {
    this.canvases = {};
    this.isLoaded = false;
  }

  async loadFromVault(vaultId: string) {
    if (!vaultRegistry.rootHandle) return;
    this.status = "loading";
    try {
      const vaultDir = await getVaultDir(vaultRegistry.rootHandle, vaultId);
      this.canvases = await loadCanvasesFromDisk(vaultDir);
      this.status = "idle";
      this.isLoaded = true;
    } catch (e) {
      console.error("[CanvasRegistryStore] Failed to load canvases", e);
      this.status = "error";
    }
  }

  async create(name: string): Promise<string | null> {
    const id = crypto.randomUUID();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    this.canvases[id] = {
      id,
      name,
      slug,
      nodes: [],
      edges: [],
      lastModified: Date.now(),
    };

    await this.saveCanvas(id);
    return slug;
  }

  async delete(id: string) {
    delete this.canvases[id];
    // TODO: Physically delete file?
  }

  async rename(id: string, newName: string): Promise<string | null> {
    const canvas = this.canvases[id];
    if (!canvas) return null;

    canvas.name = newName;
    canvas.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    canvas.lastModified = Date.now();

    await this.saveCanvas(id);
    return canvas.slug;
  }

  async touch(id: string) {
    const canvas = this.canvases[id];
    if (canvas) {
      canvas.lastModified = Date.now();
    }
  }

  async saveCanvas(id: string) {
    if (
      !vaultRegistry.activeVaultId ||
      !vaultRegistry.rootHandle ||
      !this.saveQueue
    )
      return;
    const vaultId = vaultRegistry.activeVaultId;

    const data = this.canvases[id];
    if (!data) return;

    this.status = "saving";
    return this.saveQueue.enqueue(`canvas-${id}`, async () => {
      try {
        const vaultDir = await getVaultDir(vaultRegistry.rootHandle!, vaultId);
        await saveCanvasToDisk(vaultDir, id, data);
        this.status = "idle";
      } catch (err) {
        console.error("[CanvasRegistryStore] Failed to save canvas", id, err);
        this.status = "error";
        uiStore.notify(
          "Failed to save canvas data. Please check your storage quota.",
          "error",
        );
      }
    });
  }
}

export const canvasRegistry = new CanvasRegistryStore();
