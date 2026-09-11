import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  extractBearerToken,
  mintSessionToken,
  verifySessionToken,
  timingSafeEqualString,
  verifyAutomationKey,
} from "../session";
import { enforceLlmSession, handleSessionRequest } from "../session-guard";

const SECRET = "test-signing-secret";
const CORS = { "Access-Control-Allow-Origin": "https://codexcryptica.com" };

function makeRequest(
  init: {
    method?: string;
    token?: string;
    ip?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Request {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.ip) headers.set("CF-Connecting-IP", init.ip);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return new Request("https://proxy.example/api/session", {
    method: init.method ?? "POST",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** Counts calls and reports failure once a threshold is crossed. */
function makeLimiter(failAfter = Infinity) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    limit: async () => ({ success: ++calls <= failAfter }),
  };
}

describe("session token crypto", () => {
  it("mints a token that verifies against the same secret", async () => {
    const { token, expiresAt, scope } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
    );

    const result = await verifySessionToken(SECRET, token);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.ip).toBe("1.2.3.4");
      expect(result.payload.exp).toBe(expiresAt);
      expect(result.payload.jti).toBeTruthy();
      expect(result.payload.scope).toBe("human");
      expect(scope).toBe("human");
    }
  });

  it("mints an automation-scoped token", async () => {
    const { token, scope } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "automation",
    );

    const result = await verifySessionToken(SECRET, token);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.scope).toBe("automation");
      expect(scope).toBe("automation");
    }
  });

  it("gives every token a distinct id so rate limits do not collide", async () => {
    const a = await mintSessionToken(SECRET, "1.2.3.4");
    const b = await mintSessionToken(SECRET, "1.2.3.4");

    const [resultA, resultB] = await Promise.all([
      verifySessionToken(SECRET, a.token),
      verifySessionToken(SECRET, b.token),
    ]);

    expect(resultA.valid && resultB.valid).toBe(true);
    if (resultA.valid && resultB.valid) {
      expect(resultA.payload.jti).not.toBe(resultB.payload.jti);
    }
  });

  it("rejects a token signed with a different secret", async () => {
    const { token } = await mintSessionToken("other-secret", "1.2.3.4");

    const result = await verifySessionToken(SECRET, token);

    expect(result).toEqual({ valid: false, code: "SESSION_TOKEN_INVALID" });
  });

  it("rejects a tampered payload", async () => {
    const { token } = await mintSessionToken(SECRET, "1.2.3.4");
    const [payload, signature] = token.split(".");
    const forgedPayload = btoa(
      JSON.stringify({ exp: 9_999_999_999, jti: "forged", ip: "1.2.3.4" }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await verifySessionToken(
      SECRET,
      `${forgedPayload}.${signature}`,
    );

    expect(result).toEqual({ valid: false, code: "SESSION_TOKEN_INVALID" });
    expect(payload).not.toBe(forgedPayload);
  });

  it("distinguishes expired from invalid so the client knows to refresh", async () => {
    const issuedAt = 1_000_000;
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      issuedAt,
      60,
      "human",
    );

    const result = await verifySessionToken(SECRET, token, issuedAt + 61);

    expect(result).toEqual({ valid: false, code: "SESSION_TOKEN_EXPIRED" });
  });

  it("reports a missing token distinctly from an invalid one", async () => {
    expect(await verifySessionToken(SECRET, null)).toEqual({
      valid: false,
      code: "SESSION_TOKEN_MISSING",
    });
    expect(await verifySessionToken(SECRET, "not-a-token")).toEqual({
      valid: false,
      code: "SESSION_TOKEN_INVALID",
    });
  });

  it("rejects an oversized token without attempting verification", async () => {
    const result = await verifySessionToken(SECRET, "a".repeat(5_000));

    expect(result).toEqual({ valid: false, code: "SESSION_TOKEN_INVALID" });
  });

  it("extracts a bearer token case-insensitively", () => {
    const headers = new Headers({ Authorization: "bearer abc.def" });
    const request = new Request("https://proxy.example", { headers });

    expect(extractBearerToken(request)).toBe("abc.def");
  });

  it("returns null when the Authorization header is not a bearer token", () => {
    const headers = new Headers({ Authorization: "Basic dXNlcjpwYXNz" });
    const request = new Request("https://proxy.example", { headers });

    expect(extractBearerToken(request)).toBeNull();
  });
});

