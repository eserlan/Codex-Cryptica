import type {
  DirectoryPage,
  DirectoryQuery,
  ListingDraft,
  PublicListing,
} from "schema";

export interface PublicDirectoryServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

export class PublicDirectoryService {
  constructor(private deps: PublicDirectoryServiceDeps = {}) {}

  private get fetcher() {
    return this.deps.fetch ?? fetch;
  }

  get baseUrl() {
    return (
      this.deps.baseUrl ??
      ((typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
        (typeof import.meta !== "undefined" &&
        import.meta.env?.DEV &&
        !import.meta.env?.VITEST
          ? "http://localhost:8787"
          : "https://oracle-proxy.espen-erlandsen.workers.dev"))
    );
  }

  async getPublicListing(publishId: string): Promise<PublicListing | null> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/published/${publishId}/listing`,
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("Failed to load public listing");
    }
    return (await response.json()) as PublicListing;
  }

  createListingDraft(input: {
    publishId: string;
    vaultTitle: string;
    existingListing?: PublicListing | null;
    defaultDescription?: string;
    defaultCoverImageAssetId?: string;
    defaultLabels?: string[];
  }): ListingDraft {
    if (input.existingListing) {
      const {
        publishId,
        title,
        description,
        labels,
        coverImageAssetId,
        coverImageAlt,
        ownerDisplayName,
      } = input.existingListing;
      return {
        publishId,
        title,
        description,
        labels: [...labels],
        coverImageAssetId,
        coverImageAlt,
        ownerDisplayName,
      };
    }

    return {
      publishId: input.publishId,
      title: input.vaultTitle.trim() || "Untitled World",
      description: input.defaultDescription ?? "",
      labels: input.defaultLabels ?? [],
      coverImageAssetId: input.defaultCoverImageAssetId || undefined,
      coverImageAlt: input.defaultCoverImageAssetId ? "Cover image" : undefined,
      ownerDisplayName: undefined,
    };
  }

  async enablePublicListing(
    publishId: string,
    draft: Omit<ListingDraft, "publishId">,
    writeToken: string,
  ): Promise<PublicListing> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/published/${publishId}/listing`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${writeToken}`,
        },
        body: JSON.stringify(draft),
      },
    );
    if (!response.ok) {
      throw new Error("Failed to save public listing");
    }
    return (await response.json()) as PublicListing;
  }

  async disablePublicListing(
    publishId: string,
    writeToken: string,
  ): Promise<void> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/published/${publishId}/listing`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${writeToken}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to delete public listing");
    }
  }

  async listPublicDirectory(
    query: Partial<DirectoryQuery> = {},
  ): Promise<DirectoryPage> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.labels?.length) params.set("labels", query.labels.join(","));
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.limit) params.set("limit", String(query.limit));

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await this.fetcher(
      `${this.baseUrl}/api/directory/listings${suffix}`,
    );
    if (!response.ok) {
      throw new Error("Failed to load public directory");
    }
    return (await response.json()) as DirectoryPage;
  }

  async uploadAsset(
    publishId: string,
    assetId: string,
    mimeType: string,
    filename: string,
    blob: Blob,
    writeToken: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/published/${publishId}/assets/${assetId}`;
    const response = await this.fetcher(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "Content-Type": mimeType,
        "X-Filename": filename,
      },
      body: blob,
    });
    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }
  }
}

export const publicDirectoryService = new PublicDirectoryService();
