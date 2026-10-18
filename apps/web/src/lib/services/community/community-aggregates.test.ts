import { describe, expect, it, vi } from "vitest";
import {
  COMMUNITY_MAX_ITEMS,
  COMMUNITY_MIN_YES,
  COMMUNITY_QUORUM,
  CommunityAggregatesService,
} from "./community-aggregates";

function serviceWithFetch(
  handler: (url: string, init?: RequestInit) => unknown,
) {
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) =>
    handler(url, init),
  );
  return {
    fetchFn,
    service: new CommunityAggregatesService({
      fetch: fetchFn as unknown as typeof fetch,
      baseUrl: "https://oracle.example",
    }),
  };
}

function okJson(payload: unknown) {
  return { ok: true, json: async () => payload } as unknown as Response;
}

describe("CommunityAggregatesService", () => {
  it("posts votes with previous for move-not-add semantics", async () => {
    const { fetchFn, service } = serviceWithFetch(() => okJson({ ok: true }));
    const result = await service.recordVote({
      slug: "how-do-you-run-a-heist-in-a-tabletop-rpg",
      value: "yes",
      previous: "no",
    });
    expect(result).toBe(true);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oracle.example/api/answer-aggregates/vote");
    expect(JSON.parse(init.body as string)).toEqual({
      slug: "how-do-you-run-a-heist-in-a-tabletop-rpg",
      value: "yes",
      previous: "no",
    });
  });

  it("omits previous for fresh votes", async () => {
    const { fetchFn, service } = serviceWithFetch(() => okJson({ ok: true }));
    await service.recordVote({ slug: "a", value: "no" });
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ slug: "a", value: "no" });
  });

  it("sends rapid vote changes in invocation order for each answer", async () => {
    let releaseFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    const posted: Array<Record<string, unknown>> = [];
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      posted.push(JSON.parse(init?.body as string) as Record<string, unknown>);
      if (posted.length === 1) return firstResponse;
      return okJson({ ok: true });
    });
    const service = new CommunityAggregatesService({
      fetch: fetchFn as unknown as typeof fetch,
      baseUrl: "https://oracle.example",
    });

    const yesWrite = service.recordVote({ slug: "a", value: "yes" });
    const noWrite = service.recordVote({
      slug: "a",
      value: "no",
      previous: "yes",
    });
    await Promise.resolve();

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(posted).toEqual([{ slug: "a", value: "yes" }]);

    releaseFirst(okJson({ ok: true }) as Response);
    await expect(Promise.all([yesWrite, noWrite])).resolves.toEqual([
      true,
      true,
    ]);
    expect(posted).toEqual([
      { slug: "a", value: "yes" },
      { slug: "a", value: "no", previous: "yes" },
    ]);
  });

  it("never rejects: network failure, HTTP errors, and bad payloads resolve false", async () => {
    const failing = new CommunityAggregatesService({
      fetch: (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
      baseUrl: "https://oracle.example",
    });
    await expect(failing.recordVote({ slug: "a", value: "yes" })).resolves.toBe(
      false,
    );

    const denied = serviceWithFetch(
      () => ({ ok: false }) as unknown as Response,
    );
    await expect(
      denied.service.recordVote({ slug: "a", value: "yes" }),
    ).resolves.toBe(false);

    const malformed = serviceWithFetch(() => okJson({ items: "nope" }));
    await expect(malformed.service.fetchTop()).resolves.toBeNull();
    await expect(malformed.service.fetchBySlugs(["a"])).resolves.toEqual([]);
  });

  it("fetches and parses the top list", async () => {
    const { fetchFn, service } = serviceWithFetch(() =>
      okJson({
        items: [
          { slug: "a", yes: 30 },
          { slug: "b", yes: 12 },
        ],
      }),
    );
    const top = await service.fetchTop();
    expect(top).toEqual([
      { slug: "a", yes: 30 },
      { slug: "b", yes: 12 },
    ]);
    expect(fetchFn.mock.calls[0][0] as string).toContain("/top?limit=6");
  });

  it("drops malformed entries while keeping valid ones", async () => {
    const { service } = serviceWithFetch(() =>
      okJson({ items: [{ slug: "a", yes: 12 }, { slug: "b" }, null, 42] }),
    );
    expect(await service.fetchTop()).toEqual([{ slug: "a", yes: 12 }]);
  });

  it("fetchBySlugs returns [] without fetching for empty input", async () => {
    const { fetchFn, service } = serviceWithFetch(() => okJson({ items: [] }));
    await expect(service.fetchBySlugs([])).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("keeps display thresholds consistent with the server contract", () => {
    expect(COMMUNITY_QUORUM).toBe(4);
    expect(COMMUNITY_MAX_ITEMS).toBe(6);
    expect(COMMUNITY_MIN_YES).toBe(10);
  });
});
