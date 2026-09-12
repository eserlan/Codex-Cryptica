import { describe, expect, it } from "bun:test";
import { isXPublishingEnabled, publishXPost } from "./release-comms-x.ts";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("release-comms-x", () => {
  it("sends the exact Bluesky text using X's official post endpoint", async () => {
    let request: RequestInit | undefined;
    const text =
      "New encounter generator!\n\nhttps://codexcryptica.com/generators";
    const publication = await publishXPost({
      text,
      env: { X_ACCESS_TOKEN: "x-user-token" },
      fetchFn: async (_url, init) => {
        request = init;
        return response({ data: { id: "123" } });
      },
    });

    expect(request?.headers).toEqual({
      Authorization: "Bearer x-user-token",
      "Content-Type": "application/json",
    });
    expect(request?.body).toBe(JSON.stringify({ text }));
    expect(publication).toEqual({
      id: "123",
      url: "https://x.com/i/web/status/123",
    });
  });

  it("does not make a network request during a dry run", async () => {
    let called = false;
    await publishXPost({
      text: "A post",
      dryRun: true,
      fetchFn: async () => {
        called = true;
        return response({});
      },
    });
    expect(called).toBe(false);
  });

  it("rejects missing credentials and failed X responses", async () => {
    await expect(publishXPost({ text: "A post", env: {} })).rejects.toThrow(
      "X_ACCESS_TOKEN",
    );
    await expect(
      publishXPost({
        text: "A post",
        env: { X_ACCESS_TOKEN: "token" },
        fetchFn: async () => response({}, 429),
      }),
    ).rejects.toThrow("status 429");
  });

  it("refreshes an expired access token and retries once", async () => {
    const calls: string[] = [];
    const env: NodeJS.ProcessEnv = {
      X_ACCESS_TOKEN: "stale-token",
      X_REFRESH_TOKEN: "refresh-me",
      X_CLIENT_ID: "client-id",
      X_CLIENT_SECRET: "client-secret",
    };
    const publication = await publishXPost({
      text: "A post",
      env,
      fetchFn: async (url, init) => {
        const target = String(url);
        if (target.includes("/oauth2/token")) {
          calls.push("refresh");
          expect(init?.headers).toMatchObject({
            Authorization: `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`,
          });
          return response({
            access_token: "fresh-token",
            refresh_token: "rotated-refresh",
          });
        }
        calls.push("post");
        if (
          init?.headers &&
          (init.headers as Record<string, string>).Authorization ===
            "Bearer stale-token"
        ) {
          return response({}, 401);
        }
        expect((init?.headers as Record<string, string>).Authorization).toBe(
          "Bearer fresh-token",
        );
        return response({ data: { id: "456" } });
      },
    });

    expect(calls).toEqual(["post", "refresh", "post"]);
    expect(publication.id).toBe("456");
    expect(env.X_ACCESS_TOKEN).toBe("fresh-token");
    expect(env.X_REFRESH_TOKEN).toBe("rotated-refresh");
  });

  it("does not attempt a refresh when refresh credentials are absent", async () => {
    await expect(
      publishXPost({
        text: "A post",
        env: { X_ACCESS_TOKEN: "stale-token" },
        fetchFn: async () => response({}, 401),
      }),
    ).rejects.toThrow("status 401");
  });

  it("requires a token and permits an explicit opt-out", () => {
    expect(isXPublishingEnabled({})).toBe(false);
    expect(isXPublishingEnabled({ X_ACCESS_TOKEN: "token" })).toBe(true);
    expect(
      isXPublishingEnabled({ X_ACCESS_TOKEN: "token", X_AUTO_PUBLISH: "0" }),
    ).toBe(false);
  });
});
