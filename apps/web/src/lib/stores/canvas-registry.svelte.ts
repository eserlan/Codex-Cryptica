import { getDB } from "../utils/idb";
import { vault } from "./vault.svelte";

export interface CanvasMetadata {
  id: string;
  vaultId: string;
  name: string;
  createdAt: number;
  lastModified: number;
}

class CanvasRegistry {
  canvases = $state<CanvasMetadata[]>([]);
  isLoaded = $state(false);

  async loadForVault(vaultId: string) {
    const db = await getDB();
    const all = await db.getAllFromIndex("canvases", "by-vault", vaultId);
    this.canvases = all.sort((a, b) => b.lastModified - a.lastModified);
    this.isLoaded = true;
  }

  async create(name: string) {
    if (!vault.activeVaultId) return;

    const id = crypto.randomUUID();
    const now = Date.now();
    const meta: CanvasMetadata = {
      id,
      vaultId: vault.activeVaultId,
      name,
      createdAt: now,
      lastModified: now,
    };

    const db = await getDB();
    await db.put("canvases", meta);
    this.canvases = [meta, ...this.canvases];
    return id;
  }

  async rename(id: string, newName: string) {
    const db = await getDB();
    const meta = await db.get("canvases", id);
    if (meta) {
      meta.name = newName;
      meta.lastModified = Date.now();
      await db.put("canvases", meta);
      this.canvases = this.canvases.map((c) => (c.id === id ? meta : c));
    }
  }

  async delete(id: string) {
    const db = await getDB();
    await db.delete("canvases", id);
    this.canvases = this.canvases.filter((c) => c.id !== id);

    // Also remove from vault.canvases
    if (vault.canvases[id]) {
      delete vault.canvases[id];
      await vault.saveCanvases();
    }
  }

  async touch(id: string) {
    const db = await getDB();
    const meta = await db.get("canvases", id);
    if (meta) {
      meta.lastModified = Date.now();
      await db.put("canvases", meta);
      this.canvases = this.canvases
        .map((c) => (c.id === id ? meta : c))
        .sort((a, b) => b.lastModified - a.lastModified);
    }
  }
}

export const canvasRegistry = new CanvasRegistry();
