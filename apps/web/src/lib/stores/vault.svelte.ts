import { parseMarkdown, stringifyEntity, sanitizeId } from "../utils/markdown";
import { walkDirectory, readFile, writeFile } from "../utils/fs";
import { getPersistedHandle, persistHandle, clearPersistedHandle } from "../utils/idb";
import { KeyedTaskQueue } from "../utils/queue";
import type { Entity, Connection } from "schema";
import { searchService } from "../services/search";
import { cacheService } from "../services/cache";
import { aiService } from "../services/ai";
import { oracle } from "./oracle.svelte";
import { graph } from "./graph.svelte";
import { workerBridge } from "../cloud-bridge/worker-bridge";
import type { IStorageAdapter } from "../cloud-bridge/types";

export type LocalEntity = Entity & { _fsHandle?: FileSystemHandle; _path?: string | string[] };

class VaultStore {
  entities = $state<Record<string, LocalEntity>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  isInitialized = $state(false);
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);
  activeDetailTab = $state<"status" | "lore" | "inventory">("status");

  isGuest = $state(false);
  storageAdapter: IStorageAdapter | null = null;

  /**
   * Bidirectional Adjacency List
   * Maps target entity IDs to an array of source entities that point to them.
   */
  inboundConnections = $state<Record<string, { sourceId: string; connection: Connection }[]>>({});

  /**
   * Project-wide index of all unique labels used across entities.
   * Case-insensitive.
   */
  labelIndex = $derived.by(() => {
    const seen = new Set<string>();
    for (const entity of Object.values(this.entities)) {
      for (const label of entity.labels || []) {
        seen.add(label.trim().toLowerCase());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  /**
   * Incremental Adjacency Map Updates (O(1))
   */
  private rebuildInboundMap() {
    const newInboundMap: Record<string, { sourceId: string; connection: Connection }[]> = {};
    for (const entity of Object.values(this.entities)) {
      for (const conn of entity.connections) {
        const targetId = conn.target;
        // Only index inbound connections for valid targets that exist in the entity map
        if (!targetId || !this.entities[targetId]) {
          continue;
        }
        if (!newInboundMap[targetId]) newInboundMap[targetId] = [];
        newInboundMap[targetId].push({ sourceId: entity.id, connection: conn });
      }
    }
    this.inboundConnections = newInboundMap;
  }

  private addInboundConnection(sourceId: string, connection: Connection) {
    const targetId = connection.target;
    if (!this.inboundConnections[targetId]) {
      this.inboundConnections[targetId] = [];
    }
    // Prevent duplicates
    if (!this.inboundConnections[targetId].some(c => c.sourceId === sourceId && c.connection.type === connection.type)) {
      this.inboundConnections[targetId].push({ sourceId, connection });
    }
  }

  private removeInboundConnection(sourceId: string, targetId: string) {
    if (this.inboundConnections[targetId]) {
      this.inboundConnections[targetId] = this.inboundConnections[targetId].filter(
        c => c.sourceId !== sourceId
      );
      if (this.inboundConnections[targetId].length === 0) {
        delete this.inboundConnections[targetId];
      }
    }
  }

  get allEntities() {
    return Object.values(this.entities);
  }

  rootHandle = $state<FileSystemDirectoryHandle | undefined>(undefined);
  isAuthorized = $state(false);

  private saveQueue = new KeyedTaskQueue();
  private loadingLore = new Set<string>();

  get pendingSaveCount() {
    return this.saveQueue.totalPendingCount;
  }

  constructor() {
    // Initialization happens via init() called from the root component
  }

  async init() {
    this.isInitialized = false;
    if (this.rootHandle) return;
    try {
      const persisted = await getPersistedHandle();
      if (persisted) {
        const hasAccess = await this.verifyPermission(persisted);
        if (hasAccess) {
          this.rootHandle = persisted;
          this.isAuthorized = true;
          await this.ensureImagesDirectory();
          await this.loadFiles();
        }
      }
    } catch (err) {
      console.error("Failed to init vault", err);
    } finally {
      this.status = "idle";
    }
  }

  /**
   * Detaches the current vault, clearing all in-memory campaign data 
   * and removing persistent directory references.
   */
  async close() {
    this.status = "loading";
    try {
      // 1. Clear Services
      await searchService.clear();
      oracle.clearMessages();
      workerBridge.reset();

      // 2. Clear Persistence
      this.isInitialized = false;
      await clearPersistedHandle();

      // 3. Clear Memory
      this.entities = {};
      this.inboundConnections = {};
      this.rootHandle = undefined;
      this.isAuthorized = false;
      this.selectedEntityId = null;
      this.isGuest = false;
      this.storageAdapter = null;
      this.errorMessage = null;

      this.clearImageCache();
    } catch (err) {
      console.error("Failed to close vault", err);
    } finally {
      this.status = "idle";
    }
  }

  async initGuest(adapter: IStorageAdapter) {
    this.isInitialized = false;
    this.isGuest = true;
    this.storageAdapter = adapter;
    this.status = "loading";
    try {
      await adapter.init();
      const graph = await adapter.loadGraph();
      if (!graph) throw new Error("Graph could not be loaded");
      this.entities = graph.entities as Record<string, LocalEntity>;
      this.rebuildInboundMap();
      this.isInitialized = true;
    } catch (err: any) {
      console.error("Failed to init guest vault", err);
      this.errorMessage = err.message || "Failed to load shared campaign";
      this.status = "error";
    } finally {
      if (this.status !== "error") this.status = "idle";
    }
  }

  async ensureImagesDirectory() {
    if (!this.rootHandle) return;
    try {
      await this.rootHandle.getDirectoryHandle("images", { create: true });
    } catch (err) {
      console.error("Failed to create images directory", err);
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
    this.isInitialized = false;
    try {
      if (!window.showDirectoryPicker) {
        throw new Error("Your browser does not support local vault access (File System Access API). Please use a modern browser like Chrome or Edge, and ensure you are accessing via localhost or HTTPS.");
      }
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      this.clearImageCache();
      this.rootHandle = handle;
      this.isAuthorized = true;
      await persistHandle(handle);
      await this.ensureImagesDirectory();
      await this.loadFiles();
      this.status = "idle";
    } catch (err: any) {
      console.error(err);
      this.status = "error";
      if (err.name === "AbortError") {
        this.status = "idle"; // Reset if user cancelled
      } else {
        this.errorMessage = err.message || "Failed to access vault.";
      }
    }
  }

  async loadFiles() {
    if (!this.rootHandle) return;

    this.status = "loading";
    try {
      aiService.clearStyleCache();
      const files = await walkDirectory(this.rootHandle);

      // Clear index before reloading
      await searchService.clear();

      this.entities = {};
      const newInboundMap: Record<string, { sourceId: string; connection: Connection }[]> = {};

      // Process files in parallel chunks to avoid overwhelming the system while staying fast
      const CHUNK_SIZE = 20;
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const chunkEntities: Record<string, LocalEntity> = {};

        await Promise.all(
          chunk.map(async (fileEntry) => {
            try {
              const filePath = Array.isArray(fileEntry.path)
                ? fileEntry.path.join("/")
                : fileEntry.path;
              const file = await fileEntry.handle.getFile();
              const lastModified = file.lastModified;
              const cached = await cacheService.get(filePath);

              let entity: LocalEntity;

              // Hit Path: Use cached entity if valid
              if (cached && cached.lastModified === lastModified) {
                entity = {
                  ...cached.entity,
                  _fsHandle: fileEntry.handle,
                  _path: fileEntry.path,
                };
              } else {
                // Miss Path: Parse and cache
                const text = await file.text();
                const { metadata, content, wikiLinks } = parseMarkdown(text);

                let id = metadata.id;
                if (!id) {
                  id = sanitizeId(
                    fileEntry.path[fileEntry.path.length - 1].replace(
                      ".md",
                      "",
                    ),
                  );
                }

                const connections = [
                  ...(metadata.connections || []),
                  ...wikiLinks,
                ];

                entity = {
                  id: id!,
                  type: metadata.type || "character",
                  title: metadata.title || id!,
                  tags: metadata.tags || [],
                  labels: metadata.labels || [],
                  connections,
                  content: content,
                  lore: metadata.lore,
                  image: metadata.image,
                  thumbnail: metadata.thumbnail,
                  date: metadata.date,
                  start_date: metadata.start_date,
                  end_date: metadata.end_date,
                  metadata: metadata.metadata,
                  _fsHandle: fileEntry.handle,
                  _path: fileEntry.path,
                };

                // Update Cache (best-effort; failures should not abort processing)
                try {
                  await cacheService.set(filePath, lastModified, entity);
                } catch (error) {
                  console.error(
                    "Failed to update cache for file:",
                    filePath,
                    error,
                  );
                }
              }

              if (!entity.id || entity.id === "undefined") {
                console.error(
                  "CRITICAL: Attempted to index entity with invalid ID!",
                  { title: entity.title, id: entity.id, path: entity._path },
                );
                return;
              }

              chunkEntities[entity.id] = entity;

              // Build inbound map for this chunk
              for (const conn of entity.connections) {
                if (!newInboundMap[conn.target]) newInboundMap[conn.target] = [];
                newInboundMap[conn.target].push({ sourceId: entity.id, connection: conn });
              }

              const metadataValues = Object.values(entity.metadata || {});
              const metadataKeywords = metadataValues.flatMap((value) => {
                if (typeof value === "string") return [value];
                if (Array.isArray(value)) {
                  return value.filter(
                    (item): item is string => typeof item === "string",
                  );
                }
                return [];
              });

              const keywords = [
                ...(entity.tags || []),
                entity.lore || "",
                ...metadataKeywords,
              ].join(" ");

              const searchEntry = {
                id: entity.id,
                title: entity.title,
                content: entity.content,
                type: entity.type,
                path: filePath,
                keywords,
                updatedAt: Date.now(),
              };

              // Index the entity
              await searchService.index(searchEntry);
            } catch (err) {
              console.error(
                `Failed to process file ${fileEntry.path.join("/")}:`,
                err,
              );
            }
          }),
        );

        // Update state incrementally
        Object.assign(this.entities, chunkEntities);
      }

    } finally {
      this.status = "idle";
      this.isInitialized = true;
    }
  }

  private imageBlobCache = new Map<string, string>();
  private pendingResolutions = new Map<string, Promise<string>>();
  private readonly MAX_CACHE_SIZE = 50;

  async resolveImagePath(path: string): Promise<string> {
    if (!path) return "";
    // If it's already a browser-usable URL, return it
    if (
      path.startsWith("http") ||
      path.startsWith("blob:") ||
      path.startsWith("data:")
    )
      return path;

    // In Guest Mode, delegate to the storage adapter
    if (this.isGuest && this.storageAdapter) {
      return await this.storageAdapter.resolvePath(path);
    }

    // Check cache
    if (this.imageBlobCache.has(path)) {
      // Re-insert to mark as recently used (basic LRU)
      const url = this.imageBlobCache.get(path)!;
      this.imageBlobCache.delete(path);
      this.imageBlobCache.set(path, url);
      return url;
    }

    // Check for in-flight requests
    if (this.pendingResolutions.has(path)) {
      return this.pendingResolutions.get(path)!;
    }

    if (!this.rootHandle) return path;

    const resolutionPromise = (async () => {
      try {
        // Normalize path (remove leading ./)
        const normalized = path.startsWith("./") ? path.slice(2) : path;
        const segments = normalized.split("/");

        let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle =
          this.rootHandle!;

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (i === segments.length - 1) {
            // Last segment is the file
            const fileHandle = await (
              currentHandle as FileSystemDirectoryHandle
            ).getFileHandle(segment);
            const file = await fileHandle.getFile();
            const url = URL.createObjectURL(file);

            // Cache management
            if (this.imageBlobCache.size >= this.MAX_CACHE_SIZE) {
              const firstKey = this.imageBlobCache.keys().next().value;
              if (firstKey) {
                const oldUrl = this.imageBlobCache.get(firstKey);
                if (oldUrl) URL.revokeObjectURL(oldUrl);
                this.imageBlobCache.delete(firstKey);
              }
            }

            this.imageBlobCache.set(path, url);
            return url;
          } else {
            currentHandle = await (
              currentHandle as FileSystemDirectoryHandle
            ).getDirectoryHandle(segment);
          }
        }
      } catch (err) {
        console.error("Failed to resolve image path", path, err);
      } finally {
        this.pendingResolutions.delete(path);
      }
      return "";
    })();

    this.pendingResolutions.set(path, resolutionPromise);
    return resolutionPromise;
  }

  // Cleanup blob URLs on destroy/reset if needed
  clearImageCache() {
    this.imageBlobCache.forEach((url) => URL.revokeObjectURL(url));
    this.imageBlobCache.clear();
  }

  async saveImageToVault(blob: Blob, entityId: string): Promise<string> {
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("Invalid image data provided for archival.");
    }
    if (!this.rootHandle) throw new Error("Vault not open");

    try {
      const imagesDir = await this.rootHandle.getDirectoryHandle("images", {
        create: true,
      });

      // Cleanup old images if they exist
      const entity = this.entities[entityId];
      if (entity) {
        const deleteOldFile = async (path: string) => {
          const filename = path.split("/").pop();
          if (filename) {
            await imagesDir.removeEntry(filename).catch(() => { });
          }
        };
        if (entity.image) await deleteOldFile(entity.image);
        if (entity.thumbnail) await deleteOldFile(entity.thumbnail);
      }

      const timestamp = Date.now();
      const hash = crypto.randomUUID().split("-")[0];
      const baseFilename = `${entityId}-${timestamp}-${hash}`;
      const filename = `${baseFilename}.png`;
      const thumbFilename = `${baseFilename}-thumb.webp`;

      // Save original
      const fileHandle = await imagesDir.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      // Generate and save thumbnail
      const thumbBlob = await this.generateThumbnail(blob, 512);
      const thumbHandle = await imagesDir.getFileHandle(thumbFilename, {
        create: true,
      });
      const thumbWritable = await thumbHandle.createWritable();
      await thumbWritable.write(thumbBlob);
      await thumbWritable.close();

      const relativePath = `./images/${filename}`;
      const thumbPath = `./images/${thumbFilename}`;

      // Update entity metadata
      this.updateEntity(entityId, { image: relativePath, thumbnail: thumbPath });

      return relativePath;
    } catch (err) {
      console.error("Failed to save image to vault", err);
      throw err;
    }
  }

  private async generateThumbnail(
    blob: Blob,
    size: number,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Creating a temporary canvas is negligible compared to image decoding overhead.
        // This avoids race conditions inherent in pooling a single canvas for async operations.
        const canvas = typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(size, size)
          : document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to initialize canvas context for thumbnail generation"));
          return;
        }

        this.drawOnCanvas(img, canvas, ctx as any, size, resolve, reject);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    });
  }

  private drawOnCanvas(
    img: HTMLImageElement,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    size: number,
    resolve: (blob: Blob) => void,
    reject: (err: Error) => void
  ) {
    // Calculate dimensions to maintain aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > size) {
        height *= size / width;
        width = size;
      }
    } else {
      if (height > size) {
        width *= size / height;
        height = size;
      }
    }

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blobPromise = 'toBlob' in canvas
      ? new Promise<Blob | null>(r => (canvas as HTMLCanvasElement).toBlob(r, "image/webp", 0.75))
      : (canvas as OffscreenCanvas).convertToBlob({ type: "image/webp", quality: 0.75 });

    blobPromise.then((result) => {
      if (result) resolve(result);
      else reject(new Error("Canvas toBlob failed"));
    }).catch(reject);
  }

  // Subscription for P2P Broadcast
  private subscribers: ((entity: Entity) => void)[] = [];

  subscribe(fn: (entity: Entity) => void) {
    this.subscribers.push(fn);
    // Return unsubscribe
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  updateEntity(id: string, updates: Partial<Entity>): boolean {
    const entity = this.entities[id];
    if (!entity) return false;

    const updated = { ...entity, ...updates };
    this.entities[id] = updated;

    // Granular Cache Invalidation: Only clear if the title suggests style relevance
    const styleKeywords = ["art style", "visual aesthetic", "world guide", "style"];
    const isPossiblyStyle = styleKeywords.some(kw =>
      entity.title.toLowerCase().includes(kw) ||
      (updates.title && updates.title.toLowerCase().includes(kw))
    );

    if (isPossiblyStyle) {
      aiService.clearStyleCache();
    }

    this.scheduleSave(updated);
    return true;
  }

  // Called by P2P Client to merge updates from host silently
  ingestRemoteUpdate(entity: Entity) {
    // Just update in memory, do not schedule save
    console.log('[Vault] Ingesting remote update for:', entity.title);
    this.entities[entity.id] = entity;
    // We might need to handle connections if they changed
    // But for now simple entity replacement is enough for data consistency
  }

  scheduleSave(entity: Entity) {
    // Notify subscribers (e.g. P2P Host)
    this.subscribers.forEach(fn => fn(entity));

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
    if (this.isGuest) {
      // Allow save queue to process but do nothing
      return;
    }
    const handle = (entity as LocalEntity)._fsHandle as FileSystemFileHandle;
    if (handle) {
      const content = stringifyEntity(entity);
      await writeFile(handle, content);

      const metadataValues = Object.values(entity.metadata || {});
      const metadataKeywords = metadataValues.flatMap((value) => {
        if (typeof value === "string") return [value];
        if (Array.isArray(value)) {
          return value.filter(
            (item): item is string => typeof item === "string",
          );
        }
        return [];
      });

      const keywords = [
        ...(entity.tags || []),
        ...(entity.labels || []),
        entity.lore || "",
        ...metadataKeywords,
      ].join(" ");

      const filePath = Array.isArray(entity._path) ? entity._path.join('/') : entity._path as string;

      // Update index
      await searchService.index({
        id: entity.id,
        title: entity.title,
        content: entity.content,
        type: entity.type,
        path: filePath,
        keywords,
        updatedAt: Date.now()
      });
    }
  }

  async saveImportedAsset(blob: Blob, entityId: string, originalName: string): Promise<{ image: string; thumbnail: string }> {
    if (!this.rootHandle) throw new Error("Vault not open");
    const imagesDir = await this.rootHandle.getDirectoryHandle("images", { create: true });

    const timestamp = Date.now();
    const hash = crypto.randomUUID().split("-")[0];
    const extension = originalName.split(".").pop() || "png";
    const baseFilename = `${entityId}-${timestamp}-${hash}`;
    const filename = `${baseFilename}.${extension}`;
    const thumbFilename = `${baseFilename}-thumb.webp`;

    // Save original
    const fileHandle = await imagesDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    // Generate and save thumbnail
    const thumbBlob = await this.generateThumbnail(blob, 512);
    const thumbHandle = await imagesDir.getFileHandle(thumbFilename, { create: true });
    const thumbWritable = await thumbHandle.createWritable();
    await thumbWritable.write(thumbBlob);
    await thumbWritable.close();

    return {
      image: `./images/${filename}`,
      thumbnail: `./images/${thumbFilename}`,
    };
  }

  async createEntity(type: Entity["type"], title: string, initialData?: Partial<Entity>): Promise<string> {
    if (this.isGuest) throw new Error("Cannot create entities in Guest Mode");
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
      content: initialData?.content || "",
      tags: initialData?.tags || [],
      labels: initialData?.labels || [],
      connections: initialData?.connections || [],
      metadata: initialData?.metadata || {},
      lore: initialData?.lore,
      image: initialData?.image,
      thumbnail: initialData?.thumbnail,
      _fsHandle: handle,
      _path: [filename],
    };

    await writeFile(handle, stringifyEntity(newEntity));

    this.entities[id] = newEntity;
    this.rebuildInboundMap();

    // Index new entity
    await searchService.index({
      id,
      title,
      content: newEntity.content,
      type,
      path: filename,
      updatedAt: Date.now()
    });

    return id;
  }

  async batchCreateEntities(entitiesData: { type: Entity["type"]; title: string; initialData?: Partial<Entity> }[]): Promise<string[]> {
    if (this.isGuest) throw new Error("Cannot create entities in Guest Mode");
    if (!this.rootHandle) throw new Error("Vault not open");

    const createdIds: string[] = [];
    const searchEntries: any[] = [];

    // 1. Process all file writes
    await Promise.all(entitiesData.map(async (data) => {
      const id = sanitizeId(data.title);
      if (this.entities[id]) {
        console.warn(`Skipping duplicate entity during batch import: ${id}`);
        return;
      }

      const filename = `${id}.md`;
      const handle = await this.rootHandle!.getFileHandle(filename, { create: true });

      const newEntity: LocalEntity = {
        id,
        type: data.type,
        title: data.title,
        content: data.initialData?.content || "",
        tags: data.initialData?.tags || [],
        labels: data.initialData?.labels || [],
        connections: data.initialData?.connections || [],
        metadata: data.initialData?.metadata || {},
        lore: data.initialData?.lore,
        image: data.initialData?.image,
        thumbnail: data.initialData?.thumbnail,
        _fsHandle: handle,
        _path: [filename],
      };

      await writeFile(handle, stringifyEntity(newEntity));
      this.entities[id] = newEntity;
      createdIds.push(id);

      searchEntries.push({
        id,
        title: data.title,
        content: newEntity.content,
        type: data.type,
        path: filename,
        updatedAt: Date.now()
      });
    }));

    // 2. Single expensive rebuilding operation
    this.rebuildInboundMap();

    // 3. Batch indexing
    // Assuming searchService has a batch method or we just map promises (SearchService is usually async/concurrent safe)
    await Promise.all(searchEntries.map(entry => searchService.index(entry)));

    return createdIds;
  }

  async deleteEntity(id: string): Promise<void> {
    if (this.isGuest) throw new Error("Cannot delete entities in Guest Mode");

    // 1. Delete file
    const entity = this.entities[id];
    if (!entity) return;

    try {
      const handle = entity._fsHandle as FileSystemFileHandle;
      const path = entity._path as string[];

      if (handle && this.rootHandle) {
        // Use standard remove() if available, else fallback to removeEntry on root for top-level files
        if (typeof (handle as any).remove === 'function') {
          await (handle as any).remove();
        } else if (path && path.length === 1) {
          await this.rootHandle.removeEntry(path[0]);
        } else {
          throw new Error("Deletion of nested files is not supported in this environment.");
        }
      }

      // Remove from index
      await searchService.remove(id);

      // 2. Delete associated media
      if (entity.image || entity.thumbnail) {
        try {
          const imagesDir = await this.rootHandle?.getDirectoryHandle("images", { create: false });
          if (imagesDir) {
            const deleteFile = async (path: string) => {
              const filename = path.split("/").pop();
              if (filename) {
                await imagesDir.removeEntry(filename).catch(() => { });
              }
            };
            if (entity.image) await deleteFile(entity.image);
            if (entity.thumbnail) await deleteFile(entity.thumbnail);
          }
        } catch (err) {
          console.warn("Failed to cleanup media files during entity deletion", err);
        }
      }

      // 3. Relational Cleanup
      const inbound = this.inboundConnections[id] || [];
      for (const item of inbound) {
        const sourceId = item.sourceId;
        const source = this.entities[sourceId];
        if (source) {
          // Remove the connection from the source entity
          const updatedSource = {
            ...source,
            connections: source.connections.filter(c => c.target !== id)
          };
          this.entities[sourceId] = updatedSource;
          // Persist the change
          this.scheduleSave(updatedSource);
        }
      }

      // Remove its connections from the inbound map
      for (const conn of entity.connections) {
        this.removeInboundConnection(id, conn.target);
      }

      // Also remove any inbound connections POINTING to this entity
      delete this.inboundConnections[id];

      if (this.selectedEntityId === id) {
        this.selectedEntityId = null;
      }

      delete this.entities[id];
      this.status = "idle";
      graph.requestFit();
    } catch (err: any) {
      console.error("Failed to delete entity", err);
      this.status = "error";
      this.errorMessage = err.message;

      // Show global error notification
      import("./ui.svelte").then(({ uiStore }) => {
        uiStore.setGlobalError(`Failed to delete "${entity.title}": ${err.message}`);
      });

      throw err;
    }
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
    type: string = "neutral",
    label?: string,
  ) {
    const source = this.entities[sourceId];
    if (!source) return;

    if (
      source.connections.some((c: Connection) => c.target === targetId && c.type === type)
    ) {
      return;
    }

    const newConnection = {
      target: targetId,
      type,
      strength: 1,
      label,
    };

    const updated = {
      ...source,
      connections: [...source.connections, newConnection],
    };

    this.entities[sourceId] = updated;
    this.addInboundConnection(sourceId, newConnection);
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
      (c: Connection) => c.target === targetId,
    );
    if (connIndex === -1) return;

    const oldConnection = source.connections[connIndex];
    const updatedConnection = {
      ...oldConnection,
      ...updates,
    };

    const updated = { ...source };
    updated.connections = [...source.connections];
    updated.connections[connIndex] = updatedConnection;

    this.entities[sourceId] = updated;

    // Update inbound map
    this.removeInboundConnection(sourceId, targetId);
    this.addInboundConnection(sourceId, updatedConnection);

    this.scheduleSave(updated);
  }

  removeConnection(sourceId: string, targetId: string) {
    const source = this.entities[sourceId];
    if (!source) return;

    const updated = {
      ...source,
      connections: source.connections.filter((c: Connection) => c.target !== targetId),
    };

    this.entities[sourceId] = updated;
    this.removeInboundConnection(sourceId, targetId);
    this.scheduleSave(updated);
  }

  addLabel(entityId: string, label: string) {
    const entity = this.entities[entityId];
    if (!entity) return;

    const normalizedLabel = label.trim().toLowerCase();
    if (!normalizedLabel) return;

    // Check if label already exists (canonical check)
    if (entity.labels?.some((l) => l.toLowerCase() === normalizedLabel)) {
      return;
    }

    const newLabels = [...(entity.labels || []), normalizedLabel];
    this.updateEntity(entityId, { labels: newLabels });
  }

  removeLabel(entityId: string, label: string) {
    const entity = this.entities[entityId];
    if (!entity) return;

    const target = label.toLowerCase();
    const newLabels = (entity.labels || []).filter(
      (l) => l.toLowerCase() !== target,
    );

    this.updateEntity(entityId, { labels: newLabels });
  }

  async renameLabel(oldLabel: string, newLabel: string) {
    if (this.isGuest) return;
    const targetOld = oldLabel.trim().toLowerCase();
    const targetNew = newLabel.trim().toLowerCase();
    if (!targetNew || targetOld === targetNew) return;

    const affectedEntities = Object.values(this.entities).filter(e =>
      e.labels?.some(l => l.toLowerCase() === targetOld)
    );

    // Batch update in memory first to ensure UI remains responsive and consistent
    const updates = affectedEntities.map(entity => {
      const updatedLabels = (entity.labels || []).map(l =>
        l.toLowerCase() === targetOld ? targetNew : l
      );
      // Canonical deduplication
      const uniqueLabels = Array.from(new Set(updatedLabels.map(l => l.toLowerCase())));
      return { id: entity.id, labels: uniqueLabels };
    });

    for (const update of updates) {
      this.updateEntity(update.id, { labels: update.labels });
    }
  }

  async deleteLabel(label: string) {
    if (this.isGuest) return;
    const target = label.trim().toLowerCase();
    const affectedEntities = Object.values(this.entities).filter(e =>
      e.labels?.some(l => l.toLowerCase() === target)
    );

    const updates = affectedEntities.map(entity => {
      const updatedLabels = (entity.labels || []).filter(l =>
        l.toLowerCase() !== target
      );
      return { id: entity.id, labels: updatedLabels };
    });

    for (const update of updates) {
      this.updateEntity(update.id, { labels: update.labels });
    }
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