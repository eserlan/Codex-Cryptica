import type { ICloudShareProvider, SerializedGraph } from "../types";
import { parseMarkdown, sanitizeId } from "../../utils/markdown";

export class PublicGDriveAdapter implements ICloudShareProvider {
  async shareFilePublicly(_fileId: string): Promise<string> {
    throw new Error("PublicGDriveAdapter is strictly for fetching. Use authenticated adapter for sharing.");
  }

  async revokeShare(_fileId: string): Promise<void> {
     throw new Error("PublicGDriveAdapter is strictly for fetching. Use authenticated adapter for revoking.");
  }

  async fetchPublicFile(fileId: string, apiKey: string): Promise<Blob> {
    if (!apiKey) {
      throw new Error("API Key is required for public fetch.");
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&alt=media`;
    
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
             throw new Error("Access Denied: The link might be expired or the API key is invalid.");
        }
        if (response.status === 404) {
            throw new Error("File Not Found: The link might be invalid.");
        }
      throw new Error(`GDrive Fetch Error: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Fetches all .md files from a public folder and returns a SerializedGraph.
   */
  async fetchPublicFolder(folderId: string, apiKey: string): Promise<SerializedGraph> {
    if (!apiKey) {
        throw new Error("API Key is required for guest mode.");
    }

    // 1. List files in folder
    const encodedFolderId = encodeURIComponent(folderId);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${encodedFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'&fields=files(id, name)&key=${apiKey}`;
    
    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
        throw new Error("Failed to list files in shared folder.");
    }

    const data = await listResponse.json();
    const files = data.files || [];
    const mdFiles = files.filter((f: any) => f.name.endsWith(".md"));

    if (mdFiles.length === 0) {
        throw new Error("No markdown files found in the shared campaign folder.");
    }

    const graph: SerializedGraph = {
        version: 1,
        entities: {}
    };

    // 2. Fetch each file and parse
    // Process in parallel with a limit to avoid rate limiting
    const CONCURRENCY = 5;
    const errors: string[] = [];
    
    for (let i = 0; i < mdFiles.length; i += CONCURRENCY) {
        const chunk = mdFiles.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(async (file: any) => {
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
            } catch (err) {
                const msg = `Failed to fetch/parse shared file ${file.name}: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }));
    }

    if (Object.keys(graph.entities).length === 0 && errors.length > 0) {
        throw new Error(`Failed to load any entities. Errors: ${errors.join("; ")}`);
    } else if (errors.length > 0) {
        console.warn(`Campaign loaded with partial errors: ${errors.join("; ")}`);
    }

    return graph;
  }
}
