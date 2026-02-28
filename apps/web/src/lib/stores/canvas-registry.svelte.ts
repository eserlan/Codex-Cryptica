import { getDB } from "../utils/idb";
import { vault } from "./vault.svelte";
import * as vaultIO from "./vault/io";

export interface CanvasMetadata {
  id: string;
  vaultId: string;
  name: string;
  slug: string;
  createdAt: number;
  lastModified: number;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

class CanvasRegistry {
  canvases = $state<CanvasMetadata[]>([]);
  isLoaded = $state(false);

  private ensureUniqueSlug(baseSlug: string, currentId?: string): string {
    let slug = baseSlug;
    let counter = 1;
    while (this.canvases.some((c) => c.slug === slug && c.id !== currentId)) {
      slug = `${baseSlug}-${counter++}`;
    }
    return slug;
  }

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
      let all: any[];
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

      // Backfill slugs for older canvases if missing
      let hasChanges = false;
      const metadataList: CanvasMetadata[] = [];

      for (const raw of all) {
        const meta = raw as CanvasMetadata;
        if (!meta.slug) {
          meta.slug = generateSlug(meta.name);
          hasChanges = true;
        }
        metadataList.push(meta);
      }

      if (hasChanges) {
        const tx = db.transaction("canvases", "readwrite");
        for (const meta of metadataList) {
          await tx.store.put(meta);
        }
        await tx.done;
      }

      this.canvases = metadataList.sort(
        (a, b) => b.lastModified - a.lastModified,
      );
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
    const slug = this.ensureUniqueSlug(generateSlug(name), id);

    const meta: CanvasMetadata = {
      id,
      vaultId: vault.activeVaultId,
      name,
      slug,
      createdAt: now,
      lastModified: now,
    };

    const db = await getDB();
    await db.put("canvases", meta);
    this.canvases = [meta, ...this.canvases];
    return slug; // Return the slug instead of the ID for navigation
  }

  async rename(id: string, newName: string) {
    const db = await getDB();
    const meta = (await db.get("canvases", id)) as CanvasMetadata | undefined;
    if (meta) {
      meta.name = newName;
      // We only update the slug if it was just a name change and we don't mind changing the URL.
      // Usually renames change the slug too.
      const newSlug = generateSlug(newName);
      if (meta.slug !== newSlug) {
        meta.slug = this.ensureUniqueSlug(newSlug, id);
      }
      meta.lastModified = Date.now();
      await db.put("canvases", meta);
      this.canvases = this.canvases.map((c) => (c.id === id ? meta : c));
      return meta.slug;
    }
    return null;
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
    const meta = (await db.get("canvases", id)) as CanvasMetadata | undefined;
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
