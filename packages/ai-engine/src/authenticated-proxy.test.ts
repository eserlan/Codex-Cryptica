import { describe, expect, it, vi } from "vitest";
import { AuthenticatedProxy } from "./authenticated-proxy";

describe("authenticated proxy", () => {
  it("refreshes a rejected token once while preserving headers, body and signal", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValue(new Response("ok"));
    const session = {
      getToken: vi.fn().mockResolvedValueOnce("old").mockResolvedValue("fresh"),
      invalidate: vi.fn(),
    };
    const proxy = new AuthenticatedProxy(fetcher, session);
    const init = {
      body: "{}",
      headers: { "X-Custom": "value" },
      signal: new AbortController().signal,
    };
    const doFetch = proxy.fetch;
    expect(await (await doFetch("https://proxy.test", init)).text()).toBe("ok");
    expect(session.invalidate).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const replay = fetcher.mock.calls[1][1]!;
    expect(replay.body).toBe(init.body);
    expect(replay.signal).toBe(init.signal);
    expect(new Headers(replay.headers).get("Authorization")).toBe(
      "Bearer fresh",
    );
    expect(new Headers(replay.headers).get("X-Custom")).toBe("value");
    expect(init.headers).toEqual({ "X-Custom": "value" });
  });

  it.each([new Blob(["body"]), new URLSearchParams({ x: "y" })])(
    "does not replay non-string bodies",
    async (body) => {
      const response = new Response("", { status: 401 });
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      const session = {
        getToken: vi.fn().mockResolvedValue("token"),
        invalidate: vi.fn(),
      };
      expect(
        await new AuthenticatedProxy(fetcher, session).fetch(
          "https://proxy.test",
          { body },
        ),
      ).toBe(response);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(session.invalidate).not.toHaveBeenCalled();
    },
  );

  it("returns a second 401 and does not loop", async () => {
    const response = new Response("", { status: 401 });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const session = {
      getToken: vi.fn().mockResolvedValue("token"),
      invalidate: vi.fn(),
    };
    expect(
      await new AuthenticatedProxy(fetcher, session).fetch(
        "https://proxy.test",
      ),
    ).toBe(response);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns the original response if refreshing cannot obtain a token", async () => {
    const response = new Response("", { status: 401 });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    const session = {
      getToken: vi.fn().mockResolvedValue(null),
      invalidate: vi.fn(),
    };
    const init = { body: "{}" };
    expect(
      await new AuthenticatedProxy(fetcher, session).fetch(
        "https://proxy.test",
        init,
      ),
    ).toBe(response);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("https://proxy.test", init);
  });

  it("supports attaching and detaching a session source after construction", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    const proxy = new AuthenticatedProxy(fetcher);
    const session = {
      getToken: vi.fn().mockResolvedValue("token"),
      invalidate: vi.fn(),
    };
    await proxy.fetch("https://proxy.test");
    proxy.setSessionManager(session);
    await proxy.fetch("https://proxy.test");
    proxy.setSessionManager(null);
    await proxy.fetch("https://proxy.test");
    expect(session.getToken).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]).toBeUndefined();
    expect(
      new Headers(fetcher.mock.calls[1][1]?.headers).get("Authorization"),
    ).toBe("Bearer token");
    expect(fetcher.mock.calls[2][1]).toBeUndefined();
  });
});
