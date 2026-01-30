import type { Entity } from "schema";

export interface SerializedGraph {
  entities: Record<string, Entity>;
  version: number;
  assets?: Record<string, string>; // filename/path -> fileId or URL
  deferredAssets?: Promise<void>;
  totalFiles?: number;
}

export interface IStorageAdapter {
  /**
   * Initialize the storage system.
   */
  init(): Promise<void>;

  /**
   * Load the full campaign graph.
   */
  loadGraph(): Promise<SerializedGraph | null>;

  /**
   * Save the full campaign graph.
   * Throws error in Read-Only mode.
   */
  saveGraph(graph: SerializedGraph): Promise<void>;

  /**
   * Check if the adapter is read-only.
   */
  isReadOnly(): boolean;

  /**
   * Resolve a relative path (e.g. ./images/foo.png) to a usable URL.
   */
  resolvePath(path: string): Promise<string>;
}

export interface ICloudShareProvider {
  /**
   * Make the specific file/folder public (anyone with link).
   * Returns the webContentLink or appropriate fetchable URL.
   */
  shareFilePublicly(fileId: string): Promise<string>;

  /**
   * Revoke public access.
   */
  revokeShare(fileId: string): Promise<void>;

  /**
   * Fetch a public file's content without OAuth (using API Key).
   */
  fetchPublicFile(fileId: string, apiKey: string): Promise<Blob>;
}
