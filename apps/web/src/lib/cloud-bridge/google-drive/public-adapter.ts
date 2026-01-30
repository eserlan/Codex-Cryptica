import type { ICloudShareProvider, SerializedGraph } from "../types";
import { parseMarkdown, sanitizeId } from "../../utils/markdown";

export class PublicGDriveAdapter implements ICloudShareProvider {
  async shareFilePublicly(_fileId: string): Promise<string> {
    throw new Error("PublicGDriveAdapter is strictly for fetching. Use authenticated adapter for sharing.");
  }

  async revokeShare(_fileId: string): Promise<void> {
    throw new Error("PublicGDriveAdapter is strictly for fetching. Use authenticated adapter for revoking.");
  }

  private async ensureGapiInited(apiKey: string): Promise<boolean> {
    if (typeof gapi === "undefined") return false;

    if (!gapi.client) {
      await new Promise<void>((resolve) => gapi.load("client", resolve));
    }

    try {
      if (!(gapi.client as any).drive) {
        await gapi.client.init({
          apiKey: apiKey,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        });
      } else if (apiKey) {
        // If already inited but we have a new key, we can't easily re-init,
        // but gapi calls usually allow passing the key per-request.
      }
      return true;
    } catch (e) {
      console.error("[PublicGDriveAdapter] GAPI init failed", e);
      return false;
    }
  }

  private async waitForGapi(apiKey: string, timeout = 5000): Promise<boolean> {
    const start = Date.now();
    // First attempt to init it ourselves
    await this.ensureGapiInited(apiKey);

    while (Date.now() - start < timeout) {
      if (typeof gapi !== "undefined" && gapi.client && (gapi.client as any).drive) {
        return true;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  }

  private requestMutex: Promise<void> = Promise.resolve();

  private async withLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.requestMutex;
    let resolve: () => void;
    this.requestMutex = new Promise(r => resolve = r);
    await previous;
    try {
      return await task();
    } finally {
      // @ts-expect-error - resolve is initialized in the Promise executor above
      resolve();
    }
  }

  async fetchPublicFile(fileId: string, apiKey: string): Promise<Blob> {
    if (!apiKey) {
      throw new Error("API Key is required for public fetch.");
    }

    return this.withLock(async () => {
      // Phase 1: Try GAPI Request (Bypasses CORS for public files)
      const gapiReady = await this.waitForGapi(apiKey);
      if (gapiReady) {
        try {
          console.log(`[PublicGDriveAdapter] Requesting content: ${fileId}`);
          // Use low-level request for media content to avoid body parsing issues
          const response = await (gapi.client as any).request({
            path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
            params: {
              alt: 'media',
              key: apiKey,
              acknowledgeAbuse: true
            }
          });

          if (response.body) {
            return new Blob([response.body], { type: 'text/plain' });
          }
          if (response.result) {
            const content = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);
            return new Blob([content], { type: 'text/plain' });
          }
        } catch (err: any) {
          console.warn(`[PublicGDriveAdapter] GAPI Content access failed for ${fileId}. Status: ${err.status}`);
          // If it's a 404, we can stop immediately
          if (err.status === 404) throw new Error("File Not Found");

          // If it's a 403, it might be bot detection or missing permissions. 
          // We'll let it fall through to the fetch Phase 2.
        }
      }

      // Phase 2: Fallback to direct Fetch
      // This sometimes works if GAPI's postMessage bridge is being flagged
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&alt=media&acknowledgeAbuse=true`;
      try {
        const response = await fetch(url);
        if (response.ok) return await response.blob();

        if (response.status === 403) {
          // If we get here, Google is strictly denying access. 
          // This is either "Anyone with link" is not set, or your IP/API Key is flagged.
          throw new Error("Access Denied: Is the file shared correctly? Google might also be blocking automated requests.");
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (err: any) {
        // Check if we already have a descriptive error from above
        if (err.message?.includes("Access Denied")) throw err;
        throw new Error(`Fetch failed: ${err.message || 'Unknown Network Error'}`);
      }
    });
  }

  /**
   * Fetches all .md files from a public folder and returns a SerializedGraph.
   */
  async fetchPublicFolder(folderId: string, apiKey: string): Promise<SerializedGraph> {
    if (!apiKey) {
      throw new Error("API Key is required for guest mode.");
    }

    const gapiReady = await this.waitForGapi(apiKey);

    // Fallback logic if GAPI fails to load
    if (!gapiReady) {
      console.warn("[PublicGDriveAdapter] GAPI not available for folder listing, falling back to fetch.");
      return this.fetchPublicFolderLegacy(folderId, apiKey);
    }

    // 1. List files in folder using GAPI
    try {
      const encodedFolderId = folderId; // GAPI handles encoding
      const listResponse = await this.withLock(() => gapi.client.drive.files.list({
        q: `'${encodedFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink, mimeType)',
        key: apiKey
      }));

