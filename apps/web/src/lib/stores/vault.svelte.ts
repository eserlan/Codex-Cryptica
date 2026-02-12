// apps/web/src/lib/stores/vault.svelte.ts
import { parseMarkdown, stringifyEntity, sanitizeId } from "../utils/markdown";
import {
  getOpfsRoot,
  walkOpfsDirectory,
  writeOpfsFile,
  readOpfsBlob,
  deleteOpfsEntry,
  createVaultDir,
  getVaultDir,
  deleteVaultDir,
  type FileEntry,
} from "../utils/opfs";
import {
  getPersistedHandle,
  clearPersistedHandle,
  getDB,
  type VaultRecord,
} from "../utils/idb";
import { KeyedTaskQueue } from "../utils/queue";
import type { Entity, Connection } from "schema";
import { searchService } from "../services/search";
import { cacheService } from "../services/cache";
import { aiService } from "../services/ai";
import type { IStorageAdapter } from "../cloud-bridge/types";
import { debugStore } from "./debug.svelte";
import { generateThumbnail } from "../utils/image-processing";
import { writeWithRetry, reResolveFileHandle } from "../utils/vault-io";
import { walkDirectory } from "../utils/fs";

export type LocalEntity = Entity & {
  _path?: string[];
};

class VaultStore {
  entities = $state<Record<string, LocalEntity>>({});
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
  isInitialized = $state(false);
  errorMessage = $state<string | null>(null);
  selectedEntityId = $state<string | null>(null);
  migrationRequired = $state(false);

  // Fog of War Settings
  defaultVisibility = $state<"visible" | "hidden">("visible");

  // New state for OPFS
  isOpfs = $state(true);
  isLoadingOpfs = $state(true);
  isGuest = $state(false);
  activeVaultId = $state<string | null>(null);
  availableVaults = $state<VaultRecord[]>([]);
  storageAdapter: IStorageAdapter | null = null;

  inboundConnections = $state<
    Record<string, { sourceId: string; connection: Connection }[]>
  >({});

