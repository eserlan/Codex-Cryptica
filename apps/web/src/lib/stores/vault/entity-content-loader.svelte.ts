import { vaultEventBus } from "./events.svelte";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { readFileAsText } from "../../utils/opfs";
import { parseMarkdown, sanitizeId } from "../../utils/markdown";
import { VaultRepository } from "@codex/vault-engine";
import { systemClock } from "$lib/utils/runtime-deps";

/**
 * Lazy content loads read a file's frontmatter to RESTORE metadata that was
 * never hydrated in memory — but the file can be stale relative to the live
 * entity (e.g. a label the user just applied whose debounced save hasn't hit
 * disk yet). Only fill in keys that are absent/undefined in memory so we never
 * clobber fresher in-memory edits with stale disk values.
 */
export function restoreMissingMetadata(
  entity: Record<string, unknown>,
  diskMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const restored: Record<string, unknown> = {};
  for (const key of Object.keys(diskMetadata)) {
    const value = diskMetadata[key];
    if (value === undefined) continue;
    if (!(key in entity) || entity[key] === undefined) {
      restored[key] = value;
    }
  }
  return restored;
}

export interface ContentLoaderDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getGuestFile?: (path: string) => Promise<Blob>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
}

export class EntityContentLoader {
  private _contentLoadedIds = $state(new Set<string>());
  private _contentVerifiedIds = $state(new Set<string>());
  private _loadingPromises = new Map<string, Promise<void>>();
  private _unsubscribe: () => void;

  constructor(private deps: ContentLoaderDependencies) {
    this._unsubscribe = vaultEventBus.subscribe((event) => {
      if (event.type === "VAULT_OPENING") {
        this._contentLoadedIds.clear();
        this._contentVerifiedIds.clear();
      }
      if (event.type === "SYNC_CHUNK_READY") {
        for (const id of event.newOrChangedIds) {
          const entity = event.entities[id];
          if (entity?.content) {
            this._contentLoadedIds.add(id);
            this._contentVerifiedIds.add(id);
          }
        }
      }
    }, "entity-store-content-tracker");
  }

  destroy() {
    this._unsubscribe();
  }

  get entities() {
    return this.deps.repository.entities;
  }

  isContentLoaded(id: string) {
    return this._contentLoadedIds.has(id);
  }

  isContentVerified(id: string) {
    return this._contentVerifiedIds.has(id);
  }

  markContentLoaded(id: string) {
    this._contentLoadedIds.add(id);
    this._contentVerifiedIds.add(id);
  }

