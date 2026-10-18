import { describe, expect, it, vi } from "vitest";
import { HelpClient } from "./help-client";

const context = {
  v: 1,
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  flags: ["connections-editable"],
  availableActions: ["status-tab", "connections-tab"],
} as const;

const answer = {
  outcome: "answered",
  answer: "Open the Status tab and use Add.",
  sources: [
    {
      id: "connections-tab#0",
      title: "Connections Tab",
      helpId: "connections-tab",
    },
  ],
  action: null,
  suggestions: [],
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

function client(
  fetcher: typeof fetch,
  over: Partial<ConstructorParameters<typeof HelpClient>[0]> = {},
) {
  return new HelpClient({
    fetcher,
    getToken: async () => "tok",
    proxyUrl: "https://proxy.test",
    isOnline: () => true,
    ...over,
  });
}

const ask = (c: HelpClient, extra: Record<string, unknown> = {}) =>
  c.ask({
    question: "How do I connect the faction?",
    history: [],
    context,
    ...extra,
  });

describe("HelpClient request", () => {
  it("sends only the question, capped history, and a validated screen description", async () => {
    const fetcher = vi.fn(async () => reply(200, answer));
    const history = Array.from({ length: 7 }, (_, i) => ({
      role: i % 2 ? ("assistant" as const) : ("user" as const),
      text: `turn ${i}`,
    }));
    await ask(client(fetcher as never), {
      history,
      context: {
        ...context,
        entityTitle: "Oakvale",
        routeTemplate: "/vault/3f2a",
      },
    });

    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://proxy.test/api/help/ask");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual([
      "context",
      "history",
      "question",
    ]);
    expect(body.history).toHaveLength(4);
    expect(body.context.routeTemplate).toBe("unknown");
    expect(JSON.stringify(body)).not.toMatch(/Oakvale|3f2a/);
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
  });

  it("sends no Authorization header when no session token is required", async () => {
    const fetcher = vi.fn(async () => reply(200, answer));
    await ask(client(fetcher as never, { getToken: async () => null }));
    const init = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
  });

  it("returns the answer when the response is valid", async () => {
    const result = await ask(client((async () => reply(200, answer)) as never));
    expect(result).toEqual({ ok: true, answer });
  });
});

describe("HelpClient failures", () => {
  it("does not send a request while offline", async () => {
    const fetcher = vi.fn();
    const result = await ask(
      client(fetcher as never, { isOnline: () => false }),
    );
    expect(result).toEqual({ ok: false, error: { kind: "offline" } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refreshes the session once after a 401, then succeeds", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        reply(401, { error: { code: "SESSION_TOKEN_EXPIRED" } }),
      )
      .mockResolvedValueOnce(reply(200, answer));
    const getToken = vi.fn(async (force?: boolean) =>
      force ? "fresh" : "stale",
    );
    const result = await ask(client(fetcher as never, { getToken }));
    expect(result.ok).toBe(true);
    expect(getToken).toHaveBeenLastCalledWith(true);
    expect(
      (fetcher.mock.calls[1][1] as RequestInit).headers as Headers,
    ).toSatisfy((h: Headers) => h.get("Authorization") === "Bearer fresh");
  });

  it("gives up after a second 401 instead of looping", async () => {
    const fetcher = vi.fn(async () =>
      reply(401, { error: { code: "SESSION_TOKEN_INVALID" } }),
    );
    const result = await ask(client(fetcher as never));
    expect(result).toEqual({
      ok: false,
      error: { kind: "unauthorised", code: "SESSION_TOKEN_INVALID" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("maps 429, 5xx, 504 and 400 to typed errors", async () => {
    const kindFor = async (status: number, code: string) =>
      await ask(
        client((async () => reply(status, { error: { code } })) as never),
      );
    expect(await kindFor(429, "RATE_LIMITED")).toEqual({
      ok: false,
      error: { kind: "rate-limited", code: "RATE_LIMITED" },
    });
    expect(await kindFor(502, "UPSTREAM_ERROR")).toEqual({
      ok: false,
      error: { kind: "server", code: "UPSTREAM_ERROR" },
    });
    expect(await kindFor(504, "UPSTREAM_ERROR")).toEqual({
      ok: false,
      error: { kind: "timeout", code: "UPSTREAM_ERROR" },
    });
    expect(await kindFor(400, "QUESTION_TOO_LONG")).toEqual({
      ok: false,
      error: { kind: "bad-request", code: "QUESTION_TOO_LONG" },
    });
  });

  it("rejects a response that is not the agreed shape", async () => {
    const bad = await ask(
      client((async () => reply(200, { outcome: "answered" })) as never),
    );
    expect(bad).toEqual({ ok: false, error: { kind: "invalid-response" } });
    const offList = await ask(
      client((async () =>
        reply(200, {
          ...answer,
          action: { type: "deleteEntity", label: "x" },
        })) as never),
    );
    expect(offList.ok).toBe(false);
  });

  it("times out a request that never finishes", async () => {
    const fetcher = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const result = await ask(client(fetcher as never, { timeoutMs: 20 }));
    expect(result).toEqual({ ok: false, error: { kind: "timeout" } });
  });

  it("reports a user cancel as aborted, not as a failure", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const pending = ask(client(fetcher as never), {
      signal: controller.signal,
    });
    controller.abort();
    expect(await pending).toEqual({ ok: false, error: { kind: "aborted" } });
  });

  it("treats a network failure as offline when the browser says so, otherwise as a server problem", async () => {
    const boom = (async () => {
      throw new TypeError("Failed to fetch");
    }) as never;
    expect(await ask(client(boom, { isOnline: () => true }))).toEqual({
      ok: false,
      error: { kind: "server" },
    });
    let online = true;
    const flaky = client(
      (async () => {
        online = false;
        throw new TypeError("Failed to fetch");
      }) as never,
      { isOnline: () => online },
    );
    expect(await ask(flaky)).toEqual({ ok: false, error: { kind: "offline" } });
  });
});
