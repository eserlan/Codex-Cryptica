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

  private get baseUrl() {
    return (
      this.deps.baseUrl ?? "https://oracle-proxy.espen-erlandsen.workers.dev"
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
      description: "",
      labels: [],
      coverImageAssetId: undefined,
      coverImageAlt: undefined,
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
}

export const publicDirectoryService = new PublicDirectoryService();
