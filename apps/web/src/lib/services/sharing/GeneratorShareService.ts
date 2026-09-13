import type { GeneratorShare, GeneratorShareCreate } from "schema";
import { resolveOracleProxyUrl } from "$lib/config/oracle-proxy";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
import { buildAbsoluteUrl } from "$lib/seo/site";

const MANAGEMENT_TOKENS_KEY = "codex_generator_share_management_tokens";

export type GeneratorShareCreateInput = GeneratorShareCreate;

export interface CreatedGeneratorShare {
  share: GeneratorShare;
  managementToken: string;
  url: string;
}

export interface GeneratorShareServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
  storage?: StorageLike;
}

type StoredTokens = Record<string, string>;

function readTokens(storage: StorageLike): StoredTokens {
  try {
    const value = storage.getItem(MANAGEMENT_TOKENS_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTokens(storage: StorageLike, tokens: StoredTokens): boolean {
  try {
    const serialised = JSON.stringify(tokens);
    storage.setItem(MANAGEMENT_TOKENS_KEY, serialised);
    return storage.getItem(MANAGEMENT_TOKENS_KEY) === serialised;
  } catch {
    return false;
  }
}

export class GeneratorShareService {
  private readonly fetcher: typeof fetch;
  private readonly storage: StorageLike;
  private readonly baseUrl: string;

  constructor(deps: GeneratorShareServiceDeps = {}) {
    this.fetcher = deps.fetch ?? fetch;
    this.storage = deps.storage ?? browserStorage;
    this.baseUrl = deps.baseUrl ?? resolveOracleProxyUrl();
  }

  async create(
    input: GeneratorShareCreateInput,
  ): Promise<CreatedGeneratorShare> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/generator-shares`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(
        detail?.error?.message || "Could not create a share link.",
      );
    }

    const result = (await response.json()) as {
      share: GeneratorShare;
      managementToken: string;
    };
    const tokens = readTokens(this.storage);
    tokens[result.share.shareId] = result.managementToken;
    if (!writeTokens(this.storage, tokens)) {
      try {
        await this.deleteWithToken(
          result.share.shareId,
          result.managementToken,
        );
      } catch (cleanupError) {
        console.warn(
          "[GeneratorShareService] Failed to clean up an unmanaged share",
          cleanupError,
        );
      }
      throw new Error(
        "Could not store the share management token; the share was not created.",
      );
    }

    return {
      ...result,
      url: buildAbsoluteUrl(`/share/${result.share.shareId}`),
    };
  }

  async get(shareId: string): Promise<GeneratorShare | null> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/generator-shares/${encodeURIComponent(shareId)}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Could not load this shared result.");
    return (await response.json()) as GeneratorShare;
  }

  async revoke(shareId: string): Promise<void> {
    const token = readTokens(this.storage)[shareId];
    if (!token) throw new Error("This share cannot be revoked on this device.");
    await this.deleteWithToken(shareId, token);
    const tokens = readTokens(this.storage);
    delete tokens[shareId];
    writeTokens(this.storage, tokens);
  }

  private async deleteWithToken(shareId: string, token: string): Promise<void> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/generator-shares/${encodeURIComponent(shareId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error("Could not revoke this share link.");
  }

  hasManagementToken(shareId: string): boolean {
    return Boolean(readTokens(this.storage)[shareId]);
  }
}

export const generatorShareService = new GeneratorShareService();
