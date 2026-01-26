import { parseMarkdown, stringifyEntity, sanitizeId } from "../utils/markdown";
import { walkDirectory, readFile, writeFile } from "../utils/fs";
import { getPersistedHandle, persistHandle } from "../utils/idb";
import type { Entity } from "schema";
import { searchService } from "../services/search";

class VaultStore {
  entities = $state<Record<string, Entity>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);

  get allEntities() {
    return Object.values(this.entities);
  }

  rootHandle = $state<FileSystemDirectoryHandle | undefined>(undefined);
  // ... (rest of props)

  // ...
  isAuthorized = $state(false);

  private saveTimers = new Map<string, NodeJS.Timeout>();

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
    // @ts-expect-error - queryPermission might not be in all TS types yet
    const state = await handle.queryPermission({ mode: "readwrite" });
    if (state === "granted") return true;
    return false;
  }

  async requestPermission() {
    if (!this.rootHandle) return;
    // @ts-expect-error - File System API types
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

    // @ts-expect-error - File System API types
    if (typeof window.showDirectoryPicker === "undefined") {
      this.status = "error";
      this.errorMessage =
        "API unsupported. Try Chrome or check Brave Shield/Flags.";
      return;
    }

    try {
      this.status = "loading";
      // @ts-expect-error - File System API types
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

    const files = await walkDirectory(this.rootHandle);
    const newEntities: Record<string, Entity> = {};

    // Clear index before reloading
    await searchService.clear();

    for (const file of files) {
      const text = await readFile(file.handle);
      const { metadata, content, wikiLinks } = parseMarkdown(text);

      let id = metadata.id;
      if (!id) {
        id = sanitizeId(file.path[file.path.length - 1].replace(".md", ""));
      }

      const connections = [...(metadata.connections || []), ...wikiLinks];

      const entity: Entity = {
        id: id!,
        type: metadata.type || "npc",
        title: metadata.title || id!,
        tags: metadata.tags || [],
        connections,
        content: content,
        image: metadata.image,
        metadata: {
          ...metadata.metadata,
        } as any,
        // @ts-expect-error - File System API types
        _fsHandle: file.handle,
        _path: file.path,
      };

      if (!entity.id || entity.id === 'undefined') {
        console.error('CRITICAL: Attempted to index entity with invalid ID!', { title: entity.title, id: entity.id, path: entity._path });
        continue;
      }

      newEntities[entity.id] = entity;

      const metadataKeywords = Object.values(entity.metadata || {}).flatMap((value) => {
        if (typeof value === 'string') return [value];
        if (Array.isArray(value)) {
          return value.filter((item) => typeof item === 'string') as string[];
        }
        return [];
      });

      const keywords = [
        ...(entity.tags || []),
        (metadata as any).lore || '',
        ...metadataKeywords
      ].join(' ');

      const searchEntry = {
        id: entity.id,
        title: entity.title,
        content: entity.content,
        path: Array.isArray(entity._path) ? entity._path.join('/') : entity._path as string,
        keywords,
        updatedAt: Date.now()
      };

      console.log('Indexing entity:', searchEntry.id, searchEntry.title);

      // Index the entity
      await searchService.index(searchEntry);
    }

    this.entities = newEntities;
  }

  updateEntity(id: string, updates: Partial<Entity>) {
    const entity = this.entities[id];
    if (!entity) return;

    const updated = { ...entity, ...updates };
    this.entities[id] = updated;

    this.scheduleSave(updated);
  }

  scheduleSave(entity: Entity) {
    if (this.saveTimers.has(entity.id)) {
      clearTimeout(this.saveTimers.get(entity.id)!);
    }

    const timer = setTimeout(() => {
      this.saveToDisk(entity);
      this.saveTimers.delete(entity.id);
    }, 1000);

    this.saveTimers.set(entity.id, timer);
  }

  async saveToDisk(entity: Entity) {
    // @ts-expect-error - File System API types
    const handle = entity._fsHandle as FileSystemFileHandle;
    if (handle) {
      this.status = "saving";
      try {
        const content = stringifyEntity(entity);
        await writeFile(handle, content);

        // Update index
        await searchService.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          path: Array.isArray(entity._path) ? entity._path.join('/') : entity._path as string,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error("Failed to save", err);
        this.status = "error";
      } finally {
        if (this.saveTimers.size === 0) {
          this.status = "idle";
        }
      }
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

    const newEntity: Entity = {
      id,
      type,
      title,
      content: "",
      tags: [],
      connections: [],
      metadata: {},
      // @ts-expect-error - File System API types
      _fsHandle: handle,
      _path: [filename],
    };

    await writeFile(handle, stringifyEntity(newEntity));

    this.entities[id] = newEntity;

    // Index new entity
    await searchService.index({
      id: newEntity.id,
      title: newEntity.title,
      content: newEntity.content,
      path: Array.isArray(newEntity._path) ? newEntity._path.join('/') : newEntity._path as string,
      updatedAt: Date.now()
    });

    return id;
  }

  async deleteEntity(id: string): Promise<void> {
    const entity = this.entities[id];
    if (!entity) return;

    // @ts-expect-error - File System API types
    const handle = entity._fsHandle as FileSystemFileHandle;
    const path = entity._path as string[];

    if (handle && this.rootHandle) {
      if (path && path.length === 1) {
        await this.rootHandle.removeEntry(path[0]);
      } else {
        // @ts-expect-error - File System API types
        if (handle.remove) await handle.remove();
      }
    }

    // Remove from index
    await searchService.remove(id);

    delete this.entities[id];
  }

  async refresh() {
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
    this.scheduleSave(updated);
  }
  async fetchLore(id: string) {
    const entity = this.entities[id];
    if (!entity) return;

    // @ts-expect-error - File System API types
    const handle = entity._fsHandle as FileSystemFileHandle;
    if (!handle) return;

    try {
      const text = await readFile(handle);
      const { metadata } = parseMarkdown(text);

      if (metadata.lore) {
        this.updateEntity(id, { lore: metadata.lore });
      } else {
        // If no lore exists, set empty string to indicate loaded but empty
        this.updateEntity(id, { lore: "" });
      }
    } catch (err) {
      console.error("Failed to fetch lore", err);
    }
  }
}

export const vault = new VaultStore();