describe("timingSafeEqualString and verifyAutomationKey", () => {
  it("timingSafeEqualString correctly identifies equal and unequal strings", async () => {
    expect(await timingSafeEqualString("secret-123", "secret-123")).toBe(true);
    expect(await timingSafeEqualString("secret-123", "secret-124")).toBe(false);
    expect(await timingSafeEqualString("secret-123", "secret-1234")).toBe(
      false,
    );
    expect(await timingSafeEqualString("", "")).toBe(true);
    expect(await timingSafeEqualString("", "a")).toBe(false);
  });

  it("verifyAutomationKey accepts valid key against single secret", async () => {
    expect(
      await verifyAutomationKey("agent-key-alpha", "agent-key-alpha"),
    ).toBe(true);
    expect(
      await verifyAutomationKey("agent-key-wrong", "agent-key-alpha"),
    ).toBe(false);
  });

  it("verifyAutomationKey supports comma-separated keys for seamless rotation", async () => {
    const config = "key-v2-active, key-v1-deprecating";
    expect(await verifyAutomationKey("key-v2-active", config)).toBe(true);
    expect(await verifyAutomationKey("key-v1-deprecating", config)).toBe(true);
    expect(await verifyAutomationKey("key-v0-revoked", config)).toBe(false);
  });

  it("verifyAutomationKey handles empty or missing values safely", async () => {
    expect(await verifyAutomationKey(null, "some-key")).toBe(false);
    expect(await verifyAutomationKey("some-key", null)).toBe(false);
    expect(await verifyAutomationKey("", "some-key")).toBe(false);
    expect(await verifyAutomationKey("some-key", "")).toBe(false);
    expect(await verifyAutomationKey("   ", "some-key")).toBe(false);
  });
});

