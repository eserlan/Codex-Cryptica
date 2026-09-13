import { getAnswer } from "$lib/content/answers/registry";
import { resolveOracleProxyUrl } from "$lib/config/oracle-proxy";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type {
  LikedAnswerItem,
  SharedGeneratorItem,
  MyStuffData,
} from "./types";

export const ANSWER_FEEDBACK_PREFIX = "codex_answer_feedback_";
export const LOCAL_SHARES_KEY = "codex_local_generator_shares";
export const MANAGEMENT_TOKENS_KEY = "codex_generator_share_management_tokens";

export const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "session-prep": "Session Prep",
  worldbuilding: "Worldbuilding",
  "campaign-notes": "Campaign Notes",
};

export interface MyStuffServiceDeps {
  storage?: StorageLike;
  getAnswerFn?: typeof getAnswer;
  fetch?: typeof fetch;
  baseUrl?: string;
}

function getAllStorageKeys(storage: StorageLike): string[] {
  const keys: string[] = [];
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  }
  if (typeof (storage as any).keys === "function") {
    return (storage as any).keys();
  }
  return [];
}

export class MyStuffService {
  private readonly storage: StorageLike;
  private readonly getAnswerFn: typeof getAnswer;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;

  constructor(deps: MyStuffServiceDeps = {}) {
    this.storage = deps.storage ?? browserStorage;
    this.getAnswerFn = deps.getAnswerFn ?? getAnswer;
    this.fetcher =
      deps.fetch ??
      (typeof fetch !== "undefined"
        ? fetch
        : ((() => Promise.reject(new Error("fetch unavailable"))) as any));
    this.baseUrl = deps.baseUrl ?? resolveOracleProxyUrl();
  }

  getLikedAnswers(): LikedAnswerItem[] {
    const keys = getAllStorageKeys(this.storage);
    const items: LikedAnswerItem[] = [];

    for (const key of keys) {
      if (!key.startsWith(ANSWER_FEEDBACK_PREFIX)) continue;
      const slug = key.slice(ANSWER_FEEDBACK_PREFIX.length);
      const raw = this.storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.value === "yes") {
          const answer = this.getAnswerFn(slug);
          if (answer) {
            items.push({
              slug,
              question: answer.question,
              summary: answer.seo.description,
              category: answer.category,
              categoryLabel:
                CATEGORY_LABELS[answer.category] ?? answer.category,
              href: answer.seo.canonical ?? `/answers/${slug}`,
            });
          }
        }
      } catch {
        // Skip unparseable values
      }
    }

    // Sort alphabetically by question for stable presentation
    return items.sort((a, b) => a.question.localeCompare(b.question));
  }

  removeLikedAnswer(slug: string): void {
    this.storage.removeItem(`${ANSWER_FEEDBACK_PREFIX}${slug}`);
  }

  getSharedGenerators(): SharedGeneratorItem[] {
    const items: SharedGeneratorItem[] = [];
    const seenShareIds = new Set<string>();

    // 1. Read explicitly stored generator share records
    const rawShares = this.storage.getItem(LOCAL_SHARES_KEY);
    if (rawShares) {
      try {
        const parsed = JSON.parse(rawShares);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.shareId === "string") {
              items.push({
                shareId: item.shareId,
                title: item.title || "Shared Generator Snapshot",
                generatorId: item.generatorId || "generator",
                generatorTitle: item.generatorTitle,
                createdAt: item.createdAt || new Date().toISOString(),
                url: item.url || buildAbsoluteUrl(`/share/${item.shareId}`),
                excerpt: item.excerpt,
                managementToken: item.managementToken,
              });
              seenShareIds.add(item.shareId);
            }
          }
        }
      } catch {
        // Ignore unparseable records
      }
    }

    // 2. Cross-reference management tokens (from #2916) that may not be in local shares
    const rawTokens = this.storage.getItem(MANAGEMENT_TOKENS_KEY);
    if (rawTokens) {
      try {
        const parsedTokens = JSON.parse(rawTokens);
        if (parsedTokens && typeof parsedTokens === "object") {
          for (const [shareId, token] of Object.entries(parsedTokens)) {
            if (!seenShareIds.has(shareId) && typeof token === "string") {
              items.push({
                shareId,
                title: "Shared Result",
                generatorId: "generator",
                createdAt: new Date().toISOString(),
                url: buildAbsoluteUrl(`/share/${shareId}`),
                managementToken: token,
              });
              seenShareIds.add(shareId);
            }
          }
        }
      } catch {
        // Ignore unparseable tokens
      }
    }

    // Sort newest first
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  recordSharedGenerator(item: SharedGeneratorItem): void {
    const shares = this.getSharedGenerators().filter(
      (s) => s.shareId !== item.shareId,
    );
    shares.unshift(item);
    try {
      this.storage.setItem(LOCAL_SHARES_KEY, JSON.stringify(shares));
    } catch {
      // Ignore quota error
    }
  }

  async revokeSharedGenerator(shareId: string): Promise<boolean> {
    // 1. Retrieve management token if available
    let token: string | undefined;
    const rawTokens = this.storage.getItem(MANAGEMENT_TOKENS_KEY);
    if (rawTokens) {
      try {
        const parsed = JSON.parse(rawTokens);
        if (parsed && typeof parsed[shareId] === "string") {
          token = parsed[shareId];
        }
      } catch {
        // Ignore
      }
    }

    if (!token) {
      const shares = this.getSharedGenerators();
      const existing = shares.find((s) => s.shareId === shareId);
      token = existing?.managementToken;
    }

    // 2. Call remote revoke if token is present
    if (token) {
      try {
        await this.fetcher(
          `${this.baseUrl}/api/generator-shares/${encodeURIComponent(shareId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } catch (error) {
        console.warn("[MyStuffService] Remote revoke request failed", error);
      }
    }

    // 3. Remove locally from shares and management tokens
    const shares = this.getSharedGenerators().filter(
      (s) => s.shareId !== shareId,
    );
    try {
      this.storage.setItem(LOCAL_SHARES_KEY, JSON.stringify(shares));
    } catch {
      // Ignore
    }

    if (rawTokens) {
      try {
        const parsed = JSON.parse(rawTokens);
        if (parsed && typeof parsed === "object") {
          delete parsed[shareId];
          this.storage.setItem(MANAGEMENT_TOKENS_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
    }

    return true;
  }

  getAllData(): MyStuffData {
    return {
      likedAnswers: this.getLikedAnswers(),
      sharedGenerators: this.getSharedGenerators(),
    };
  }
}

export const myStuffService = new MyStuffService();
