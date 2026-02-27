import { getDB } from "../utils/idb";
import { vault } from "./vault.svelte";
import * as vaultIO from "./vault/io";

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

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("vault-switched", () => {
        this.canvases = [];
        this.isLoaded = false;
        if (vault.activeVaultId) {
          this.loadForVault(vault.activeVaultId);
        }
      });
    }
  }

  async loadForVault(vaultId: string) {
    if (!vaultId) return;
    try {
      const db = await getDB();
      let all;
      try {
        all = await db.getAllFromIndex("canvases", "by-vault", vaultId);
      } catch (idxErr) {
        console.warn(
          "[CanvasRegistry] Index 'by-vault' failed, falling back to manual filter",
          idxErr,
        );
        const raw = await db.getAll("canvases");
        all = raw.filter((c) => c.vaultId === vaultId);
      }
      this.canvases = all.sort((a, b) => b.lastModified - a.lastModified);
      this.isLoaded = true;
    } catch (err) {
      console.error("[CanvasRegistry] Failed to load canvases", err);
      // Ensure we don't stay stuck in loading state even on total failure
      this.isLoaded = true;
    }
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

    // Also remove from disk
    const vaultDir = await vault.getActiveVaultHandle();
    if (vaultDir) {
      await vaultIO.deleteCanvasFromDisk(vaultDir, id);
    }

    // Also remove from vault.canvases
    if (vault.canvases[id]) {
      const newCanvases = { ...vault.canvases };
      delete newCanvases[id];
      vault.canvases = newCanvases;
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
