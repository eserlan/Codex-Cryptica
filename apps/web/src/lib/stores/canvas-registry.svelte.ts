import { getVaultDir } from "../utils/opfs";
import { vaultRegistry } from "./vault-registry.svelte";
import { uiStore } from "./ui.svelte";
import { saveCanvasToDisk, loadCanvasesFromDisk } from "./vault/io";
import type { KeyedTaskQueue } from "@codex/vault-engine";

interface Canvas {
  id: string;
  name: string;
  slug: string;
  nodes: string[];
  edges: any[];
  lastModified: number;
}

export interface CanvasAddResult {
  canvasId: string;
  added: string[];
  skipped: string[];
  errors: Array<{ entityId: string; error: string }>;
}

class CanvasRegistryStore {
  canvases = $state<Record<string, Canvas>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  isLoaded = $state(false);
  pendingEntities = $state<
    { id: string; position?: { x: number; y: number } }[]
  >([]);
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

  queueEntities(
    entities: { id: string; position?: { x: number; y: number } }[],
  ) {
    this.pendingEntities = [...this.pendingEntities, ...entities];
  }

  consumePending(): { id: string; position?: { x: number; y: number } }[] {
    const pending = this.pendingEntities;
    this.pendingEntities = [];
    return pending;
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

  private generateSlug(name: string, id: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // If base is empty (e.g. name only had symbols), fallback to ID
    if (!base) return id.slice(0, 8);

    // Check for collisions with other canvases (excluding current ID)
    const exists = Object.values(this.canvases).some(
      (c) => c.slug === base && c.id !== id,
    );

    if (exists) {
      // Append short ID to ensure uniqueness
      return `${base}-${id.slice(0, 4)}`;
    }

    return base;
  }

  async create(name: string): Promise<string | null> {
    const id = crypto.randomUUID();
    const slug = this.generateSlug(name, id);

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
    if (!vaultRegistry.rootHandle || !vaultRegistry.activeVaultId) return;

    const data = this.canvases[id];
    if (!data) return;

    if (!confirm(`Are you sure you want to delete canvas "${data.name}"?`)) {
      return;
    }

    try {
      const vaultDir = await getVaultDir(
        vaultRegistry.rootHandle,
        vaultRegistry.activeVaultId,
      );
      await import("./vault/io").then((io) =>
        io.deleteCanvasFromDisk(vaultDir, id),
      );
      delete this.canvases[id];
    } catch (e) {
      console.error("[CanvasRegistryStore] Failed to delete canvas file", e);
      uiStore.notify("Failed to delete canvas file from disk.", "error");
    }
  }

  async rename(id: string, newName: string): Promise<string | null> {
    const canvas = this.canvases[id];
    if (!canvas) return null;

    canvas.name = newName;
    canvas.slug = this.generateSlug(newName, id);
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

  async saveCanvas(id: string, options?: { explicitVaultId?: string }) {
    if (!vaultRegistry.rootHandle || !this.saveQueue) return;

    const vaultId = options?.explicitVaultId || vaultRegistry.activeVaultId;
    if (!vaultId) return;

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

  async addEntities(
    canvasId: string,
    entityIds: string[],
  ): Promise<CanvasAddResult> {
    const canvas = this.canvases[canvasId];
    if (!canvas) {
      return {
        canvasId,
        added: [],
        skipped: [],
        errors: [{ entityId: "", error: "Canvas not found" }],
      };
    }

    if (!entityIds || entityIds.length === 0) {
      return { canvasId, added: [], skipped: [], errors: [] };
    }

    const existingEntityIds = canvas.nodes ? new Set(canvas.nodes) : new Set();
    const added: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ entityId: string; error: string }> = [];

    // Batch updates to avoid triggering reactivity on every iteration
    const newNodes = [...(canvas.nodes || [])];
    for (const entityId of entityIds) {
      if (!entityId || !entityId.trim()) {
        errors.push({ entityId, error: "Invalid entity ID" });
        continue;
      }
      if (existingEntityIds.has(entityId)) {
        skipped.push(entityId);
      } else {
        newNodes.push(entityId);
        existingEntityIds.add(entityId);
        added.push(entityId);
      }
    }
    canvas.nodes = newNodes;

    canvas.lastModified = Date.now();
    await this.saveCanvas(canvasId);

    return { canvasId, added, skipped, errors };
  }

  async createCanvas(
    entityIds: string[],
    title?: string,
  ): Promise<{ id: string; slug: string; name: string } | null> {
    if (!entityIds || entityIds.length === 0) {
      return null;
    }

    const name =
      title ||
      `${entityIds.length} ${entityIds.length === 1 ? "entity" : "entities"}`;
    const id = crypto.randomUUID();
    const slug = this.generateSlug(name, id);

    this.canvases[id] = {
      id,
      name,
      slug,
      nodes: [...new Set(entityIds)],
      edges: [],
      lastModified: Date.now(),
    };

    await this.saveCanvas(id);
    return { id, slug, name };
  }
}

export const canvasRegistry = new CanvasRegistryStore();
