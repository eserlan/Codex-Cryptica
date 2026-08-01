import type {
  PublicTemplatePackage,
  TemplateDirectoryPage,
  TemplateDirectoryQuery,
  TemplateDirectoryResult,
} from "schema";
import {
  CommunityTemplateListingSchema,
  PublicTemplatePackageSchema,
  TemplateDirectoryPageSchema,
  TemplateDirectoryResultSchema,
} from "schema";
import { z } from "zod";
import {
  getTemplateOwnerToken,
  saveTemplateOwnerToken,
} from "$lib/stores/publishing/template-publish-registry";

export interface TemplateDirectoryServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
  saveOwnerToken?: (listingId: string, token: string) => Promise<void>;
  getOwnerToken?: (listingId: string) => Promise<string | undefined>;
}

const PublishResponseSchema = z.object({
  listing: CommunityTemplateListingSchema,
  ownerToken: z.string().min(1),
});

export class PublicTemplateDirectoryService {
  constructor(private readonly deps: TemplateDirectoryServiceDeps = {}) {}

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

  async publishTemplate(input: {
    package: PublicTemplatePackage;
    ownerDisplayName?: string;
    signal?: AbortSignal;
  }) {
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: input.package,
          metadata: {
            ownerDisplayName: input.ownerDisplayName,
            rightsAcknowledged: true,
          },
        }),
        signal: input.signal,
      },
    );
    if (!response.ok) throw new Error("Could not publish the template.");
    const result = PublishResponseSchema.parse(await response.json());
    await this.deps.saveOwnerToken?.(
      result.listing.listingId,
      result.ownerToken,
    );
    return result;
  }

  async updateTemplate(
    listingId: string,
    input: { package: PublicTemplatePackage; ownerDisplayName?: string },
    token?: string,
  ) {
    const ownerToken = token ?? (await this.deps.getOwnerToken?.(listingId));
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings/${listingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {}),
        },
        body: JSON.stringify({
          package: input.package,
          metadata: { ownerDisplayName: input.ownerDisplayName },
        }),
      },
    );
    if (!response.ok) throw new Error("Could not update the template listing.");
    return CommunityTemplateListingSchema.parse(await response.json());
  }

  async unpublishTemplate(listingId: string, token?: string): Promise<void> {
    const ownerToken = token ?? (await this.deps.getOwnerToken?.(listingId));
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings/${listingId}`,
      {
        method: "DELETE",
        headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
      },
    );
    if (!response.ok && response.status !== 404)
      throw new Error("Could not unpublish the template.");
  }

  async listTemplates(
    query: Partial<TemplateDirectoryQuery> = {},
  ): Promise<TemplateDirectoryPage> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.system) params.set("system", query.system);
    if (query.category) params.set("category", query.category);
    if (query.labels?.length) params.set("labels", query.labels.join(","));
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.limit) params.set("limit", String(query.limit));
    const suffix = params.toString() ? `?${params}` : "";
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings${suffix}`,
    );
    if (!response.ok) throw new Error("Could not load community templates.");
    return TemplateDirectoryPageSchema.parse(await response.json());
  }

  async getTemplateListing(
    listingId: string,
  ): Promise<TemplateDirectoryResult | null> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings/${listingId}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Could not load the template listing.");
    return TemplateDirectoryResultSchema.parse(await response.json());
  }

  async downloadTemplatePackage(
    listingId: string,
  ): Promise<PublicTemplatePackage> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings/${listingId}/package`,
    );
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "This template is no longer available."
          : "Could not download the template.",
      );
    return PublicTemplatePackageSchema.parse(await response.json());
  }

  async reportTemplate(
    listingId: string,
    input: { reason: string; details?: string; reporterContact?: string },
  ): Promise<void> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/template-directory/listings/${listingId}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error("Could not send the report.");
  }
}

export const publicTemplateDirectoryService =
  new PublicTemplateDirectoryService({
    saveOwnerToken: saveTemplateOwnerToken,
    getOwnerToken: getTemplateOwnerToken,
  });
