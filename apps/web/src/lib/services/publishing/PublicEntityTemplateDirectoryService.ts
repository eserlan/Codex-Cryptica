import {
  toPublicEntityPackage,
  type PublicEntityTemplatePackage,
  EntityTemplateDetailSchema,
  EntityTemplateDirectoryPageSchema,
  type EntityTemplateDetail,
  type EntityTemplateDirectoryPage,
  type EntityTemplateDirectoryQuery,
} from "schema";
import {
  EntityTemplateListingSchema,
  type EntityTemplateListing,
  type EntityTemplateReportInput,
} from "schema";
import { getTemplateDirectoryBaseUrl } from "./template-directory-http";

export type EntityTemplateDirectoryErrorCode =
  | "network"
  | "not_found"
  | "unauthorized"
  | "removed_by_operator"
  | "already_reported"
  | "rate_limited"
  | "reporting_unavailable"
  | "validation"
  | "unknown";

/** A failure with a plain-language message safe to show in the UI. */
export class EntityTemplateDirectoryError extends Error {
  constructor(
    message: string,
    readonly code: EntityTemplateDirectoryErrorCode = "unknown",
  ) {
    super(message);
    this.name = "EntityTemplateDirectoryError";
  }
}

export interface EntityTemplateDirectoryDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

type KnownError = { message: string; code: EntityTemplateDirectoryErrorCode };

const REMOVED_BY_OPERATOR: KnownError = {
  message:
    "This listing was removed by the operator and can't be restored. You can publish the template again as a new listing.",
  code: "removed_by_operator",
};

/** Errors recognised by the code the worker sends. */
const CODE_ERRORS: Record<string, KnownError> = {
  removed_by_operator: REMOVED_BY_OPERATOR,
  reporting_unavailable: {
    message: "Reporting isn't available right now.",
    code: "reporting_unavailable",
  },
};

/** Errors recognised by status alone. */
const STATUS_ERRORS: Record<number, KnownError> = {
  401: {
    message: "That owner token isn't right for this listing.",
    code: "unauthorized",
  },
  403: REMOVED_BY_OPERATOR,
  404: { message: "This template is no longer available.", code: "not_found" },
  409: { message: "You've already reported this.", code: "already_reported" },
  429: {
    message: "Too many requests. Please try again later.",
    code: "rate_limited",
  },
};

async function readErrorBody(
  response: Response,
): Promise<{ message?: string; code?: string }> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return { message: body.error?.message, code: body.error?.code };
  } catch {
    return {};
  }
}

const NETWORK_MESSAGE =
  "Couldn't reach the template directory. Check your connection and try again.";

export class PublicEntityTemplateDirectoryService {
  constructor(private readonly deps: EntityTemplateDirectoryDeps = {}) {}

  get baseUrl() {
    return getTemplateDirectoryBaseUrl(this.deps.baseUrl);
  }

  private async send(path: string, init?: RequestInit): Promise<Response> {
    const fetcher = this.deps.fetch ?? fetch;
    try {
      return await fetcher(
        `${this.baseUrl}/api/template-directory${path}`,
        init,
      );
    } catch {
      throw new EntityTemplateDirectoryError(NETWORK_MESSAGE, "network");
    }
  }

  /**
   * GETs a JSON body. A 404 gives `null` when `missing` is "null", otherwise it
   * is reported as "no longer available".
   */
  private async getJson(
    path: string,
    failMessage: string,
    missing: "null" | "error" = "error",
  ): Promise<unknown> {
    const response = await this.send(path);
    if (response.status === 404 && missing === "null") return null;
    if (response.status === 404) {
      const { message, code } = STATUS_ERRORS[404];
      throw new EntityTemplateDirectoryError(message, code);
    }
    if (!response.ok) throw new EntityTemplateDirectoryError(failMessage);
    return response.json();
  }

