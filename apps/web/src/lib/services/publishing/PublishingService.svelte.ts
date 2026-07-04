import { GuestExporter } from "@codex/vault-engine";
import type { PublishRegistry } from "schema";
import { getPublishTurnstileToken } from "./turnstile";
import { retryWithBackoff } from "$lib/utils/retry";
import { worldStore } from "$lib/stores/world.svelte";

export interface PublishingServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
  getPublishTurnstileToken?: () => Promise<string>;
  getPublishRegistry: (vaultId: string) => Promise<PublishRegistry | undefined>;
  savePublishRegistry: (registry: PublishRegistry) => Promise<void>;
  deletePublishRegistry: (vaultId: string) => Promise<void>;
  listPublishRegistries: () => Promise<PublishRegistry[]>;
  vault: any;
  mapRegistry: any;
  canvasRegistry: any;
  themeStore: any;
  notificationStore: any;
}

export class PublishingService {
  isPublishing = $state<boolean>(false);
  progress = $state<number>(0);
  statusMessage = $state<string>("");
  get activeVaultId() {
    return this.deps?.vault?.activeVaultId || "";
  }

  publishedVaults = $state<Record<string, PublishRegistry>>({});

  constructor(private deps: PublishingServiceDeps) {
    this.loadRegistries();
  }

  async loadRegistries() {
    try {
      const list = await this.deps.listPublishRegistries();
      const map: Record<string, PublishRegistry> = {};
      for (const reg of list) {
        map[reg.vaultId] = reg;
      }
      this.publishedVaults = map;
    } catch (e) {
      console.error("[PublishingService] Failed to load registries:", e);
    }
  }

  async loadFromVault(vaultId: string, vaultHandle: FileSystemDirectoryHandle) {
    const diskRegistry = await loadPublishRegistryFromDisk(vaultHandle);
    if (!diskRegistry) return;
    const idbRegistry = await this.deps.getPublishRegistry(vaultId);
    if (
      !idbRegistry ||
      diskRegistry.publishedAt > (idbRegistry.publishedAt ?? "")
    ) {
      await this.deps.savePublishRegistry(diskRegistry);
      this.publishedVaults = {
        ...this.publishedVaults,
        [vaultId]: diskRegistry,
      };
    }
  }

  private isLocalPath(path: string): boolean {
    if (!path) return false;
    const p = path.trim();
    return !/^(data:|blob:|https?:)/i.test(p);
  }

