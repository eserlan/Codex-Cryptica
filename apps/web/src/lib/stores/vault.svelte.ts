import { parseMarkdown, stringifyEntity, sanitizeId } from '../utils/markdown';
import { walkDirectory, readFile, writeFile } from '../utils/fs';
import { getPersistedHandle, persistHandle, clearPersistedHandle } from '../utils/idb';
import type { Entity } from 'schema';

class VaultStore {
  entities = $state<Map<string, Entity>>(new Map());
  status = $state<'idle' | 'loading' | 'saving' | 'error'>('idle');
  rootHandle = $state<FileSystemDirectoryHandle | undefined>(undefined);
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
      console.error('Failed to init vault', err);
    }
  }

  async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    // @ts-ignore - queryPermission might not be in all TS types yet
    const state = await handle.queryPermission({ mode: 'readwrite' });
    if (state === 'granted') return true;

    // If 'prompt', we can't automatically prompt on init (requires user gesture)
    // So we just return false and let the user click "Grant Access" later if we want to implement that
    // For now, if not granted, we wait for a manual gesture
    return false;
  }

  async requestPermission() {
    if (!this.rootHandle) return;
    // @ts-ignore
    const state = await this.rootHandle.requestPermission({ mode: 'readwrite' });
    if (state === 'granted') {
      this.isAuthorized = true;
      await this.loadFiles();
      this.status = 'idle';
    } else {
      this.isAuthorized = false;
      this.status = 'error';
    }
  }

  async openDirectory() {
    try {
      this.status = 'loading';
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      this.rootHandle = handle;
      this.isAuthorized = true;
      await persistHandle(handle);
      await this.loadFiles();
      this.status = 'idle';
    } catch (err) {
      console.error(err);
      this.status = 'error';
    }
  }

  async loadFiles() {
    if (!this.rootHandle) return;

    const files = await walkDirectory(this.rootHandle);
    const newEntities = new Map<string, Entity>();

    for (const file of files) {
      const text = await readFile(file.handle);
      const { metadata, content, wikiLinks } = parseMarkdown(text);

      let id = metadata.id;
      if (!id) {
        id = sanitizeId(file.path[file.path.length - 1].replace('.md', ''));
      }

      const connections = [...(metadata.connections || []), ...wikiLinks];

      const entity: Entity = {
        id: id!,
        type: metadata.type || 'npc',
        title: metadata.title || id!,
        tags: metadata.tags || [],
        connections,
        content: content,
        metadata: {
          ...metadata.metadata
        } as any,
        // Runtime props
        // @ts-ignore
        _fsHandle: file.handle,
        _path: file.path // Store path for deletion
      };

      newEntities.set(entity.id, entity);
    }

    this.entities = newEntities;
  }

  updateEntity(id: string, updates: Partial<Entity>) {
    const entity = this.entities.get(id);
    if (!entity) return;

    const updated = { ...entity, ...updates };
    this.entities.set(id, updated);

    this.scheduleSave(updated);
  }

  scheduleSave(entity: Entity) {
    if (this.saveTimers.has(entity.id)) {
      clearTimeout(this.saveTimers.get(entity.id));
    }

    const timer = setTimeout(() => {
      this.saveToDisk(entity);
      this.saveTimers.delete(entity.id);
    }, 1000); // 1s debounce

    this.saveTimers.set(entity.id, timer);
  }

  async saveToDisk(entity: Entity) {
    // @ts-ignore
    const handle = entity._fsHandle as FileSystemFileHandle;
    if (handle) {
      this.status = 'saving';
      try {
        const content = stringifyEntity(entity);
        await writeFile(handle, content);
      } catch (err) {
        console.error('Failed to save', err);
        this.status = 'error';
      } finally {
        if (this.saveTimers.size === 0) {
          this.status = 'idle';
        }
      }
    }
  }

  async createEntity(type: Entity['type'], title: string): Promise<string> {
    const id = sanitizeId(title);
    if (this.entities.has(id)) {
      throw new Error(`Entity ${id} already exists`);
    }

    // Create file on disk immediately?
    if (!this.rootHandle) throw new Error("Vault not open");

    // For MVP assuming flat structure or root
    const filename = `${id}.md`;
    const handle = await this.rootHandle.getFileHandle(filename, { create: true });

    const newEntity: Entity = {
      id,
      type,
      title,
      content: '',
      tags: [],
      connections: [],
      metadata: {},
      // @ts-ignore
      _fsHandle: handle,
      // @ts-ignore
      _path: [filename]
    };

    // Initial write
    await writeFile(handle, stringifyEntity(newEntity));

    this.entities.set(id, newEntity);
    return id;
  }

  async deleteEntity(id: string): Promise<void> {
    const entity = this.entities.get(id);
    if (!entity) return;

    // @ts-ignore
    const handle = entity._fsHandle as FileSystemFileHandle;
    // @ts-ignore
    const path = entity._path as string[];

    if (handle && this.rootHandle) {
      // Try to remove from root if path is flat
      // If nested, we need to traverse. For MVP assume we can remove using handle.remove() if supported
      // or removeEntry from parent.
      // Assuming flat structure at root for now based on createEntity logic
      if (path && path.length === 1) {
        await this.rootHandle.removeEntry(path[0]);
      } else {
        // Fallback or complex deletion
        // try handle.remove() which works in Chrome 110+
        // @ts-ignore
        if (handle.remove) await handle.remove();
        else console.warn("Cannot delete nested file without traversal");
      }
    }

    this.entities.delete(id);
  }

  async refresh() {
    await this.loadFiles();
  }

  addConnection(sourceId: string, targetId: string, type: string = "related_to") {
    const source = this.entities.get(sourceId);
    if (!source) return;

    // Avoid duplicate connections
    if (
      source.connections.some((c) => c.target === targetId && c.type === type)
    ) {
      return;
    }

    const newConnection = {
      target: targetId,
      type,
      strength: 1,
      label: undefined, // Default label for manual connections
    };

    const updated = {
      ...source,
      connections: [...source.connections, newConnection],
    };

    this.entities.set(sourceId, updated);
    this.scheduleSave(updated);
  }
}

export const vault = new VaultStore();
