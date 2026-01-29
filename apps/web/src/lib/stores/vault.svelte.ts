import { parseMarkdown, stringifyEntity, sanitizeId } from "../utils/markdown";
import { walkDirectory, readFile, writeFile } from "../utils/fs";
import { getPersistedHandle, persistHandle } from "../utils/idb";
import { KeyedTaskQueue } from "../utils/queue";
import type { Entity, Connection } from "schema";
import { searchService } from "../services/search";
import { cacheService } from "../services/cache";

export type LocalEntity = Entity & { _fsHandle?: FileSystemHandle };

class VaultStore {
  entities = $state<Record<string, LocalEntity>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);
  activeDetailTab = $state<"status" | "lore" | "inventory">("status");

  /**
   * Bidirectional Adjacency List
   * Maps target entity IDs to an array of source entities that point to them.
   */
  inboundConnections = $state<Record<string, { sourceId: string; connection: Connection }[]>>({});

  updateInboundConnections() {
    const map: Record<string, { sourceId: string; connection: Connection }[]> = {};
    for (const entity of Object.values(this.entities)) {
      for (const conn of entity.connections) {
        if (!map[conn.target]) map[conn.target] = [];
        map[conn.target].push({ sourceId: entity.id, connection: conn });
      }
    }
    this.inboundConnections = map;
  }

  get allEntities() {
    return Object.values(this.entities);
  }

  rootHandle = $state<FileSystemDirectoryHandle | undefined>(undefined);
  // ... (rest of props)

  // ...
  isAuthorized = $state(false);

  private saveQueue = new KeyedTaskQueue();
  private loadingLore = new Set<string>();

  constructor() {
    // Initialization happens via init() called from the root component
  }

  async init() {
    try {
      const persisted = await getPersistedHandle();
      if (persisted) {
        const hasAccess = await this.verifyPermission(persisted);
        if (hasAccess) {
          this.rootHandle = persisted;
          this.isAuthorized = true;
          await this.loadFiles();
        }
      }
    } catch (err) {
      console.error("Failed to init vault", err);
    }
  }

  async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const state = await handle.queryPermission({ mode: "readwrite" });
    if (state === "granted") return true;
    return false;
  }

  async requestPermission() {
    if (!this.rootHandle) return;
    const state = await this.rootHandle.requestPermission({
      mode: "readwrite",
    });
    if (state === "granted") {
      this.isAuthorized = true;
      await this.loadFiles();
      this.status = "idle";
    } else {
      this.isAuthorized = false;
      this.status = "error";
    }
  }

  async openDirectory() {
    this.errorMessage = null;

    if (typeof window.showDirectoryPicker === "undefined") {
      this.status = "error";
      this.errorMessage =
        "API unsupported. Try Chrome or check Brave Shield/Flags.";
      return;
    }

    try {
      this.status = "loading";
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });
      this.rootHandle = handle;
      this.isAuthorized = true;
      await persistHandle(handle);
      await this.loadFiles();
      this.status = "idle";
    } catch (err: any) {
      console.error(err);
      this.status = "error";
      if (err.name === "AbortError") {
        this.status = "idle"; // Reset if user cancelled
      } else {
        this.errorMessage = "Failed to access vault. " + (err.message || "");
      }
    }
  }

  async loadFiles() {
    if (!this.rootHandle) return;

    this.status = "loading";
    const files = await walkDirectory(this.rootHandle);

    // Clear index before reloading
    await searchService.clear();

    // Reset entities or keep them? "loadFiles" usually implies a fresh load or refresh.
    // If we want to be smooth, we might want to keep existing until replaced, but that handles deletions poorly.
    // Let's clear start fresh but progressively.
    this.entities = {};

    // Process files in parallel chunks to avoid overwhelming the system while staying fast
    const CHUNK_SIZE = 20;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      const chunkEntities: Record<string, LocalEntity> = {};

      await Promise.all(chunk.map(async (fileEntry) => {
        try {
          const filePath = Array.isArray(fileEntry.path) ? fileEntry.path.join('/') : fileEntry.path;
          const file = await fileEntry.handle.getFile();
          const lastModified = file.lastModified;
          const cached = await cacheService.get(filePath);

          let entity: LocalEntity;

          // Hit Path: Use cached entity if valid
          if (cached && cached.lastModified === lastModified) {
            entity = { ...cached.entity, _fsHandle: fileEntry.handle, _path: fileEntry.path };
          } else {
            // Miss Path: Parse and cache
            const text = await file.text();
            const { metadata, content, wikiLinks } = parseMarkdown(text);

            let id = metadata.id;
            if (!id) {
              id = sanitizeId(fileEntry.path[fileEntry.path.length - 1].replace(".md", ""));
            }

            const connections = [...(metadata.connections || []), ...wikiLinks];

            entity = {
              id: id!,
              type: metadata.type || "npc",
              title: metadata.title || id!,
              tags: metadata.tags || [],
              connections,
              content: content,
              lore: metadata.lore,
              image: metadata.image,
              metadata: metadata.metadata,
              _fsHandle: fileEntry.handle,
              _path: fileEntry.path,
            };

            // Update Cache (best-effort; failures should not abort processing)
            try {
              await cacheService.set(filePath, lastModified, entity);
            } catch (error) {
              console.error("Failed to update cache for file:", filePath, error);
            }
          }

          if (!entity.id || entity.id === 'undefined') {
            console.error('CRITICAL: Attempted to index entity with invalid ID!', { title: entity.title, id: entity.id, path: entity._path });
            return;
          }

          chunkEntities[entity.id] = entity;

          const metadataValues = Object.values(entity.metadata || {});
          const metadataKeywords = metadataValues.flatMap((value) => {
            if (typeof value === 'string') return [value];
            if (Array.isArray(value)) {
              return value.filter((item): item is string => typeof item === 'string');
            }
            return [];
          });

          const keywords = [
            ...(entity.tags || []),
            entity.lore || '',
            ...metadataKeywords
          ].join(' ');

          const searchEntry = {
            id: entity.id,
            title: entity.title,
            content: entity.content,
            type: entity.type,
            path: filePath,
            keywords,
            updatedAt: Date.now()
          };

          // Index the entity
          await searchService.index(searchEntry);
        } catch (err) {
          console.error(`Failed to process file ${fileEntry.path.join('/')}:`, err);
        }
      }));

      // Update state incrementally
      this.entities = { ...this.entities, ...chunkEntities };
    }

    this.updateInboundConnections();
    this.status = "idle";
  }

  updateEntity(id: string, updates: Partial<Entity>) {
    const entity = this.entities[id];
    if (!entity) return;

    const updated = { ...entity, ...updates };
    this.entities[id] = updated;

    this.scheduleSave(updated);
  }

  scheduleSave(entity: Entity) {
    this.status = "saving";
    this.saveQueue.enqueue(entity.id, async () => {
      await this.saveToDisk(entity);
      this.status = "idle";
    }).catch(err => {
      console.error("Save failed for", entity.title, err);
      this.status = "error";
    });
  }

  async saveToDisk(entity: Entity) {
    const handle = (entity as LocalEntity)._fsHandle as FileSystemFileHandle;
    if (handle) {
      const content = stringifyEntity(entity);
      await writeFile(handle, content);

      // Update index
      await searchService.index({
        id: entity.id,
        title: entity.title,
        content: entity.content,
        type: entity.type,
        path: Array.isArray(entity._path) ? entity._path.join('/') : entity._path as string,
        updatedAt: Date.now()
      });
    }
  }

  async createEntity(type: Entity["type"], title: string): Promise<string> {
    const id = sanitizeId(title);
    if (this.entities[id]) {
      throw new Error(`Entity ${id} already exists`);
    }

    if (!this.rootHandle) throw new Error("Vault not open");

    const filename = `${id}.md`;
    const handle = await this.rootHandle.getFileHandle(filename, {
      create: true,
    });

    const newEntity: LocalEntity = {
      id,
      type,
      title,
      content: "",
      tags: [],
      connections: [],
      metadata: {},
      _fsHandle: handle,
      _path: [filename],
    };

    await writeFile(handle, stringifyEntity(newEntity));

    this.entities[id] = newEntity;

    // Index new entity
    await searchService.index({
      id,
      title,
      content: "",
      type,
      path: filename,
      updatedAt: Date.now()
    });

    this.updateInboundConnections();
    return id;
  }

  async deleteEntity(id: string): Promise<void> {
    const entity = this.entities[id];
    if (!entity) return;

    const handle = entity._fsHandle as FileSystemFileHandle;
    const path = entity._path as string[];

    if (handle && this.rootHandle) {
      if (path && path.length === 1) {
        await this.rootHandle.removeEntry(path[0]);
      } else {
        if (handle.remove) await handle.remove(); // .remove() is a non-standard convenience in some impls, but our type allows removeEntry on dir
      }
    }

    // Remove from index
    await searchService.remove(id);

    delete this.entities[id];
    this.updateInboundConnections();
  }

  async refresh() {
    await this.loadFiles();
  }

  async rebuildIndex() {
    await cacheService.clear();
    await this.loadFiles();
  }

  addConnection(
    sourceId: string,
    targetId: string,
    type: string = "related_to",
  ) {
    const source = this.entities[sourceId];
    if (!source) return;

    if (
      source.connections.some((c) => c.target === targetId && c.type === type)
    ) {
      return;
    }

    const newConnection = {
      target: targetId,
      type,
      strength: 1,
      label: undefined,
    };

    const updated = {
      ...source,
      connections: [...source.connections, newConnection],
    };

    this.entities[sourceId] = updated;
    this.updateInboundConnections();
    this.scheduleSave(updated);
  }

  updateConnection(
    sourceId: string,
    targetId: string,
    updates: Partial<{ label: string; type: string; strength: number }>,
  ) {
    const source = this.entities[sourceId];
    if (!source) return;

    const connIndex = source.connections.findIndex(
      (c) => c.target === targetId,
    );
    if (connIndex === -1) return;

    const updated = { ...source };
    updated.connections = [...source.connections];
    updated.connections[connIndex] = {
      ...updated.connections[connIndex],
      ...updates,
    };
    this.entities[sourceId] = updated;
    this.updateInboundConnections();
    this.scheduleSave(updated);
  }

  removeConnection(sourceId: string, targetId: string) {
    const source = this.entities[sourceId];
    if (!source) return;

    const updated = {
      ...source,
      connections: source.connections.filter((c) => c.target !== targetId),
    };

    this.entities[sourceId] = updated;
    this.updateInboundConnections();
    this.scheduleSave(updated);
  }
  async fetchLore(id: string) {
    const entity = this.entities[id];
    if (!entity || this.loadingLore.has(id)) return;

    const handle = entity._fsHandle as FileSystemFileHandle;
    if (!handle) return;

    this.loadingLore.add(id);
    try {
      const text = await readFile(handle);
      const { metadata } = parseMarkdown(text);

      const entity = this.entities[id];
      if (entity) {
        this.entities[id] = { ...entity, lore: metadata.lore || "" };
      }
    } catch (err) {
      console.error("Failed to fetch lore", err);
    } finally {
      this.loadingLore.delete(id);
    }
  }
}

export const vault = new VaultStore();