  private pathToAssetId(path: string): string {
    return path
      .trim()
      .replace(/^(\.\/|\/)/, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_");
  }

  private async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async resolveAsset(path: string) {
    const fetcher = this.deps.fetch || fetch;
    try {
      const blobUrl = await this.deps.vault.resolveImageUrl(path);
      if (!blobUrl || !blobUrl.startsWith("blob:")) {
        throw new Error(`Failed to resolve local path to a blob URL: ${path}`);
      }
      const res = await fetcher(blobUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch blob from URL ${blobUrl}`);
      }
      const blob = await res.blob();
      const hash = await this.calculateHash(blob);
      return {
        path,
        blob,
        mimeType: blob.type || "application/octet-stream",
        hash,
      };
    } catch (err) {
      console.error(
        `[PublishingService] Failed to resolve asset ${path}:`,
        err,
      );
      return null;
    }
  }

  async getPublishPreview(_vaultId: string) {
    const entities = this.deps.vault.allEntities || [];
    const maps = this.deps.mapRegistry.allMaps || [];
    const canvases = this.deps.canvasRegistry.allCanvases || [];
    const defaultVisibility = this.deps.vault.defaultVisibility || "visible";
    const activeTheme = this.deps.themeStore.activeTheme;

    // Dry run
    const bundle = GuestExporter.export({
      entities,
      defaultVisibility,
      activeTheme: activeTheme ? $state.snapshot(activeTheme) : {},
      publishId: "preview-id",
      vaultTitle: this.deps.vault.activeVaultRecord?.name || "Untitled World",
      publisherVersion: "1.0.0",
      maps,
      canvases,
    });

    const localPaths = new Set<string>();
    for (const e of bundle.entities) {
      if (e.image && this.isLocalPath(e.image)) localPaths.add(e.image);
      if (e.thumbnail && this.isLocalPath(e.thumbnail))
        localPaths.add(e.thumbnail);
    }
    for (const m of bundle.maps || []) {
      if (m.assetPath && this.isLocalPath(m.assetPath))
        localPaths.add(m.assetPath);
    }

    return {
      included: {
        entityCount: bundle.entities.length,
        relationshipCount: bundle.relationships.length,
        mapCount: (bundle.maps || []).length,
        canvasCount: (bundle.canvases || []).length,
        assetCount: localPaths.size,
      },
      excluded: {
        entityCount: entities.length - bundle.entities.length,
        relationshipCount:
          entities.reduce(
            (acc: number, e: any) => acc + (e.connections?.length || 0),
            0,
          ) - bundle.relationships.length,
        mapCount: maps.length - (bundle.maps || []).length,
        canvasCount: canvases.length - (bundle.canvases || []).length,
      },
    };
  }

  async publish(vaultId: string): Promise<PublishRegistry> {
    if (this.isPublishing) {
      throw new Error("A publish operation is already in progress.");
    }

    this.isPublishing = true;
    this.progress = 0;
    this.statusMessage = "Preparing campaign snapshot...";

    try {
      const entities = this.deps.vault.allEntities || [];
      const maps = this.deps.mapRegistry.allMaps || [];
      const canvases = this.deps.canvasRegistry.allCanvases || [];
      const defaultVisibility = this.deps.vault.defaultVisibility || "visible";
      const activeTheme = this.deps.themeStore.activeTheme;

      // Identify referenced assets
      const localPaths = new Set<string>();

      const tempBundle = GuestExporter.export({
        entities,
        defaultVisibility,
        activeTheme: activeTheme ? $state.snapshot(activeTheme) : {},
        publishId: "temp-preview-id",
        vaultTitle: this.deps.vault.activeVaultRecord?.name || "Untitled World",
        publisherVersion: "1.0.0",
        maps,
        canvases,
      });

      for (const e of tempBundle.entities) {
        if (e.image && this.isLocalPath(e.image)) localPaths.add(e.image);
        if (e.thumbnail && this.isLocalPath(e.thumbnail))
          localPaths.add(e.thumbnail);
      }
      for (const m of tempBundle.maps || []) {
        if (m.assetPath && this.isLocalPath(m.assetPath))
          localPaths.add(m.assetPath);
      }

      this.statusMessage = `Resolving local assets (0/${localPaths.size})...`;
      this.progress = 5;

      const assetsToUpload: Array<{
        path: string;
        blob: Blob;
        mimeType: string;
        hash: string;
        assetId: string;
      }> = [];
      let resolvedCount = 0;

      for (const path of localPaths) {
        const resolved = await this.resolveAsset(path);
        resolvedCount++;
        this.statusMessage = `Resolving local assets (${resolvedCount}/${localPaths.size})...`;
        this.progress = 5 + Math.round((resolvedCount / localPaths.size) * 15);

        if (resolved) {
          assetsToUpload.push({
            ...resolved,
            assetId: this.pathToAssetId(path),
          });
        }
      }

      // Check existing publish registry
      const existingRegistry =
        this.publishedVaults[vaultId] ||
        (await this.deps.getPublishRegistry(vaultId));
      const isUpdate = !!existingRegistry;
      const publishId = existingRegistry?.publishId || "";
      const writeToken = existingRegistry?.writeToken || "";

      // Construct asset manifest
      const assetManifest = assetsToUpload.map((a) => ({
        assetId: a.assetId,
        filename: a.path,
        mimeType: a.mimeType,
        hash: a.hash,
      }));

      const fetcher = this.deps.fetch || fetch;
      const baseUrl =
        this.deps.baseUrl ||
        (typeof import.meta !== "undefined" &&
          import.meta.env?.VITE_ORACLE_PROXY_URL) ||
        (typeof import.meta !== "undefined" &&
        import.meta.env?.DEV &&
        !import.meta.env?.VITEST
          ? "http://localhost:8787"
          : "https://oracle-proxy.espen-erlandsen.workers.dev");
      let previousManifest: Array<{ assetId: string; hash?: string }> = [];

      if (isUpdate && publishId) {
        try {
          const previousBundleResponse = await fetcher(
            `${baseUrl}/api/published/${publishId}/bundle`,
          );
          if (previousBundleResponse.ok) {
            const previousBundle = await previousBundleResponse.json();
            previousManifest = previousBundle.assetManifest || [];
          }
        } catch (e) {
          console.warn(
            "[PublishingService] Failed to load previous manifest, uploading all assets",
            e,
          );
        }
      }

      this.statusMessage = "Compiling final guest bundle...";
      this.progress = 25;

      const finalBundle = GuestExporter.export({
        entities,
        defaultVisibility,
        activeTheme: activeTheme ? $state.snapshot(activeTheme) : {},
        publishId,
        vaultTitle: this.deps.vault.activeVaultRecord?.name || "Untitled World",
        publisherVersion: "1.0.0",
        maps,
        canvases,
        assetManifest,
        metadata: worldStore.metadata
          ? {
              description: worldStore.metadata.description,
              coverImage: worldStore.metadata.coverImage,
            }
          : undefined,
      });

      this.statusMessage = "Uploading snapshot bundle...";
      this.progress = 30;

      const publishUrl = isUpdate
        ? `${baseUrl}/api/publish-vault?publishId=${publishId}`
        : `${baseUrl}/api/publish-vault`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isUpdate && writeToken) {
        headers["Authorization"] = `Bearer ${writeToken}`;
      } else {
        headers["X-Turnstile-Token"] = await (
          this.deps.getPublishTurnstileToken || getPublishTurnstileToken
        )();
      }

      const response = await fetcher(publishUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(finalBundle),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message ||
            `Failed to upload bundle: ${response.statusText}`,
        );
      }

      const result = await response.json();
      const newPublishId = result.publishId;
      const newWriteToken = result.writeToken;
      const publishedAt = result.publishedAt;

      finalBundle.publishId = newPublishId;
      finalBundle.publishedAt = publishedAt;

      // Diff assets to find uploads and deletions
      let assetsToUploadFiltered = assetsToUpload;
      const assetsToDelete: string[] = [];

      if (isUpdate) {
        assetsToUploadFiltered = assetsToUpload.filter((newAsset) => {
          const oldAsset = previousManifest.find(
            (asset) => asset.assetId === newAsset.assetId,
          );
          return !oldAsset || oldAsset.hash !== newAsset.hash;
        });

        for (const oldAsset of previousManifest) {
          const stillExists = assetManifest.some(
            (newAsset) => newAsset.assetId === oldAsset.assetId,
          );
          if (!stillExists) {
            assetsToDelete.push(oldAsset.assetId);
          }
        }
      }

      let assetUploadIndex = 0;
      for (const asset of assetsToUploadFiltered) {
        this.statusMessage = `Uploading asset ${assetUploadIndex + 1}/${assetsToUploadFiltered.length}: ${asset.path.split("/").pop()}...`;
        this.progress =
          40 +
          Math.round((assetUploadIndex / assetsToUploadFiltered.length) * 40);

        const assetUrl = `${baseUrl}/api/published/${newPublishId}/assets/${asset.assetId}`;
        const assetHeaders: Record<string, string> = {
          Authorization: `Bearer ${newWriteToken}`,
          "Content-Type": asset.mimeType,
          "X-Filename": asset.path.split("/").pop() || asset.assetId,
        };

        // Enough backoff budget (2+4+8+16+30+30 ≈ 90s) to outlast a full
        // 60s rate-limit window on large first-time publishes.
        const assetResponse = await retryWithBackoff(
          () =>
            fetcher(assetUrl, {
              method: "POST",
              headers: assetHeaders,
              body: asset.blob,
            }),
          {
            attempts: 6,
            retryOnError: false,
            shouldRetry: (response) => response.status === 429,
            delayMs: (attempt, response) => {
              const retryAfter = response?.headers.get("Retry-After");
              return retryAfter
                ? parseInt(retryAfter, 10) * 1000
                : Math.min(1000 * Math.pow(2, attempt + 1), 30_000);
            },
            onRetry: (_attempt, delay) => {
              console.warn(
                `[PublishingService] Rate limited (429) uploading ${asset.path}, retrying in ${delay}ms...`,
              );
            },
          },
        );

        if (!assetResponse.ok) {
          throw new Error(
            `Failed to upload asset ${asset.path}: ${assetResponse.statusText || "Unknown error"}`,
          );
        }
        assetUploadIndex++;
      }

      if (assetsToDelete.length > 0) {
        this.statusMessage = `Cleaning up ${assetsToDelete.length} orphaned assets...`;
        for (const assetId of assetsToDelete) {
          const deleteUrl = `${baseUrl}/api/published/${newPublishId}/assets/${assetId}`;
          const deleteHeaders = {
            Authorization: `Bearer ${newWriteToken}`,
          };
          await fetcher(deleteUrl, {
            method: "DELETE",
            headers: deleteHeaders,
          }).catch((err) => {
            console.warn(
              `[PublishingService] Failed to delete orphaned asset ${assetId}:`,
              err,
            );
          });
        }
      }

      const registry: PublishRegistry = {
        vaultId,
        publishId: newPublishId,
        writeToken: newWriteToken,
        publishedAt,
        stats: {
          entityCount: finalBundle.entities.length,
          relationshipCount: finalBundle.relationships.length,
          assetCount: assetManifest.length,
        },
      };

      await this.deps.savePublishRegistry(registry);

      this.publishedVaults = {
        ...this.publishedVaults,
        [vaultId]: registry,
      };

      this.progress = 100;
      this.statusMessage = "World snapshot published successfully!";
      this.deps.notificationStore.notify(
        "World snapshot published successfully!",
        "success",
      );

      return registry;
    } catch (err: any) {
      this.progress = 0;
      this.statusMessage = `Publish failed: ${err.message}`;
      this.deps.notificationStore.notify(
        `Publish failed: ${err.message}`,
        "error",
      );
      throw err;
    } finally {
      this.isPublishing = false;
    }
  }

  async unpublish(vaultId: string): Promise<void> {
    const existing =
      this.publishedVaults[vaultId] ||
      (await this.deps.getPublishRegistry(vaultId));
    if (!existing) {
      throw new Error("This campaign has not been published.");
    }

    this.isPublishing = true;
    this.progress = 0;
    this.statusMessage = "Unpublishing campaign...";

    try {
      const fetcher = this.deps.fetch || fetch;
      const baseUrl =
        this.deps.baseUrl ||
        (typeof import.meta !== "undefined" &&
          import.meta.env?.VITE_ORACLE_PROXY_URL) ||
        (typeof import.meta !== "undefined" &&
        import.meta.env?.DEV &&
        !import.meta.env?.VITEST
          ? "http://localhost:8787"
          : "https://oracle-proxy.espen-erlandsen.workers.dev");
      const deleteUrl = `${baseUrl}/api/published/${existing.publishId}`;

      const response = await fetcher(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${existing.writeToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message ||
            `Failed to delete remote snapshot: ${response.statusText}`,
        );
      }

      await this.deps.deletePublishRegistry(vaultId);

      const newPublishedVaults = { ...this.publishedVaults };
      delete newPublishedVaults[vaultId];
      this.publishedVaults = newPublishedVaults;

      this.progress = 100;
      this.statusMessage = "World snapshot unpublished successfully.";
      this.deps.notificationStore.notify(
        "World snapshot unpublished successfully.",
        "success",
      );
    } catch (err: any) {
      this.progress = 0;
      this.statusMessage = `Unpublish failed: ${err.message}`;
      this.deps.notificationStore.notify(
        `Unpublish failed: ${err.message}`,
        "error",
      );
      throw err;
    } finally {
      this.isPublishing = false;
    }
  }
}

import { vault } from "../../stores/vault.svelte";
import { mapRegistry } from "../../stores/map-registry.svelte";
import { canvasRegistry } from "../../stores/canvas-registry.svelte";
import { themeStore } from "../../stores/theme.svelte";
import { notificationStore } from "../../stores/ui/notification.svelte";
import {
  savePublishRegistryToDisk,
  loadPublishRegistryFromDisk,
  deletePublishRegistryFromDisk,
} from "../../stores/vault/io";

const KEY = "__codex_publishing_service__";
export const publishingService: PublishingService =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new PublishingService({
    getPublishRegistry: async (id) => {
      const { getPublishRegistry } =
        await import("../../stores/vault/registry");
      return getPublishRegistry(id);
    },
    savePublishRegistry: async (registry) => {
      const { savePublishRegistry } =
        await import("../../stores/vault/registry");
      await savePublishRegistry(registry);
      const handle = await vault.getSpecificVaultHandle(registry.vaultId);
      if (handle) await savePublishRegistryToDisk(handle, registry);
    },
    deletePublishRegistry: async (id) => {
      const { deletePublishRegistry } =
        await import("../../stores/vault/registry");
      await deletePublishRegistry(id);
      const handle = await vault.getSpecificVaultHandle(id);
      if (handle) await deletePublishRegistryFromDisk(handle);
    },
    listPublishRegistries: async () => {
      const { listPublishRegistries } =
        await import("../../stores/vault/registry");
      return listPublishRegistries();
    },
    vault,
    mapRegistry,
    canvasRegistry,
    themeStore,
    notificationStore,
  }));
