import { describe, expect, it } from "vitest";
import worker from "./index";

const HEIST = "how-do-you-run-a-heist-in-a-tabletop-rpg";

function stubDb() {
  return {
    prepare: (_query: string) => ({
      bind: (..._args: unknown[]) => ({
        all: async <T>(): Promise<{ results: T[] }> => ({
          results: [{ slug: HEIST, yes: 24, no: 1 }] as T[],
        }),
        run: async (): Promise<unknown> => ({}),
      }),
    }),
  };
}

function voteRequest(body: unknown, origin = "https://codexcryptica.com") {
  return new Request("https://oracle.example/api/answer-aggregates/vote", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = {
  waitUntil: (_promise: Promise<unknown>) => {},
} as unknown as ExecutionContext;

describe("answer aggregate routing", () => {
  it("records a vote from an allowed origin", async () => {
    const response = await worker.fetch(
      voteRequest({ slug: HEIST, value: "yes" }),
      { GEMINI_API_KEY: "test-key", ANSWER_AGGREGATES: stubDb() },
      ctx,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, moved: false });
  });

  it("rejects votes from disallowed origins", async () => {
    const response = await worker.fetch(
      voteRequest({ slug: HEIST, value: "yes" }, "https://evil.example"),
      { GEMINI_API_KEY: "test-key", ANSWER_AGGREGATES: stubDb() },
      ctx,
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for slugs outside the registry", async () => {
    const response = await worker.fetch(
      voteRequest({ slug: "no-such-answer", value: "yes" }),
      { GEMINI_API_KEY: "test-key", ANSWER_AGGREGATES: stubDb() },
      ctx,
    );
    expect(response.status).toBe(404);
  });

  it("rejects wrong methods on aggregate routes", async () => {
    const env = { GEMINI_API_KEY: "test-key", ANSWER_AGGREGATES: stubDb() };
    const getVote = await worker.fetch(
      new Request("https://oracle.example/api/answer-aggregates/vote", {
        headers: { Origin: "https://codexcryptica.com" },
      }),
      env,
      ctx,
    );
    expect(getVote.status).toBe(405);
    const postTop = await worker.fetch(
      new Request("https://oracle.example/api/answer-aggregates/top", {
        method: "POST",
        headers: { Origin: "https://codexcryptica.com" },
      }),
      env,
      ctx,
    );
    expect(postTop.status).toBe(405);
  });

  it("serves the public top list with a cacheable response", async () => {
    const response = await worker.fetch(
      new Request("https://oracle.example/api/answer-aggregates/top?limit=6"),
      { GEMINI_API_KEY: "test-key", ANSWER_AGGREGATES: stubDb() },
      ctx,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    expect(await response.json()).toEqual({
      items: [{ slug: HEIST, yes: 24 }],
    });
  });

  it("rate-limits vote bursts per IP", async () => {
    const response = await worker.fetch(
      voteRequest({ slug: HEIST, value: "yes" }),
      {
        GEMINI_API_KEY: "test-key",
        ANSWER_AGGREGATES: stubDb(),
        ANSWER_FEEDBACK_RATE_LIMITER: {
          limit: async () => ({ success: false }),
        },
      },
      ctx,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