  labelIndex = $derived.by(() => {
    const seen = new Set<string>();
    for (const entity of Object.values(this.entities)) {
      for (const label of entity.labels || []) {
        seen.add(label.trim().toLowerCase());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  private rebuildInboundMap() {
    const newInboundMap: Record<
      string,
      { sourceId: string; connection: Connection }[]
    > = {};
    for (const entity of Object.values(this.entities)) {
      for (const conn of entity.connections) {
        const targetId = conn.target;
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
    if (
      !this.inboundConnections[targetId].some(
        (c) => c.sourceId === sourceId && c.connection.type === connection.type,
      )
    ) {
      this.inboundConnections[targetId].push({ sourceId, connection });
    }
  }

  private removeInboundConnection(sourceId: string, targetId: string) {
    if (this.inboundConnections[targetId]) {
      this.inboundConnections[targetId] = this.inboundConnections[
        targetId
      ].filter((c) => c.sourceId !== sourceId);
      if (this.inboundConnections[targetId].length === 0) {
        delete this.inboundConnections[targetId];
      }
    }
  }

  get allEntities() {
    return Object.values(this.entities);
  }

  #opfsRoot: FileSystemDirectoryHandle | undefined = undefined;
  #legacyFSAHandle: FileSystemDirectoryHandle | undefined = undefined;

  get rootHandle() {
    return this.#opfsRoot;
  }

  private async getActiveVaultHandle(): Promise<
    FileSystemDirectoryHandle | undefined
  > {
    if (!this.#opfsRoot || !this.activeVaultId) return undefined;
    return await getVaultDir(this.#opfsRoot, this.activeVaultId);
  }

  vaultName = $state("Local Vault");
  private saveQueue = new KeyedTaskQueue();

  get pendingSaveCount() {
    return this.saveQueue.totalPendingCount;
  }

  constructor() {
    // Initialization now happens in init()
  }

  async listVaults(): Promise<VaultRecord[]> {
    const db = await getDB();
    const vaults = await db.getAll("vaults");
    this.availableVaults = vaults.sort(
      (a, b) => b.lastOpenedAt - a.lastOpenedAt,
    );
    return this.availableVaults;
  }

  async createVault(name: string): Promise<string> {
    if (!this.#opfsRoot) throw new Error("Storage not initialized");

    // Generate simple unique ID
    const slug = sanitizeId(name) || "vault";
    const id = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const db = await getDB();

    // Create Directory
    await createVaultDir(this.#opfsRoot, id);

    // Register
    const record: VaultRecord = {
      id,
      name,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      entityCount: 0,
    };
    await db.put("vaults", record);

    // Switch to new vault
    await this.switchVault(id);

    return id;
  }

  async renameVault(id: string, newName: string): Promise<void> {
    const db = await getDB();
    const vault = await db.get("vaults", id);
    if (vault) {
      vault.name = newName;
      await db.put("vaults", vault);
      if (this.activeVaultId === id) {
        this.vaultName = newName;
      }
      await this.listVaults();
    }
  }

  async deleteVault(id: string): Promise<void> {
    if (id === this.activeVaultId)
      throw new Error("Cannot delete active vault");
    if (!this.#opfsRoot) return;

    try {
      await deleteVaultDir(this.#opfsRoot, id);
      const db = await getDB();
      await db.delete("vaults", id);
      await this.listVaults();
    } catch (e) {
      console.warn("Failed to delete vault dir", e);
      throw new Error("Filesystem lock prevented deletion. Please try again.");
    }
  }

  async switchVault(id: string): Promise<void> {
    if (this.activeVaultId === id) return;

    // Ensure all pending changes are flushed before switching vaults
    await this.saveQueue.waitForAll();

    const db = await getDB();
    const vault = await db.get("vaults", id);
    if (!vault) throw new Error(`Vault ${id} not found`);

    // Now that we've verified the target vault exists, we can safely wipe entities
    this.entities = {};

    // Clear global chat history to prevent leakage between vaults
    // We do this at the DB level to ensure safety before any re-init
    try {
      const tx = db.transaction("chat_history", "readwrite");
      await tx.store.clear();
      await tx.done;
    } catch (e) {
      console.warn("Failed to clear chat history on vault switch", e);
    }

    this.status = "loading";
    this.errorMessage = null; // Clear old errors

    this.activeVaultId = id;
    this.vaultName = vault.name;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vault-switched", { detail: { id } }),
      );
    }

    await db.put("settings", id, "activeVaultId");

    vault.lastOpenedAt = Date.now();
    await db.put("vaults", vault);

    await this.loadFiles();
    await this.listVaults();
  }

  async init() {
    this.isInitialized = false;
    this.isLoadingOpfs = true;
    this.status = "loading";
    debugStore.log(`Vault initializing (v${__APP_VERSION__}) [OPFS Mode]...`);

    try {
      this.#opfsRoot = await getOpfsRoot();

      const db = await getDB();
      const savedVisibility = await db.get("settings", "defaultVisibility");
      if (savedVisibility) {
        this.defaultVisibility = savedVisibility;
      }

      const migrationNeeded = await this.checkForMigration();
      if (migrationNeeded) {
        this.migrationRequired = true;
        // Attempt auto-migration if permissions might already be granted
        await this.runMigration(true);
      }

      await this.migrateStructure();

      this.activeVaultId = (await db.get("settings", "activeVaultId")) || null;
      if (!this.activeVaultId && this.#opfsRoot) {
        // Initialize default vault if none active
        this.activeVaultId = "default";
        await db.put("settings", "default", "activeVaultId");
        await createVaultDir(this.#opfsRoot, "default");

        const existing = await db.get("vaults", "default");
        if (!existing) {
          await db.put("vaults", {
            id: "default",
            name: "Default Vault",
            createdAt: Date.now(),
            lastOpenedAt: Date.now(),
            entityCount: 0,
          });
        }
      }

      const vaultRecord = await db.get("vaults", this.activeVaultId!);
      this.vaultName = vaultRecord?.name || "Local Vault";

      await this.listVaults();
      await this.loadFiles();
    } catch (err) {
      console.error("Failed to init OPFS vault", err);
      debugStore.error("Failed to init OPFS vault", err);
      this.status = "error";
      this.errorMessage =
        "Your browser may not support the file system features needed for this app.";
    } finally {
      this.isLoadingOpfs = false;
      this.isInitialized = true;
      if (this.status !== "error") this.status = "idle";
    }
  }

  private async migrateStructure() {
    if (!this.#opfsRoot) return;
    try {
      try {
        await this.#opfsRoot.getDirectoryHandle("vaults");
        return;
      } catch {
        /* Initial run or vaults dir missing - proceed to migration */
      }

      const rootFiles: { handle: FileSystemFileHandle; name: string }[] = [];
      let hasImages = false;

      for await (const [name, handle] of this.#opfsRoot.entries()) {
        if (handle.kind === "file" && name.endsWith(".md")) {
          rootFiles.push({ handle: handle as FileSystemFileHandle, name });
        } else if (handle.kind === "directory" && name === "images") {
          hasImages = true;
        }
      }

      if (rootFiles.length === 0 && !hasImages) return;

      debugStore.log("Migrating root files to vaults/default...");
      const defaultVaultDir = await createVaultDir(this.#opfsRoot, "default");

      for (const file of rootFiles) {
        const content = await file.handle.getFile().then((f) => f.text());
        await writeOpfsFile([file.name], content, defaultVaultDir);
        await this.#opfsRoot.removeEntry(file.name);
      }

      if (hasImages) {
        const rootImagesDir = await this.#opfsRoot.getDirectoryHandle("images");
        const targetImagesDir = await defaultVaultDir.getDirectoryHandle(
          "images",
          { create: true },
        );
        // Walk and copy images
        // We can reuse walkOpfsDirectory but it returns nested paths.
        // For simplicity, let's assume flat images dir for now or just walk it manually.
        // Or use the walker.
        // Actually, the previous implementation I wrote in thought process was slightly manual.
        // Let's use walkOpfsDirectory for robust image copy.
        const imageFiles = await walkOpfsDirectory(rootImagesDir);
        for (const img of imageFiles) {
          const blob = await img.handle.getFile();
          await writeOpfsFile(img.path, blob, targetImagesDir);
        }
        await this.#opfsRoot.removeEntry("images", { recursive: true });
      }

      const db = await getDB();
      await db.put("vaults", {
        id: "default",
        name: "Default Vault",
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
        entityCount: rootFiles.length,
      });
      await db.put("settings", "default", "activeVaultId");
      debugStore.log("Migration to vaults/default complete.");
    } catch (e) {
      console.error("Structure migration failed", e);
    }
  }

  private async checkForMigration(): Promise<boolean> {
    const db = await getDB();
    const migrationFlag = await db.get("settings", "opfsMigrationComplete");
    if (migrationFlag) return false;

    const persisted = await getPersistedHandle();
    if (persisted) {
      this.#legacyFSAHandle = persisted;
      return true;
    }
    return false;
  }

  async runMigration(silent = false) {
    if (!this.#legacyFSAHandle || !this.#opfsRoot) return;

    // If silent is true, we only proceed if permissions are already granted.
    // If false, we are triggered by a user gesture and can prompt.
    if (silent) {
      const permission = await this.#legacyFSAHandle.queryPermission({
        mode: "read",
      });
      if (permission !== "granted") {
        debugStore.log(
          "Auto-migration paused: Waiting for user permission gesture.",
        );
        return;
      }
    }

    this.status = "loading";
    this.migrationRequired = true;
    debugStore.log("Starting migration from File System Access API to OPFS...");

    try {
      // Ensure we have permissions (will prompt if not silent)
      // On some browsers/mobile, even querying might throw if the handle is stale
      try {
        const permission = await this.#legacyFSAHandle.queryPermission({
          mode: "read",
        });
        if (permission !== "granted" && !silent) {
          await this.#legacyFSAHandle.requestPermission({ mode: "read" });
        }
      } catch (permErr) {
        debugStore.warn(
          "Failed to query/request permission, attempting re-resolve.",
          permErr,
        );
      }

      const files = await walkDirectory(this.#legacyFSAHandle);
      debugStore.log(`Migration: Found ${files.length} files to copy.`);

      for (const fileEntry of files) {
        try {
          debugStore.log(`Migrating file: /${fileEntry.path.join("/")}`);
          const content = await fileEntry.handle
            .getFile()
            .then((f) => f.text());
          await writeOpfsFile(fileEntry.path, content, this.#opfsRoot);
        } catch (fileErr: any) {
          debugStore.error(
            `Failed to migrate file /${fileEntry.path.join("/")}: ${fileErr.name} - ${fileErr.message}`,
          );
          // Re-throw to let the main catch block handle it
          throw fileErr;
        }
      }

      // Migrate images directory
      try {
        const imagesDir =
          await this.#legacyFSAHandle.getDirectoryHandle("images");
        const opfsImagesDir = await this.#opfsRoot.getDirectoryHandle(
          "images",
          { create: true },
        );
        for await (const handle of imagesDir.values()) {
          if (handle.kind === "file") {
            const file = await (handle as any).getFile();
            await writeOpfsFile([file.name], file, opfsImagesDir);
          }
        }
      } catch (e) {
        debugStore.warn(
          "No images directory to migrate or migration failed.",
          e,
        );
      }

      const db = await getDB();
      await db.put("settings", true, "opfsMigrationComplete");
      await clearPersistedHandle(); // Clear the old handle

      this.migrationRequired = false;
      debugStore.log("Migration complete. Loading files from OPFS.");
      await this.loadFiles();
    } catch (err: any) {
      console.error("Migration failed", err);
      const errorName = err?.name || "Error";
      const errorMessage = err?.message || "Unknown error";
      debugStore.error(
        `Migration to OPFS failed! [${errorName}] ${errorMessage}`,
      );

      if (!silent) {
        this.status = "error";
        this.errorMessage = `Failed to migrate your old vault: ${errorMessage}`;
      }
    }
  }

  async syncToLocal() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) {
      this.errorMessage = "No active vault to sync.";
      return;
    }

    let localHandle: FileSystemDirectoryHandle | null = null;
    const handleKey = `syncHandle_${this.activeVaultId}`;

    try {
      const db = await getDB();
      localHandle = await db.get("settings", handleKey);

      if (localHandle) {
        const permission = await localHandle.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          await localHandle.requestPermission({ mode: "readwrite" });
        }
      }

      if (!localHandle) {
        localHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        await db.put("settings", localHandle, handleKey);
      }

      this.status = "saving";
      debugStore.log(
        `Syncing Vault (${this.activeVaultId}) to local folder: ${localHandle.name}`,
      );

      const opfsFiles = await walkOpfsDirectory(vaultDir);
      for (const fileEntry of opfsFiles) {
        const blob = await fileEntry.handle.getFile();
        const localFileHandle = await reResolveFileHandle(
          localHandle,
          fileEntry.path,
          true,
        );
        await writeWithRetry(
          localHandle,
          localFileHandle,
          blob,
          fileEntry.path.join("/"),
        );
      }

      debugStore.log("Sync to local folder complete.");
    } catch (err: any) {
      if (err.name === "NotFoundError" && localHandle) {
        debugStore.error("Sync folder not found.", err);
        this.errorMessage = `Sync folder "${localHandle.name}" not found. Please select it again.`;
        const db = await getDB();
        await db.delete("settings", handleKey);
      } else if (err.name !== "AbortError") {
        console.error("Sync failed", err);
        this.errorMessage = `Sync failed: ${err.message}`;
      }
    } finally {
      this.status = "idle";
    }
  }

  async importFromFolder(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return false;

    let localHandle: FileSystemDirectoryHandle;
    if (handle) {
      localHandle = handle;
    } else {
      try {
        localHandle = await window.showDirectoryPicker({ mode: "read" });
      } catch {
        return false; // User cancelled
      }
    }

    this.status = "loading";
    this.errorMessage = null;
    try {
      // Recursively walk ALL files (including images/) from the local directory
      const allFiles = await this.#walkAllFiles(localHandle);
      debugStore.log(`Importing ${allFiles.length} files from local folder...`);

      let successCount = 0;
      let errorCount = 0;

      for (const { path, handle } of allFiles) {
        try {
          const file = await handle.getFile();
          const name = path[path.length - 1].toLowerCase();
          if (name.endsWith(".md") || name.endsWith(".markdown")) {
            const content = await file.text();
            await writeOpfsFile(path, content, vaultDir);
          } else {
            await writeOpfsFile(path, file, vaultDir);
          }
          successCount++;
        } catch (fileErr) {
          console.error(`Failed to import ${path.join("/")}:`, fileErr);
          errorCount++;
        }
      }

      await this.loadFiles();

      // Update entity count in registry
      const db = await getDB();
      const entityCount = Object.keys(this.entities).length;
      const record = await db.get("vaults", this.activeVaultId!);
      if (record) {
        record.entityCount = entityCount;
        await db.put("vaults", record);
        await this.listVaults();
      }

      debugStore.log(
        `Import complete: ${successCount} success, ${errorCount} errors. Total ${entityCount} entities.`,
      );

      if (errorCount > 0 && successCount === 0) {
        throw new Error("No files were successfully imported.");
      }

      return true;
    } catch (e: unknown) {
      console.error("Import failed", e);
      this.errorMessage = `Import failed: ${e instanceof Error ? e.message : String(e)}`;
      return false;
    } finally {
      this.status = "idle";
    }
  }

  /** Walk a directory recursively, returning ALL files (not just .md) */
  async #walkAllFiles(
    dirHandle: FileSystemDirectoryHandle,
    path: string[] = [],
  ): Promise<{ path: string[]; handle: FileSystemFileHandle }[]> {
    const results: { path: string[]; handle: FileSystemFileHandle }[] = [];

    for await (const [name, handle] of dirHandle.entries()) {
      const currentPath = [...path, name];
      if (handle.kind === "file") {
        results.push({
          path: currentPath,
          handle: handle as FileSystemFileHandle,
        });
      } else if (handle.kind === "directory") {
        const subResults = await this.#walkAllFiles(
          handle as FileSystemDirectoryHandle,
          currentPath,
        );
        results.push(...subResults);
      }
    }

    return results;
  }

  async loadFiles() {
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    this.status = "loading";
    debugStore.log("Loading files from OPFS...");

    try {
      aiService.clearStyleCache();
      const files = await walkOpfsDirectory(vaultDir, [], (err, path) => {
        debugStore.error(`Failed to scan ${path.join("/")}`, err);
      });

      // Filter for markdown files only (.md or .markdown)
      const mdFiles = files.filter((f) => {
        const name = f.path[f.path.length - 1].toLowerCase();
        return name.endsWith(".md") || name.endsWith(".markdown");
      });

      debugStore.log(`Found ${mdFiles.length} markdown files in OPFS.`);

      await searchService.clear();
      this.entities = {};
      const newInboundMap: Record<
        string,
        { sourceId: string; connection: Connection }[]
      > = {};

      const processFile = async (fileEntry: FileEntry) => {
        const filePath = fileEntry.path.join("/");
        const file = await fileEntry.handle.getFile();
        const lastModified = file.lastModified;
        const cacheKey = `${this.activeVaultId}:${filePath}`;
        const cached = await cacheService.get(cacheKey);

        let entity: LocalEntity;

        if (cached && cached.lastModified === lastModified) {
          entity = { ...cached.entity, _path: fileEntry.path };
        } else {
          const text = await file.text();
          const { metadata, content, wikiLinks } = parseMarkdown(text || "");
          const id =
            metadata.id ||
            sanitizeId(
              fileEntry.path[fileEntry.path.length - 1].replace(
                /\.(md|markdown)$/i,
                "",
              ),
            );

          const connections = [...(metadata.connections || []), ...wikiLinks];
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
            _path: fileEntry.path,
          };
          const cacheKey = `${this.activeVaultId}:${filePath}`;
          await cacheService.set(cacheKey, lastModified, entity);
        }

        if (!entity.id || entity.id === "undefined") return;
        this.entities[entity.id] = entity;

        for (const conn of entity.connections) {
          if (!newInboundMap[conn.target]) newInboundMap[conn.target] = [];
          newInboundMap[conn.target].push({
            sourceId: entity.id,
            connection: conn,
          });
        }

        const keywords = [
          ...(entity.tags || []),
          entity.lore || "",
          ...Object.values(entity.metadata || {}).flat(),
        ].join(" ");
        await searchService.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path: filePath,
          keywords,
          updatedAt: Date.now(),
        });
      };

      const CHUNK_SIZE = 5;
      for (let i = 0; i < mdFiles.length; i += CHUNK_SIZE) {
        const chunk = mdFiles.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(processFile));
      }

      this.inboundConnections = newInboundMap;
      debugStore.log(
        `Vault loaded: ${Object.keys(this.entities).length} entities from OPFS.`,
      );
    } finally {
      this.status = "idle";
      this.isInitialized = true;
    }
  }

  async saveToDisk(entity: Entity, targetVaultId?: string | null) {
    if (this.isGuest) return;
    const vid = targetVaultId || this.activeVaultId;
    if (!vid || !this.#opfsRoot) {
      console.warn("OPFS not available, skipping save.");
      return;
    }
    const vaultDir = await getVaultDir(this.#opfsRoot, vid);

    const path = (entity as LocalEntity)._path || [`${entity.id}.md`];
    try {
      const content = stringifyEntity(entity);
      await writeOpfsFile(path, content, vaultDir);

      // Update search index if it's the active vault
      if (vid === this.activeVaultId) {
        const keywords = [
          ...(entity.tags || []),
          entity.lore || "",
          ...Object.values(entity.metadata || {}).flat(),
        ].join(" ");
        await searchService.index({
          id: entity.id,
          title: entity.title,
          content: entity.content,
          type: entity.type,
          path: path.join("/"),
          keywords,
          updatedAt: Date.now(),
        });
      }
    } catch (err: any) {
      this.status = "error";
      this.errorMessage = `Failed to save ${entity.title}: ${err.message}`;
      debugStore.error(`Save to OPFS failed for ${entity.id}`, err);
      throw err;
    }
  }

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData?: Partial<Entity>,
  ): Promise<string> {
    if (this.isGuest) throw new Error("Cannot create entities in Guest Mode");
    const id = sanitizeId(title);
    if (this.entities[id]) {
      throw new Error(`Entity ${id} already exists`);
    }
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) throw new Error("Vault not open");

    const filename = `${id}.md`;
    const newEntity: LocalEntity = {
      id,
      type,
      title,
      content: initialData?.content || "",
      tags: initialData?.tags || [],
      labels: initialData?.labels || [],
      connections: initialData?.connections || [],
      metadata: initialData?.metadata || {},
      _path: [filename],
    };

    await writeOpfsFile([filename], stringifyEntity(newEntity), vaultDir);
    this.entities[id] = newEntity;
    this.rebuildInboundMap();

    await searchService.index({
      id,
      title,
      content: newEntity.content,
      type,
      path: filename,
      updatedAt: Date.now(),
    });

    return id;
  }

  // All other methods like `updateEntity`, `deleteEntity`, etc., can largely remain the same,
  // as they call `scheduleSave`, which in turn calls the refactored `saveToDisk`.
  // The `deleteEntity` method will need to be updated to use an OPFS `removeEntry` equivalent.

  // ... (pasting the rest of the methods, but will need to adapt delete and image handling)

  // NOTE: This is a simplified paste. `deleteEntity` and image handling methods
  // will need to be fully refactored to use OPFS.
  // For brevity, I'll focus on the core architectural change first.
  // The following methods are placeholders and need to be adapted.

  updateEntity(id: string, updates: Partial<Entity>): boolean {
    const entity = this.entities[id];
    if (!entity) return false;

    const updated = { ...entity, ...updates };
    this.entities[id] = updated as any;

    const styleKeywords = [
      "art style",
      "visual aesthetic",
      "world guide",
      "style",
    ];
    const isPossiblyStyle = styleKeywords.some(
      (kw) =>
        entity.title.toLowerCase().includes(kw) ||
        (updates.title && updates.title.toLowerCase().includes(kw)),
    );

    if (isPossiblyStyle) {
      aiService.clearStyleCache();
    }

    this.scheduleSave(updated);
    return true;
  }

  scheduleSave(entity: Entity) {
    this.status = "saving";
    const targetVaultId = this.activeVaultId;
    this.saveQueue
      .enqueue(entity.id, async () => {
        await this.saveToDisk(entity, targetVaultId);
        this.status = "idle";
      })
      .catch((err) => {
        console.error("Save failed for", entity.title, err);
        this.status = "error";
      });
  }

  addLabel(id: string, label: string): boolean {
    const entity = this.entities[id];
    if (!entity) return false;

    const labels = entity.labels || [];
    if (labels.includes(label)) return false;

    const updated = { ...entity, labels: [...labels, label] };
    this.entities[id] = updated as any;
    this.scheduleSave(updated);
    return true;
  }

  removeLabel(id: string, label: string): boolean {
    const entity = this.entities[id];
    if (!entity) return false;

    const labels = entity.labels || [];
    if (!labels.includes(label)) return false;

    const updated = {
      ...entity,
      labels: labels.filter((l) => l !== label),
    };
    this.entities[id] = updated as any;
    this.scheduleSave(updated);
    return true;
  }

  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
  ): boolean {
    const entity = this.entities[sourceId];
    if (!entity) return false;

    const connection: Connection = {
      target: targetId,
      type,
      label,
      strength: 1,
    };
    const updated = {
      ...entity,
      connections: [...entity.connections, connection],
    };

    this.entities[sourceId] = updated as any;
    this.addInboundConnection(sourceId, connection);
    this.scheduleSave(updated);
    return true;
  }

  updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): boolean {
    const entity = this.entities[sourceId];
    if (!entity) return false;

    const connections = entity.connections.map((c) => {
      if (c.target === targetId && c.type === oldType) {
        return { ...c, type: newType, label: newLabel };
      }
      return c;
    });

    const updated = { ...entity, connections };
    this.entities[sourceId] = updated as any;

    // Update inbound map
    this.removeInboundConnection(sourceId, targetId);
    this.addInboundConnection(sourceId, {
      target: targetId,
      type: newType,
      label: newLabel,
      strength: 1,
    });

    this.scheduleSave(updated);
    return true;
  }

  removeConnection(sourceId: string, targetId: string, type: string): boolean {
    const entity = this.entities[sourceId];
    if (!entity) return false;

    const connections = entity.connections.filter(
      (c) => !(c.target === targetId && c.type === type),
    );

    const updated = { ...entity, connections };
    this.entities[sourceId] = updated as any;
    this.removeInboundConnection(sourceId, targetId);
    this.scheduleSave(updated);
    return true;
  }

  async saveImageToVault(
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<string> {
    if (this.isGuest) throw new Error("Cannot save images in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) throw new Error("Vault not open");

    const entity = this.entities[entityId];
    if (!entity) throw new Error(`Entity ${entityId} not found`);

    const extension = blob.type.split("/")[1] || "png";
    const timestamp = Date.now();
    const baseName = originalName
      ? originalName.replace(/\.[^/.]+$/, "")
      : `img_${entityId}_${timestamp}`;
    const filename = `${baseName}.${extension}`;
    const thumbFilename = `${baseName}_thumb.jpg`;

    try {
      const imagesDir = await vaultDir.getDirectoryHandle("images", {
        create: true,
      });

      // Save original image
      await writeOpfsFile([filename], blob, imagesDir);

      // Generate and save thumbnail
      const thumbnailBlob = await generateThumbnail(blob, 200);
      await writeOpfsFile([thumbFilename], thumbnailBlob, imagesDir);

      const imagePath = `images/${filename}`;
      const thumbnailPath = `images/${thumbFilename}`;

      // Update entity
      this.updateEntity(entityId, {
        image: imagePath,
        thumbnail: thumbnailPath,
      });

      return imagePath;
    } catch (err: any) {
      console.error("Failed to save image to OPFS", err);
      debugStore.error(`Image save failed for ${entityId}`, err);
      throw err;
    }
  }

  async batchCreateEntities(
    batch: {
      type: Entity["type"];
      title: string;
      initialData?: Partial<Entity>;
    }[],
  ): Promise<string[]> {
    if (this.isGuest) throw new Error("Cannot create entities in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) throw new Error("Vault not open");

    const createdIds: string[] = [];

    for (const item of batch) {
      try {
        const id = await this.createEntity(
          item.type,
          item.title,
          item.initialData,
        );
        createdIds.push(id);
      } catch (err) {
        console.warn(`Batch item failed: ${item.title}`, err);
      }
    }

    return createdIds;
  }

  async resolveImageUrl(path: string): Promise<string> {
    if (!path) return "";

    // If it's already a data URI or blob, return as is
    if (/^(data:|blob:)/.test(path)) {
      return path;
    }

    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return path; // Fallback to raw path if no vault

    // 1. Check if it's an external URL
    if (/^https?:\/\//.test(path)) {
      try {
        const cacheDir = await vaultDir.getDirectoryHandle(".cache", {
          create: true,
        });
        const externalDir = await cacheDir.getDirectoryHandle(
          "external_images",
          { create: true },
        );

        // Create a unique filename based on the URL
        const safeName =
          path
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()
            .slice(-100) + ".cache";

        try {
          // Check if already in cache
          const blob = await readOpfsBlob([safeName], externalDir);
          return URL.createObjectURL(blob);
        } catch {
          // Not in cache, try to fetch it
          let blob: Blob;
          try {
            const response = await fetch(path, { mode: "cors" });
            if (!response.ok)
              throw new Error(`Fetch failed: ${response.status}`);
            blob = await response.blob();
          } catch (err) {
            // CORS failure or other error; do not use a third-party proxy to avoid leaking URLs
            console.warn(`Failed to fetch external image ${path}`, err);
            throw err;
          }

          // Save to cache
          await writeOpfsFile([safeName], blob, externalDir);
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn(`Failed to process external image cache for ${path}`, err);
        return path; // Fallback to raw URL
      }
    }

    try {
      // Sanitize path: remove leading './' or '/' and filter empty segments
      const segments = path
        .replace(/^(\.\/|\/)/, "")
        .split("/")
        .filter((s) => s && s !== ".");

      const blob = await readOpfsBlob(segments, vaultDir);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn(`Failed to resolve image path: ${path}`, err);
      return "";
    }
  }

  async setDefaultVisibility(visibility: "visible" | "hidden") {
    this.defaultVisibility = visibility;
    const db = await getDB();
    await db.put("settings", visibility, "defaultVisibility");
  }

  async deleteEntity(id: string): Promise<void> {
    if (this.isGuest) throw new Error("Cannot delete entities in Guest Mode");
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    const entity = this.entities[id];
    if (!entity) return;
    const path = entity._path || [`${id}.md`];

    try {
      // 1. Delete file from OPFS
      await deleteOpfsEntry(vaultDir, path);

      // 2. Delete images from OPFS
      if (entity.image) {
        try {
          const imagePath = entity.image.split("/");
          await deleteOpfsEntry(vaultDir, imagePath);
        } catch (e) {
          console.warn("Failed to delete image", e);
        }
      }
      if (entity.thumbnail) {
        try {
          const thumbPath = entity.thumbnail.split("/");
          await deleteOpfsEntry(vaultDir, thumbPath);
        } catch (e) {
          console.warn("Failed to delete thumbnail", e);
        }
      }

      // 3. Remove from memory and search
      delete this.entities[id];
      await searchService.remove(id);

      // 4. Cleanup connections
      for (const conn of entity.connections) {
        this.removeInboundConnection(id, conn.target);
      }

      const inbound = this.inboundConnections[id] || [];
      for (const { sourceId } of inbound) {
        const sourceEntity = this.entities[sourceId];
        if (sourceEntity) {
          // Find all connections from source that target this deleted entity
          const connsToRemove = sourceEntity.connections.filter(
            (c) => c.target === id,
          );
          for (const c of connsToRemove) {
            // Remove them one by one (this schedules saves for source entities)
            this.removeConnection(sourceId, id, c.type);
          }
        }
      }

      delete this.inboundConnections[id];
    } catch (err: any) {
      console.error("Failed to delete entity", err);
      // ... (error handling)
      this.status = "error";
      this.errorMessage = `Failed to delete ${entity.title}: ${err.message}`;
      debugStore.error(`Delete failed for ${id}`, err);
      throw err;
    }
  }
}

export const vault = new VaultStore();
