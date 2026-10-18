import type { LocalEntity } from "./types";

export interface DeadExternalImagePrunerDependencies {
  getEntities: () => Record<string, LocalEntity>;
  isWritable: () => boolean;
  updateEntities: (
    updates: Record<string, Partial<LocalEntity>>,
  ) => Promise<boolean | unknown>;
  debounceMs?: number;
}

function pruneEntityImageFields(
  entity: LocalEntity,
  urlsToPrune: Set<string>,
): Partial<LocalEntity> | null {
  if (entity.image && urlsToPrune.has(entity.image.trim())) {
    return {
      image: undefined,
      thumbnail: undefined,
      imageFocus: undefined,
      imageArtDirection: undefined,
    };
  }

  if (entity.thumbnail && urlsToPrune.has(entity.thumbnail.trim())) {
    return {
      thumbnail: undefined,
    };
  }

  return null;
}

function collectEntityPrunePatches(
  entities: Record<string, LocalEntity>,
  urlsToPrune: Set<string>,
): Record<string, Partial<LocalEntity>> {
  const updates: Record<string, Partial<LocalEntity>> = {};

  for (const [id, entity] of Object.entries(entities)) {
    const patch = pruneEntityImageFields(entity, urlsToPrune);
    if (patch) {
      updates[id] = patch;
    }
  }

  return updates;
}

/**
 * Batches and debounces removal of dead external image references (404/410)
 * from entities, ensuring that broken links do not persist in markdown frontmatter
 * or trigger redundant network requests across app restarts.
 */
export class DeadExternalImagePruner {
  private pendingUrls = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private debounceMs: number;

  constructor(private deps: DeadExternalImagePrunerDependencies) {
    this.debounceMs = deps.debounceMs ?? 300;
  }

  add(url: string): void {
    const cleanUrl = url.trim();
    if (!cleanUrl || !this.deps.isWritable()) return;

    this.pendingUrls.add(cleanUrl);

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (!this.deps.isWritable() || this.pendingUrls.size === 0) {
      this.pendingUrls.clear();
      return;
    }

    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    const urlsToPrune = new Set(this.pendingUrls);
    this.pendingUrls.clear();

    try {
      const updates = collectEntityPrunePatches(
        this.deps.getEntities(),
        urlsToPrune,
      );

      if (Object.keys(updates).length > 0) {
        await this.deps.updateEntities(updates);
      }
    } catch (err) {
      console.warn(
        "[DeadExternalImagePruner] Failed to prune dead external images:",
        err,
      );
    } finally {
      this.isFlushing = false;
      if (this.pendingUrls.size > 0 && this.deps.isWritable()) {
        void this.flush();
      }
    }
  }

  destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingUrls.clear();
  }
}
