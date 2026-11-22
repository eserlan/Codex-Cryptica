import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  handleFeatureFlagsRequest,
} from "./feature-flags";
import worker from "./index";
import type { Env } from "./env";

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GEMINI_API_KEY: "test-key",
    ...overrides,
  };
}

describe("feature flags worker endpoint (/api/flags)", () => {
  it("reads flags:prod from Workers KV by default and merges known boolean keys", async () => {
    const get = vi.fn(async (key: string) =>
      key === "flags:prod"
        ? JSON.stringify({
            adventureArtwork: true,
            unknownFlag: true,
          })
        : null,
    );

    const request = new Request("https://oracle-proxy.test/api/flags", {
      method: "GET",
      headers: { Origin: "https://codexcryptica.com" },
    });

    const response = await handleFeatureFlagsRequest(
      request,
      makeEnv({ FEATURE_FLAGS: { get } }),
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith("flags:prod");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.headers.get("Vary")).toBe("Origin");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://codexcryptica.com",
    );

    const body = await response.json();
    expect(body).toEqual({
      env: "prod",
      flags: { adventureArtwork: true },
      source: "kv",
    });
  });

  it("reads flags:staging when ?env=staging is requested", async () => {
    const get = vi.fn(async (key: string) =>
      key === "flags:staging"
        ? JSON.stringify({ adventureArtwork: true })
        : null,
    );

    const request = new Request(
      "https://oracle-proxy.test/api/flags?env=staging",
      {
        method: "GET",
        headers: { Origin: "https://staging.codexcryptica.com" },
      },
    );

    const response = await worker.fetch(
      request,
      makeEnv({ FEATURE_FLAGS: { get } }),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith("flags:staging");
    expect(await response.json()).toEqual({
      env: "staging",
      flags: { adventureArtwork: true },
      source: "kv",
    });
  });

  it("returns safe defaults when FEATURE_FLAGS KV binding is absent", async () => {
    const request = new Request("https://oracle-proxy.test/api/flags", {
      method: "GET",
    });

    const response = await handleFeatureFlagsRequest(request, makeEnv());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      env: "prod",
      flags: DEFAULT_FEATURE_FLAGS,
      source: "defaults",
    });
  });

  it("falls back to safe defaults when KV throws or contains malformed JSON", async () => {
    const throwingGet = vi.fn(async () => {
      throw new Error("KV unavailable");
    });

    const errResp = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags"),
      makeEnv({ FEATURE_FLAGS: { get: throwingGet } }),
    );
    expect(errResp.status).toBe(200);
    expect(await errResp.json()).toEqual({
      env: "prod",
      flags: DEFAULT_FEATURE_FLAGS,
      source: "defaults",
    });

    const badJsonResp = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags"),
      makeEnv({ FEATURE_FLAGS: { get: async () => "{not-json" } }),
    );
    expect(badJsonResp.status).toBe(200);
    expect(await badJsonResp.json()).toEqual({
      env: "prod",
      flags: DEFAULT_FEATURE_FLAGS,
      source: "defaults",
    });
  });

  it("ignores non-boolean values in KV payload", async () => {
    const response = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags"),
      makeEnv({
        FEATURE_FLAGS: {
          get: async () => JSON.stringify({ adventureArtwork: "true" }),
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      env: "prod",
      flags: { adventureArtwork: false },
      source: "kv",
    });
  });

  it("rejects unsupported env query values with 400 and non-GET methods with 405", async () => {
    const badEnv = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags?env=preview"),
      makeEnv(),
    );
    expect(badEnv.status).toBe(400);

    const emptyEnv = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags?env="),
      makeEnv(),
    );
    expect(emptyEnv.status).toBe(400);

    const badMethod = await handleFeatureFlagsRequest(
      new Request("https://oracle-proxy.test/api/flags", { method: "POST" }),
      makeEnv(),
    );
    expect(badMethod.status).toBe(405);
  });
});
