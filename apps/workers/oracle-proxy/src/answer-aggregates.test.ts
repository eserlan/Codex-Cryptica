import { describe, expect, it } from "vitest";
import {
  compareAggregates,
  handleBySlugs,
  handleTop,
  handleVote,
  MIN_PUBLIC_YES,
  type D1DatabaseLike,
} from "./answer-aggregates";

const KNOWN = new Set([
  "how-do-you-run-a-heist",
  "what-is-a-point-crawl",
  "how-to-manage-table-engagement",
]);

function stubDb(initial: Record<string, { yes: number; no: number }> = {}) {
  const rows = new Map(
    Object.entries(initial).map(([slug, v]) => [
      slug,
      { slug, yes: v.yes, no: v.no, views: 0, updated_at: "t" },
    ]),
  );
  const db: D1DatabaseLike = {
    prepare(query: string) {
      return {
        bind: (...args: unknown[]) => ({
          all: async <T>(): Promise<{ results: T[] }> => {
            if (query.includes("WHERE slug IN")) {
              const minYes = args[args.length - 1] as number;
              const slugs = args.slice(0, -1) as string[];
              return {
                results: [...rows.values()].filter(
                  (r) => slugs.includes(r.slug) && r.yes >= minYes,
                ) as T[],
              };
            }
            const minYes = args[0] as number;
            return {
              results: [...rows.values()].filter((r) => r.yes >= minYes) as T[],
            };
          },
          run: async (): Promise<unknown> => {
            const [slug, incYes, incNo, updatedAt, decYes, decNo] = args as [
              string,
              number,
              number,
              string,
              number,
              number,
            ];
            const row = rows.get(slug) ?? {
              slug,
              yes: 0,
              no: 0,
              views: 0,
              updated_at: updatedAt,
            };
            row.yes = Math.max(row.yes + incYes - decYes, 0);
            row.no = Math.max(row.no + incNo - decNo, 0);
            row.updated_at = updatedAt;
            rows.set(slug, row);
            return {};
          },
        }),
      };
    },
  };
  return { db, rows };
}

