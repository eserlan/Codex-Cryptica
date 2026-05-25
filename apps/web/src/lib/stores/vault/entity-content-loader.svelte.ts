import { vaultEventBus } from "./events.svelte";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { readFileAsText } from "../../utils/opfs";
import { parseMarkdown } from "../../utils/markdown";
import { VaultRepository } from "@codex/vault-engine";

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

          const { content: freshContent } = parseMarkdown(text);
          this.deps.repository.entities[id] = {
            ...currentEntity,
            content: freshContent || currentEntity.content || "",
            lore: "",
          };
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
                  result = { content, lore: metadata.lore || "" };
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

            const updatedEntity = {
              ...entityToUpdate,
              ...(result.metadata || {}),
              content: finalContent,
              lore: finalLore,
            };

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
                entityToUpdate[key as keyof LocalEntity] === undefined,
            );

            const isStale =
              finalContent !== (cached?.content ?? null) ||
              finalLore !== (cached?.lore ?? null) ||
              metadataRestored;
            const hasContent = finalContent || finalLore || metadataRestored;

            if (isStale && (cached !== null || hasContent)) {
              cacheService.set(
                `${activeVaultId}:${path.join("/")}`,
                Date.now(),
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
        this.deps.repository.entities[id] = {
          ...currentEntity,
          ...(result.metadata || {}),
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