  async listEntityTemplates(
    query: Partial<Omit<EntityTemplateDirectoryQuery, "kind">> = {},
  ): Promise<EntityTemplateDirectoryPage> {
    const params = new URLSearchParams({ kind: "entity" });
    if (query.q) params.set("q", query.q);
    if (query.entityType) params.set("entityType", query.entityType);
    if (query.labels?.length) params.set("labels", query.labels.join(","));
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.limit) params.set("limit", String(query.limit));
    const body = await this.getJson(
      `/listings?${params}`,
      "Could not load community templates.",
    );
    return EntityTemplateDirectoryPageSchema.parse(body);
  }

  async getEntityTemplateListing(
    listingId: string,
  ): Promise<EntityTemplateDetail | null> {
    const body = await this.getJson(
      `/listings/${encodeURIComponent(listingId)}`,
      "Could not load the template listing.",
      "null",
    );
    return body === null ? null : EntityTemplateDetailSchema.parse(body);
  }

  private ownerHeaders(token: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  /** Maps a failed owner or report response to a plain-language error. */
  private async failure(
    response: Response,
    fallback: string,
  ): Promise<EntityTemplateDirectoryError> {
    const body = await readErrorBody(response);
    const known =
      (body.code && CODE_ERRORS[body.code]) || STATUS_ERRORS[response.status];
    if (known)
      return new EntityTemplateDirectoryError(known.message, known.code);
    if (response.status === 400) {
      return new EntityTemplateDirectoryError(
        body.message ?? fallback,
        "validation",
      );
    }
    return new EntityTemplateDirectoryError(fallback);
  }

  async publishEntityTemplate(input: {
    package: PublicEntityTemplatePackage;
    description: string;
    labels: string[];
    ownerDisplayName?: string;
    signal?: AbortSignal;
  }): Promise<{ listing: EntityTemplateListing; ownerToken: string }> {
    const response = await this.send("/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: input.package,
        metadata: {
          description: input.description,
          labels: input.labels,
          ownerDisplayName: input.ownerDisplayName,
          rightsAcknowledged: true,
        },
      }),
      signal: input.signal,
    });
    if (!response.ok) {
      throw await this.failure(response, "Could not publish the template.");
    }
    const body = (await response.json()) as {
      listing: unknown;
      ownerToken: unknown;
    };
    if (typeof body.ownerToken !== "string" || !body.ownerToken) {
      throw new EntityTemplateDirectoryError("Could not publish the template.");
    }
    return {
      listing: EntityTemplateListingSchema.parse(body.listing),
      ownerToken: body.ownerToken,
    };
  }

  async updateEntityTemplate(
    listingId: string,
    input: {
      package: PublicEntityTemplatePackage;
      description: string;
      labels: string[];
      ownerDisplayName?: string;
    },
    token: string,
  ): Promise<EntityTemplateListing> {
    const response = await this.send(
      `/listings/${encodeURIComponent(listingId)}`,
      {
        method: "PUT",
        headers: this.ownerHeaders(token),
        body: JSON.stringify({
          package: input.package,
          metadata: {
            description: input.description,
            labels: input.labels,
            ownerDisplayName: input.ownerDisplayName,
          },
        }),
      },
    );
    if (!response.ok) {
      throw await this.failure(
        response,
        "Could not update the template listing.",
      );
    }
    return EntityTemplateListingSchema.parse(await response.json());
  }

  async unpublishEntityTemplate(
    listingId: string,
    token: string,
  ): Promise<void> {
    const response = await this.send(
      `/listings/${encodeURIComponent(listingId)}/unpublish`,
      { method: "POST", headers: this.ownerHeaders(token) },
    );
    if (!response.ok) {
      throw await this.failure(response, "Could not unpublish the template.");
    }
  }

  async deleteEntityTemplate(listingId: string, token: string): Promise<void> {
    const response = await this.send(
      `/listings/${encodeURIComponent(listingId)}`,
      {
        method: "DELETE",
        headers: this.ownerHeaders(token),
      },
    );
    if (!response.ok) {
      throw await this.failure(
        response,
        "Could not delete the template listing.",
      );
    }
  }

  /** Checks an owner token and returns the listing and its package. */
  async verifyOwner(
    listingId: string,
    token: string,
  ): Promise<{
    listing: EntityTemplateListing;
    package: PublicEntityTemplatePackage;
  }> {
    const response = await this.send(
      `/listings/${encodeURIComponent(listingId)}/owner`,
      { headers: this.ownerHeaders(token) },
    );
    if (!response.ok) {
      throw await this.failure(response, "Could not check the owner token.");
    }
    const body = (await response.json()) as {
      listing: unknown;
      package: unknown;
    };
    const pkg = toPublicEntityPackage(body.package);
    if (!pkg.ok)
      throw new EntityTemplateDirectoryError(pkg.error, "validation");
    return {
      listing: EntityTemplateListingSchema.parse(body.listing),
      package: pkg.package,
    };
  }

  async reportEntityTemplate(
    listingId: string,
    input: EntityTemplateReportInput,
  ): Promise<void> {
    const response = await this.send(
      `/listings/${encodeURIComponent(listingId)}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      throw await this.failure(response, "Could not send the report.");
    }
  }

  /**
   * Tells the shared detail route which kind of listing an id is, without
   * assuming a schema. Entity listings come back parsed; stat sheet listings
   * are left for their own service to load.
   */
  async probeListing(
    listingId: string,
  ): Promise<
    | { kind: "entity"; detail: EntityTemplateDetail }
    | { kind: "stat-sheet" }
    | { kind: "missing" }
  > {
    const body = await this.getJson(
      `/listings/${encodeURIComponent(listingId)}`,
      "Could not load the template listing.",
      "null",
    );
    if (body === null) return { kind: "missing" };
    if ((body as { templateKind?: unknown }).templateKind === "entity") {
      return { kind: "entity", detail: EntityTemplateDetailSchema.parse(body) };
    }
    return { kind: "stat-sheet" };
  }

  async downloadEntityTemplatePackage(
    listingId: string,
  ): Promise<PublicEntityTemplatePackage> {
    const body = await this.getJson(
      `/listings/${encodeURIComponent(listingId)}/package`,
      "Could not download the template.",
    );
    const result = toPublicEntityPackage(body);
    if (!result.ok) {
      throw new EntityTemplateDirectoryError(result.error, "validation");
    }
    return result.package;
  }
}

export const publicEntityTemplateDirectoryService =
  new PublicEntityTemplateDirectoryService();