      const allFiles = listResponse.result.files || [];
      const assets: Record<string, string> = {};
      const mdFiles: any[] = [];

      const processFiles = (filesList: any[], prefix = "") => {
        filesList.forEach((f: any) => {
          if (f.name.endsWith(".md")) {
            mdFiles.push(f);
          } else if (f.mimeType !== 'application/vnd.google-apps.folder') {
            const assetValue = `${f.id}${f.thumbnailLink ? '|' + f.thumbnailLink : ''}`;
            assets[f.name] = assetValue;
            assets[`${prefix}${f.name}`] = assetValue;
            assets[`./${prefix}${f.name}`] = assetValue;
          }
        });
      };

      processFiles(allFiles);

      // 1b. Background images folder listing
      const imagesFolder = allFiles.find((f: any) => f.name === "images" && f.mimeType === "application/vnd.google-apps.folder");
      let imagesListingPromise = Promise.resolve();
      if (imagesFolder) {
        console.log("[PublicGDriveAdapter] Found images folder, queuing background listing...");
        // Use withLock to ensure it stays in sequence even if triggered "in background"
        imagesListingPromise = this.withLock(() => gapi.client.drive.files.list({
          q: `'${imagesFolder.id}' in parents and trashed = false`,
          fields: 'files(id, name, thumbnailLink, webContentLink, mimeType)',
          key: apiKey
        })).then(imgData => {
          console.log(`[PublicGDriveAdapter] Background images listing complete: ${imgData.result.files?.length || 0} assets found.`);
          processFiles(imgData.result.files || [], "images/");
        }).catch(err => console.error("[PublicGDriveAdapter] Background images listing failed", err));
      }

      if (mdFiles.length === 0) {
        throw new Error("No markdown files found in the shared campaign folder.");
      }

      const graph: SerializedGraph = {
        version: 1,
        entities: {},
        assets,
        deferredAssets: imagesListingPromise,
        totalFiles: mdFiles.length
      };

      // 2. Fetch each file and parse
      // Process in parallel with low concurrency for snappiness
      const CONCURRENCY = 1; // Sequential to be careful with GDrive throttling/blocks
      const errors: string[] = [];

      const fetchEntity = async (file: any, attempt = 1): Promise<void> => {
        try {
          const blob = await this.fetchPublicFile(file.id, apiKey);
          const text = await blob.text();
          const { metadata, content, wikiLinks } = parseMarkdown(text);

          let id = metadata.id;
          if (!id) {
            id = sanitizeId(file.name.replace(".md", ""));
          }

          graph.entities[id!] = {
            id: id!,
            type: metadata.type || "npc",
            title: metadata.title || id!,
            tags: metadata.tags || [],
            connections: [...(metadata.connections || []), ...wikiLinks],
            content: content,
            lore: metadata.lore,
            image: metadata.image,
            metadata: metadata.metadata,
          };
        } catch (err: any) {
          // If it's a network error (Failed to fetch), retry with backoff
          if (attempt < 3 && (err.message?.includes("Failed to fetch") || err.name === "TypeError")) {
            const delay = 500 * Math.pow(2, attempt - 1);
            console.warn(`[PublicGDriveAdapter] Retrying ${file.name} in ${delay}ms... (Attempt ${attempt + 1})`);
            await new Promise(r => setTimeout(r, delay));
            return fetchEntity(file, attempt + 1);
          }

          const msg = `Failed to fetch/parse shared file ${file.name}: ${err}`;
          console.error(msg);
          errors.push(msg);
        }
      };