describe("POST /api/session", () => {
  it("issues a token when Turnstile verification passes", async () => {
    const request = makeRequest({
      ip: "9.9.9.9",
      body: { turnstileToken: "dev-turnstile-token" },
    });

    // No TURNSTILE_SECRET_KEY: verifyTurnstile accepts the dev token.
    const response = await handleSessionRequest(
      request,
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
    );
    const body = (await response.json()) as {
      token: string;
      expiresAt: number;
      scope: string;
    };

    expect(response.status).toBe(200);
    expect(await verifySessionToken(SECRET, body.token)).toMatchObject({
      valid: true,
    });
    expect(body.expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(body.scope).toBe("human");
  });

  it("issues an automation token when a valid X-Codex-Automation-Key is provided", async () => {
    const request = makeRequest({
      ip: "9.9.9.9",
      headers: { "X-Codex-Automation-Key": "my-automation-secret" },
    });

    const response = await handleSessionRequest(
      request,
      {
        SESSION_TOKEN_SECRET: SECRET,
        CODEX_AUTOMATION_KEY: "my-automation-secret",
      },
      CORS,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      token: string;
      expiresAt: number;
      scope: string;
    };
    expect(body.scope).toBe("automation");

    const verified = await verifySessionToken(SECRET, body.token);
    expect(verified.valid).toBe(true);
    if (verified.valid) {
      expect(verified.payload.scope).toBe("automation");
      expect(verified.payload.ip).toBe("9.9.9.9");
    }
  });

  it("rejects an invalid X-Codex-Automation-Key with 401 AUTOMATION_KEY_INVALID", async () => {
    const request = makeRequest({
      headers: { "X-Codex-Automation-Key": "wrong-secret" },
    });

    const response = await handleSessionRequest(
      request,
      {
        SESSION_TOKEN_SECRET: SECRET,
        CODEX_AUTOMATION_KEY: "my-automation-secret",
      },
      CORS,
    );

    expect(response.status).toBe(401);
    expect((await response.json()) as any).toMatchObject({
      error: { code: "AUTOMATION_KEY_INVALID" },
    });
  });

  it("returns 503 when X-Codex-Automation-Key is sent but CODEX_AUTOMATION_KEY is not configured", async () => {
    const request = makeRequest({
      headers: { "X-Codex-Automation-Key": "my-automation-secret" },
    });

    const response = await handleSessionRequest(
      request,
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
    );

    expect(response.status).toBe(503);
    expect((await response.json()) as any).toMatchObject({
      error: { code: "AUTOMATION_NOT_CONFIGURED" },
    });
  });

  it("binds the issued token to the requesting IP", async () => {
    const request = makeRequest({
      ip: "9.9.9.9",
      body: { turnstileToken: "dev-turnstile-token" },
    });

    const response = await handleSessionRequest(
      request,
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
    );
    const { token } = (await response.json()) as { token: string };
    const result = await verifySessionToken(SECRET, token);

    expect(result.valid && result.payload.ip).toBe("9.9.9.9");
  });

  it("refuses to issue a token when Turnstile fails", async () => {
    const request = makeRequest({
      body: { turnstileToken: "wrong-token" },
    });

    const response = await handleSessionRequest(
      request,
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
    );

    expect(response.status).toBe(403);
    expect((await response.json()) as any).toMatchObject({
      error: { code: "TURNSTILE_INVALID" },
    });
  });

  it("reports a configuration error rather than issuing an unsigned token", async () => {
    const request = makeRequest({
      body: { turnstileToken: "dev-turnstile-token" },
    });

    const response = await handleSessionRequest(request, {}, CORS);

    expect(response.status).toBe(503);
    expect((await response.json()) as any).toMatchObject({
      error: { code: "SESSION_NOT_CONFIGURED" },
    });
  });

  it("rejects non-POST methods", async () => {
    const response = await handleSessionRequest(
      makeRequest({ method: "GET" }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
    );

    expect(response.status).toBe(405);
  });
});

describe("LLM session guard", () => {
  it("lets a valid human token through when origin is allowed", async () => {
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "human",
    );

    const response = await enforceLlmSession(
      makeRequest({ token, ip: "1.2.3.4" }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      true,
    );

    expect(response).toBeNull();
  });

  it("blocks a human token when origin is not allowed", async () => {
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "human",
    );

    const response = await enforceLlmSession(
      makeRequest({ token, ip: "1.2.3.4" }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      false,
    );

    expect(response?.status).toBe(403);
    expect((await response!.json()) as any).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("lets an automation token through EVEN WHEN origin is not allowed", async () => {
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "automation",
    );

    const response = await enforceLlmSession(
      makeRequest({ token, ip: "1.2.3.4" }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      false,
    );

    expect(response).toBeNull();
  });

  it("rejects a request with no token", async () => {
    const response = await enforceLlmSession(
      makeRequest({}),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      true,
    );

    expect(response?.status).toBe(401);
    expect((await response!.json()) as any).toMatchObject({
      error: { code: "SESSION_TOKEN_MISSING" },
    });
  });

  it("returns SESSION_TOKEN_EXPIRED so the client refreshes instead of erroring", async () => {
    const { token } = await mintSessionToken(SECRET, "1.2.3.4", 1_000_000, 60);
    vi.spyOn(Date, "now").mockReturnValue(1_000_061_000);

    const response = await enforceLlmSession(
      makeRequest({ token }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      true,
    );

    expect(response?.status).toBe(401);
    expect((await response!.json()) as any).toMatchObject({
      error: { code: "SESSION_TOKEN_EXPIRED" },
    });
  });

  it("fails open while no signing secret is configured (if origin is allowed)", async () => {
    const response = await enforceLlmSession(makeRequest({}), {}, CORS, true);

    expect(response).toBeNull();
  });

  it("blocks unallowed origin when no signing secret is configured", async () => {
    const response = await enforceLlmSession(makeRequest({}), {}, CORS, false);

    expect(response?.status).toBe(403);
  });

  describe("IP anomalies", () => {
    let logs: string[];

    beforeEach(() => {
      logs = [];
      vi.spyOn(console, "log").mockImplementation((msg) => {
        logs.push(String(msg));
      });
    });

    it("allows a token used from a new IP, but logs it", async () => {
      const { token } = await mintSessionToken(SECRET, "1.2.3.4");

      const response = await enforceLlmSession(
        makeRequest({ token, ip: "5.6.7.8" }),
        { SESSION_TOKEN_SECRET: SECRET },
        CORS,
        true,
      );

      expect(response).toBeNull();
      expect(logs.some((l) => l.includes("Session IP changed"))).toBe(true);
    });

    it("stays quiet when the IP is unchanged", async () => {
      const { token } = await mintSessionToken(SECRET, "1.2.3.4");

      await enforceLlmSession(
        makeRequest({ token, ip: "1.2.3.4" }),
        { SESSION_TOKEN_SECRET: SECRET },
        CORS,
        true,
      );

      expect(logs.some((l) => l.includes("Session IP changed"))).toBe(false);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

describe("LLM rate limiting", () => {
  it("keys the limiters by token id, not by IP, for human tokens", async () => {
    const keys: string[] = [];
    const limiter = {
      limit: async ({ key }: { key: string }) => {
        keys.push(key);
        return { success: true };
      },
    };
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "human",
    );
    const jti = await verifySessionToken(SECRET, token);

    await enforceLlmSession(
      makeRequest({ token, ip: "1.2.3.4" }),
      { SESSION_TOKEN_SECRET: SECRET, LLM_BURST_RATE_LIMITER: limiter },
      CORS,
      true,
    );

    expect(jti.valid).toBe(true);
    expect(keys).toEqual([`session:${jti.valid && jti.payload.jti}`]);
  });

  it("keys the limiters with automation prefix and dedicated limiter for automation tokens", async () => {
    const keys: string[] = [];
    const autoLimiter = {
      limit: async ({ key }: { key: string }) => {
        keys.push(key);
        return { success: true };
      },
    };
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "automation",
    );
    const jti = await verifySessionToken(SECRET, token);

    await enforceLlmSession(
      makeRequest({ token, ip: "1.2.3.4" }),
      {
        SESSION_TOKEN_SECRET: SECRET,
        LLM_AUTOMATION_RATE_LIMITER: autoLimiter,
      },
      CORS,
      false,
    );

    expect(jti.valid).toBe(true);
    expect(keys).toEqual([`automation:${jti.valid && jti.payload.jti}`]);
  });

  it("throttles automation overage with a typed 429", async () => {
    const limiter = makeLimiter(2);
    const { token } = await mintSessionToken(
      SECRET,
      "1.2.3.4",
      undefined,
      undefined,
      "automation",
    );
    const env = {
      SESSION_TOKEN_SECRET: SECRET,
      LLM_AUTOMATION_RATE_LIMITER: limiter,
    };

    const r1 = await enforceLlmSession(
      makeRequest({ token }),
      env,
      CORS,
      false,
    );
    const r2 = await enforceLlmSession(
      makeRequest({ token }),
      env,
      CORS,
      false,
    );
    const r3 = await enforceLlmSession(
      makeRequest({ token }),
      env,
      CORS,
      false,
    );

    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(r3?.status).toBe(429);
    expect((await r3!.json()) as any).toMatchObject({
      error: { code: "RATE_LIMITED" },
    });
  });

  it("does not throttle traffic that stays under the caps", async () => {
    const burst = makeLimiter();
    const sustained = makeLimiter();
    const { token } = await mintSessionToken(SECRET, "1.2.3.4");
    const env = {
      SESSION_TOKEN_SECRET: SECRET,
      LLM_BURST_RATE_LIMITER: burst,
      LLM_GENERATION_RATE_LIMITER: sustained,
    };

    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        enforceLlmSession(makeRequest({ token }), env, CORS, true),
      ),
    );

    expect(responses.every((r) => r === null)).toBe(true);
  });

  it("throttles sustained overage with a typed 429", async () => {
    const burst = makeLimiter(3);
    const { token } = await mintSessionToken(SECRET, "1.2.3.4");
    const env = { SESSION_TOKEN_SECRET: SECRET, LLM_BURST_RATE_LIMITER: burst };

    const results: (Response | null)[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(
        await enforceLlmSession(makeRequest({ token }), env, CORS, true),
      );
    }

    const throttled = results.filter((r) => r?.status === 429);
    expect(throttled.length).toBeGreaterThan(5);
    expect((await throttled[0]!.json()) as any).toMatchObject({
      error: { code: "RATE_LIMITED" },
    });
  });

  it("applies the sustained limiter even when the burst limiter passes", async () => {
    const burst = makeLimiter();
    const sustained = makeLimiter(0);
    const { token } = await mintSessionToken(SECRET, "1.2.3.4");

    const response = await enforceLlmSession(
      makeRequest({ token }),
      {
        SESSION_TOKEN_SECRET: SECRET,
        LLM_BURST_RATE_LIMITER: burst,
        LLM_GENERATION_RATE_LIMITER: sustained,
      },
      CORS,
      true,
    );

    expect(response?.status).toBe(429);
  });

  it("allows requests through when no limiter binding is present", async () => {
    const { token } = await mintSessionToken(SECRET, "1.2.3.4");

    const response = await enforceLlmSession(
      makeRequest({ token }),
      { SESSION_TOKEN_SECRET: SECRET },
      CORS,
      true,
    );

    expect(response).toBeNull();
  });
});