function post(body: unknown) {
  return new Request("https://oracle.example/api/answer-aggregates/vote", {
    method: "POST",
    headers: {
      Origin: "https://codexcryptica.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function get(path: string) {
  return new Request(`https://oracle.example${path}`, { method: "GET" });
}

const deps = {
  isKnownSlug: (slug: string) => KNOWN.has(slug),
  now: () => "2026-09-27T00:00:00.000Z",
};

describe("answer aggregate vote handler", () => {
  it("records a fresh yes vote", async () => {
    const { db, rows } = stubDb();
    const res = await handleVote(
      post({ slug: "how-do-you-run-a-heist", value: "yes" }),
      { ANSWER_AGGREGATES: db },
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, moved: false });
    expect(rows.get("how-do-you-run-a-heist")).toMatchObject({ yes: 1, no: 0 });
  });

  it("moves a changed vote instead of double-counting", async () => {
    const { db, rows } = stubDb({
      "how-do-you-run-a-heist": { yes: 2, no: 1 },
    });
    const res = await handleVote(
      post({
        slug: "how-do-you-run-a-heist",
        value: "yes",
        previous: "no",
      }),
      { ANSWER_AGGREGATES: db },
      deps,
    );
    expect(await res.json()).toEqual({ ok: true, moved: true });
    expect(rows.get("how-do-you-run-a-heist")).toMatchObject({ yes: 3, no: 0 });
  });

  it("treats a repeated same-value vote as a no-op", async () => {
    const { db, rows } = stubDb({
      "how-do-you-run-a-heist": { yes: 2, no: 0 },
    });
    const res = await handleVote(
      post({
        slug: "how-do-you-run-a-heist",
        value: "yes",
        previous: "yes",
      }),
      { ANSWER_AGGREGATES: db },
      deps,
    );
    expect(await res.json()).toEqual({ ok: true, moved: false });
    expect(rows.get("how-do-you-run-a-heist")).toMatchObject({ yes: 2, no: 0 });
  });

  it("floors decrements at zero", async () => {
    const { db, rows } = stubDb();
    await handleVote(
      post({
        slug: "how-do-you-run-a-heist",
        value: "yes",
        previous: "no",
      }),
      { ANSWER_AGGREGATES: db },
      deps,
    );
    expect(rows.get("how-do-you-run-a-heist")).toMatchObject({ yes: 1, no: 0 });
  });

  it("rejects unknown slugs without writing", async () => {
    const { db, rows } = stubDb();
    const res = await handleVote(
      post({ slug: "retired-or-mistyped-slug", value: "yes" }),
      { ANSWER_AGGREGATES: db },
      deps,
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown_slug" });
    expect(rows.size).toBe(0);
  });

  it("rejects malformed votes and bad values", async () => {
    const { db } = stubDb();
    for (const body of [
      null,
      [],
      { slug: "how-do-you-run-a-heist", value: "maybe" },
      { slug: "NOT A SLUG!!", value: "yes" },
      { value: "yes" },
      { slug: "how-do-you-run-a-heist", value: "yes", previous: "maybe" },
    ]) {
      const res = await handleVote(post(body), { ANSWER_AGGREGATES: db }, deps);
      expect(res.status).toBe(400);
    }
  });

  it("fails closed with 500 when D1 is not bound", async () => {
    const res = await handleVote(
      post({ slug: "how-do-you-run-a-heist", value: "yes" }),
      {},
      deps,
    );
    expect(res.status).toBe(500);
  });
});

describe("answer aggregate read handlers", () => {
  const seeded = {
    "how-do-you-run-a-heist": { yes: 30, no: 5 },
    "what-is-a-point-crawl": { yes: 12, no: 0 },
    "how-to-manage-table-engagement": { yes: MIN_PUBLIC_YES - 1, no: 0 },
  };

  it("top returns only above-threshold slugs in helpfulness order", async () => {
    const { db } = stubDb(seeded);
    const res = await handleTop(get("/api/answer-aggregates/top"), {
      ANSWER_AGGREGATES: db,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
    expect(await res.json()).toEqual({
      items: [
        { slug: "how-do-you-run-a-heist", yes: 30 },
        { slug: "what-is-a-point-crawl", yes: 12 },
      ],
    });
  });

  it("top honours limit=1", async () => {
    const { db } = stubDb(seeded);
    const res = await handleTop(get("/api/answer-aggregates/top?limit=1"), {
      ANSWER_AGGREGATES: db,
    });
    expect(await res.json()).toEqual({
      items: [{ slug: "how-do-you-run-a-heist", yes: 30 }],
    });
  });

  it("by-slugs omits unknown and below-threshold slugs", async () => {
    const { db } = stubDb(seeded);
    const res = await handleBySlugs(
      get(
        "/api/answer-aggregates/by-slugs?slugs=what-is-a-point-crawl,how-to-manage-table-engagement,no-such-slug",
      ),
      { ANSWER_AGGREGATES: db },
    );
    expect(await res.json()).toEqual({
      items: [{ slug: "what-is-a-point-crawl", yes: 12 }],
    });
  });

  it("by-slugs with no usable slugs returns an empty list", async () => {
    const { db } = stubDb(seeded);
    const res = await handleBySlugs(
      get("/api/answer-aggregates/by-slugs?slugs=,,"),
      { ANSWER_AGGREGATES: db },
    );
    expect(await res.json()).toEqual({ items: [] });
  });

  it("never exposes no-counts, views, or identity fields", async () => {
    const { db } = stubDb(seeded);
    const res = await handleTop(get("/api/answer-aggregates/top"), {
      ANSWER_AGGREGATES: db,
    });
    const body = (await res.json()) as {
      items: Record<string, unknown>[];
    };
    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual(["slug", "yes"]);
    }
  });
});

describe("answer aggregate storage failures", () => {
  function failingDb(): D1DatabaseLike {
    return {
      prepare: (_query: string) => ({
        bind: (..._args: unknown[]) => ({
          all: async <T>(): Promise<{ results: T[] }> => {
            throw new Error("D1 unavailable");
          },
          run: async (): Promise<unknown> => {
            throw new Error("D1 unavailable");
          },
        }),
      }),
    };
  }

  it("vote answers JSON 500 instead of throwing", async () => {
    const res = await handleVote(
      post({ slug: "how-do-you-run-a-heist", value: "yes" }),
      { ANSWER_AGGREGATES: failingDb() },
      deps,
    );
    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("reads answer JSON 500 instead of throwing", async () => {
    const top = await handleTop(get("/api/answer-aggregates/top"), {
      ANSWER_AGGREGATES: failingDb(),
    });
    expect(top.status).toBe(500);
    const bySlugs = await handleBySlugs(
      get("/api/answer-aggregates/by-slugs?slugs=how-do-you-run-a-heist"),
      { ANSWER_AGGREGATES: failingDb() },
    );
    expect(bySlugs.status).toBe(500);
  });
});

describe("helpfulness ordering", () => {
  it("sorts by yes, then yes-ratio, then slug", () => {
    const rows = [
      { slug: "b-slug", yes: 10, no: 0 },
      { slug: "a-slug", yes: 10, no: 0 },
      { slug: "c-slug", yes: 10, no: 9 },
      { slug: "d-slug", yes: 30, no: 29 },
    ];
    expect([...rows].sort(compareAggregates).map((r) => r.slug)).toEqual([
      "d-slug",
      "a-slug",
      "b-slug",
      "c-slug",
    ]);
  });
});