  async loadEntityContent(id: string): Promise<void> {
    if (!id) return;

    // 1. Return existing in-flight promise if available (Deduplication)
    const existing = this._loadingPromises.get(id);
    if (existing) return existing;

    const currentEntity = this.entities[id];
    if (!currentEntity) return;

    const isGuest = this.deps.isGuest();
    if (
      this._contentVerifiedIds.has(id) &&
      (!isGuest || !!currentEntity.content)
    )
      return;

    const loadPromise = (async () => {
      const activeVaultId = this.deps.activeVaultId();
      const guestFileFetcher = this.deps.getGuestFile;

      if (isGuest) {
        if (currentEntity.content) {
          this._contentLoadedIds.add(id);
          this._contentVerifiedIds.add(id);
          return;
        }

        const path = currentEntity._path || [`${id}.md`];
        const requestPath = path.join("/");
        if (!guestFileFetcher || !requestPath) return;

        try {
          const file = await guestFileFetcher(requestPath);
          const text = await file.text();
          if (!text) {
            this._contentVerifiedIds.add(id);
            return;
          }

          const { content: freshContent, metadata: freshMetadata } =
            parseMarkdown(text);
          const mergedMetadata: any = { ...(freshMetadata || {}) };
          delete mergedMetadata.id;
          if (mergedMetadata.parent) {
            mergedMetadata.parent = sanitizeId(mergedMetadata.parent);
          }
          for (const key of Object.keys(mergedMetadata)) {
            if (mergedMetadata[key] === undefined) {
              delete mergedMetadata[key];
            }
          }
          const latestGuest = this.entities[id] ?? currentEntity;
          this.deps.repository.entities[id] = {
            ...latestGuest,
            ...restoreMissingMetadata(latestGuest, mergedMetadata),
            content: freshContent || latestGuest.content || "",
            lore: "",
          } as LocalEntity;
          this._contentLoadedIds.add(id);
          this._contentVerifiedIds.add(id);
        } catch (err) {
          debugStore.warn(
            `[EntityContentLoader] Guest content fetch failed for ${id}`,
            err,
          );
        }
        return;
      }

      if (!activeVaultId) return;

      // PRIORITY 1: Cache
      let cached: { content: string; lore: string } | null = null;
      let cacheErrored = false;
      try {
        cached = await cacheService.getEntityContent(activeVaultId, id);
        if (cached !== null) {
          const latest = this.entities[id];
          if (latest && (!latest.content || latest.lore === undefined)) {
            this.deps.repository.entities[id] = {
              ...latest,
              content: cached.content,
              lore: cached.lore,
            };
            this._contentLoadedIds.add(id);
            debugStore.log(
              `[EntityContentLoader] Priority 1 hit: Loaded chronicle/lore from cache for ${id}`,
            );
          }
        }
      } catch (cacheErr) {
        cacheErrored = true;
        debugStore.warn(
          `[EntityContentLoader] Priority 1 cache load failed for ${id}`,
          cacheErr,
        );
      }

      if (this._contentVerifiedIds.has(id)) return;

      try {
        // PRIORITY 2: OPFS (canonical source of truth)
        let result = await this._readFromOpfs(id);

        // PRIORITY 3: Local FS fallback if OPFS had nothing
        if (!result) {
          const path = currentEntity._path || [`${id}.md`];
          const localHandle = await this.deps.getActiveFolderHandle();
          if (localHandle) {
            try {
              if (
                (await localHandle.queryPermission({ mode: "read" })) ===
                "granted"
              ) {
                const text = await readFileAsText(localHandle, path);
                if (text) {
                  const { metadata, content } = parseMarkdown(text);
                  result = { content, lore: metadata.lore || "", metadata };
                }
              }
            } catch (err) {
              debugStore.warn(
                `[EntityContentLoader] Local FS fallback failed for ${id}`,
                err,
              );
            }
          }
        }

        if (result) {
          const entityToUpdate = this.entities[id];
          if (entityToUpdate) {
            const finalContent = result.content || entityToUpdate.content || "";
            const finalLore = result.lore || entityToUpdate.lore || "";
            const path = entityToUpdate._path || [`${id}.md`];

            // Normalize and merge metadata
            const mergedMetadata: any = { ...(result.metadata || {}) };
            delete mergedMetadata.id;
            if (mergedMetadata.parent) {
              mergedMetadata.parent = sanitizeId(mergedMetadata.parent);
            }
            for (const key of Object.keys(mergedMetadata)) {
              if (mergedMetadata[key] === undefined) {
                delete mergedMetadata[key];
              }
            }

            const updatedEntity = {
              ...entityToUpdate,
              ...restoreMissingMetadata(entityToUpdate, mergedMetadata),
              content: finalContent,
              lore: finalLore,
            } as LocalEntity;

            this.deps.repository.entities[id] = updatedEntity;
            this._contentLoadedIds.add(id);
            this._contentVerifiedIds.add(id);

            debugStore.log(
              `[EntityContentLoader] Verified ${id} from source: contentLen=${finalContent.length}, loreLen=${finalLore.length}`,
            );

            // If content/lore changed, or if there are metadata keys on disk that weren't cached in memory
            const metadataRestored = Object.keys(result.metadata || {}).some(
              (key) =>
                !(key in entityToUpdate) ||
                (entityToUpdate as any)[key] === undefined,
            );

            const isStale =
              finalContent !== (cached?.content ?? null) ||
              finalLore !== (cached?.lore ?? null) ||
              metadataRestored;
            const hasContent = finalContent || finalLore || metadataRestored;

            if (isStale && (cached !== null || hasContent)) {
              cacheService.set(
                `${activeVaultId}:${path.join("/")}`,
                systemClock.now(),
                updatedEntity,
              );
            }
          }
        } else if (cached === null && !cacheErrored) {
          this._contentVerifiedIds.add(id);
          debugStore.warn(
            `[EntityContentLoader] Content truly missing for ${id} in all tiers`,
          );
        }
      } catch (err) {
        debugStore.error(
          `[EntityContentLoader] Failed to load content for ${id}:`,
          err,
        );
      }
    })();

    this._loadingPromises.set(id, loadPromise);

    return loadPromise.finally(() => this._loadingPromises.delete(id));
  }

  private async _readFromOpfs(
    id: string,
  ): Promise<{ content: string; lore: string; metadata?: any } | null> {
    const entity = this.entities[id];
    if (!entity) return null;
    const path = entity._path || [`${id}.md`];
    const vaultDir = await this.deps.getActiveVaultHandle();
    if (!vaultDir) return null;
    const text = await readFileAsText(vaultDir, path).catch(() => null);
    if (!text) return null;
    const { metadata, content } = parseMarkdown(text);
    return { content, lore: metadata.lore || "", metadata };
  }

  async internalLoadContent(id: string): Promise<void> {
    const currentEntity = this.entities[id];
    if (!currentEntity) return;
    try {
      const result = await this._readFromOpfs(id);
      if (result) {
        const mergedMetadata = { ...(result.metadata || {}) };
        delete mergedMetadata.id;
        if (mergedMetadata.parent) {
          mergedMetadata.parent = sanitizeId(mergedMetadata.parent);
        }
        for (const key of Object.keys(mergedMetadata)) {
          if (mergedMetadata[key] === undefined) {
            delete mergedMetadata[key];
          }
        }

        const latest = this.entities[id] ?? currentEntity;
        this.deps.repository.entities[id] = {
          ...latest,
          ...restoreMissingMetadata(latest, mergedMetadata),
          content: result.content,
          lore: result.lore,
        };
        this._contentLoadedIds.add(id);
        this._contentVerifiedIds.add(id);
      }
    } catch (err) {
      debugStore.error(
        `[EntityContentLoader] internalLoadContent failed for ${id}:`,
        err,
      );
    }
  }
}
