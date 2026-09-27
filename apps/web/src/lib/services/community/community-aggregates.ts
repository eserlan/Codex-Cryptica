import { resolveOracleProxyUrl } from "$lib/config/oracle-proxy";

/**
 * Anonymous community usefulness aggregates (spec 164).
 *
 * Thin fetch client for the oracle-proxy `/api/answer-aggregates/*`
 * endpoints. Every method fails silently by design: community counts are an
 * enhancement over the local Zaraz + localStorage vote flow, so a blocked
 * endpoint, ad-blocker, or offline reader must never break voting or page
 * rendering. `recordVote` therefore never rejects.
 */

export type CommunityVoteValue = "yes" | "no";

export interface CommunityAggregateItem {
  slug: string;
  yes: number;
}

export interface RecordCommunityVoteInput {
  slug: string;
  value: CommunityVoteValue;
  previous?: CommunityVoteValue;
}

export interface CommunityAggregatesDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

/** Minimum qualifying items before a community section is shown (spec §). */
export const COMMUNITY_QUORUM = 4;
/** Maximum items ever shown in the community strip (spec §). */
export const COMMUNITY_MAX_ITEMS = 6;
/** Minimum yes-votes before a count is publicly shown (mirrors server). */
export const COMMUNITY_MIN_YES = 10;

function parseItems(payload: unknown): CommunityAggregateItem[] | null {
  if (!payload || typeof payload !== "object") return null;
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const parsed: CommunityAggregateItem[] = [];
  for (const item of items) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { slug?: unknown }).slug === "string" &&
      typeof (item as { yes?: unknown }).yes === "number"
    ) {
      parsed.push({
        slug: (item as { slug: string }).slug,
        yes: (item as { yes: number }).yes,
      });
    }
  }
  return parsed;
}

export class CommunityAggregatesService {
  private readonly fetchOverride?: typeof fetch;
  private readonly baseUrl: string;
  private readonly voteWrites = new Map<string, Promise<boolean>>();

  constructor(deps: CommunityAggregatesDeps = {}) {
    this.fetchOverride = deps.fetch;
    this.baseUrl = deps.baseUrl ?? resolveOracleProxyUrl();
  }

  /** Resolved per call (not at construction) so global fetch stubs apply. */
  private fetchImpl(): typeof fetch {
    if (this.fetchOverride) return this.fetchOverride;
    if (typeof fetch !== "undefined") return fetch;
    return ((_url: unknown, _init?: unknown) =>
      Promise.reject(
        new Error("fetch unavailable"),
      )) as unknown as typeof fetch;
  }

  /**
   * Fire-and-forget vote write. Always resolves (true on recorded, false
   * otherwise) and never rejects — callers must not await it for rendering.
   */
  recordVote(input: RecordCommunityVoteInput): Promise<boolean> {
    const previousWrite =
      this.voteWrites.get(input.slug) ?? Promise.resolve(false);
    const pendingWrite = previousWrite.then(() => this.sendVote(input));
    this.voteWrites.set(input.slug, pendingWrite);
    void pendingWrite.then(() => {
      if (this.voteWrites.get(input.slug) === pendingWrite) {
        this.voteWrites.delete(input.slug);
      }
    });
    return pendingWrite;
  }

  private async sendVote(input: RecordCommunityVoteInput): Promise<boolean> {
    try {
      const response = await this.fetchImpl()(
        `${this.baseUrl}/api/answer-aggregates/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: input.slug,
            value: input.value,
            ...(input.previous ? { previous: input.previous } : {}),
          }),
        },
      );
      if (!response.ok) return false;
      const payload = (await response.json()) as { ok?: unknown };
      return payload?.ok === true;
    } catch {
      return false;
    }
  }

  /** Top community items, or null when unavailable (caller hides section). */
  async fetchTop(
    limit = COMMUNITY_MAX_ITEMS,
  ): Promise<CommunityAggregateItem[] | null> {
    try {
      const response = await this.fetchImpl()(
        `${this.baseUrl}/api/answer-aggregates/top?limit=${encodeURIComponent(String(limit))}`,
      );
      if (!response.ok) return null;
      return parseItems(await response.json());
    } catch {
      return null;
    }
  }

  /** Batched per-article counts; unknown/below-threshold slugs omitted. */
  async fetchBySlugs(slugs: string[]): Promise<CommunityAggregateItem[]> {
    if (slugs.length === 0) return [];
    try {
      const response = await this.fetchImpl()(
        `${this.baseUrl}/api/answer-aggregates/by-slugs?slugs=${encodeURIComponent(slugs.join(","))}`,
      );
      if (!response.ok) return [];
      return parseItems(await response.json()) ?? [];
    } catch {
      return [];
    }
  }
}

export const communityAggregates = new CommunityAggregatesService();