      // Run parallel batches and await completion
      for (let i = 0; i < mdFiles.length; i += CONCURRENCY) {
        const chunk = mdFiles.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(fetchEntity));

        // Add a breather between batches to respect GDrive API throttling
        if (i + CONCURRENCY < mdFiles.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (Object.keys(graph.entities).length === 0 && errors.length > 0) {
        throw new Error(`Failed to load any entities. Errors: ${errors.join("; ")}`);
      } else if (errors.length > 0) {
        console.warn(`Campaign loaded with partial errors: ${errors.join("; ")}`);
      }

      return graph;
    } catch (err: any) {
      console.error("[PublicGDriveAdapter] GAPI folder fetch failed, trying legacy fallback", err);
      // If it's a specific "No entities found" error, just rethrow
      if (err.message?.includes("No markdown files found")) throw err;
      return this.fetchPublicFolderLegacy(folderId, apiKey);
    }
  }

  async fetchEntityContent(fileId: string, apiKey: string) {
    const blob = await this.fetchPublicFile(fileId, apiKey);
    const text = await blob.text();
    return parseMarkdown(text);
  }

  /**
   * Fallback for environments where GAPI cannot load.
   * NOTE: This will likely fail CORS for media content but might work for metadata.
   */
  private async fetchPublicFolderLegacy(folderId: string, apiKey: string): Promise<SerializedGraph> {
    const encodedFolderId = encodeURIComponent(folderId);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${encodedFolderId}' in parents and trashed = false&fields=files(id, name, thumbnailLink, webContentLink, mimeType)&key=${apiKey}`;

    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
      throw new Error(`Failed to list files (Legacy): ${listResponse.status}`);
    }

    const data = await listResponse.json();
    const allFiles = data.files || [];
    const assets: Record<string, string> = {};
    const mdFiles: any[] = [];

    const processFiles = (filesList: any[], prefix = "") => {
      filesList.forEach((f: any) => {
        if (f.name.endsWith(".md")) {
          mdFiles.push(f);
        } else if (f.mimeType !== 'application/vnd.google-apps.folder') {
          const assetValue = `${f.id}${f.thumbnailLink ? '|' + f.thumbnailLink : ''}`;
          assets[f.name] = assetValue;
          assets[`${prefix}${f.name}`] = assetValue;
          assets[`./${prefix}${f.name}`] = assetValue;
        }
      });
    };

    processFiles(allFiles);

    const graph: SerializedGraph = {
      version: 1,
      entities: {},
      assets,
      totalFiles: mdFiles.length
    };

    const CONCURRENCY = 6;
    const fetchEntity = async (file: any) => {
      const blob = await this.fetchPublicFile(file.id, apiKey);
      const text = await blob.text();
      const { metadata, content, wikiLinks } = parseMarkdown(text);
      const id = metadata.id || sanitizeId(file.name.replace(".md", ""));
      graph.entities[id] = {
        id,
        type: metadata.type || "npc",
        title: metadata.title || id,
        tags: metadata.tags || [],
        connections: [...(metadata.connections || []), ...wikiLinks],
        content: content,
        lore: metadata.lore,
        image: metadata.image,
        metadata: metadata.metadata,
      };
    };

    for (let i = 0; i < mdFiles.length; i += CONCURRENCY) {
      await Promise.all(mdFiles.slice(i, i + CONCURRENCY).map(fetchEntity));
    }

    return graph;
  }
}
