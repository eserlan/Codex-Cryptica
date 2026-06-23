import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { DEFAULT_CF_IMAGE_MODEL } from "../../../../packages/oracle-engine/src/image-defaults";
import worker, { isOriginAllowed } from "./index";

describe("Oracle Proxy Worker CORS", () => {
  const emptyEnv = { GEMINI_API_KEY: "test-key" };

  it("allows the production origins", () => {
    expect(
      isOriginAllowed("https://codex-cryptica.com", emptyEnv),
    ).toBeTruthy();
    expect(isOriginAllowed("https://codexcryptica.com", emptyEnv)).toBeTruthy();
    expect(
      isOriginAllowed("https://staging.codex-cryptica.com", emptyEnv),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://staging.codexcryptica.com", emptyEnv),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://codex-cryptica.pages.dev", emptyEnv),
    ).toBeTruthy();
  });

  it("allows Cloudflare Pages preview subdomains for this project", () => {
    expect(
      isOriginAllowed(
        "https://feature-branch.codex-cryptica.pages.dev",
        emptyEnv,
      ),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://staging.codex-cryptica.pages.dev", emptyEnv),
    ).toBeTruthy();
  });

  it("allows any localhost or loopback dev origin", () => {
    expect(isOriginAllowed("http://localhost:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://localhost:5173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:4173", emptyEnv)).toBeTruthy();
    expect(isOriginAllowed("http://127.0.0.1:9999", emptyEnv)).toBeTruthy();
  });

  it("allows the Turnstile token header during publish preflight", async () => {
    const response = await worker.fetch(
      new Request(
        "https://oracle-proxy.espen-erlandsen.workers.dev/api/publish-vault",
        {
          method: "OPTIONS",
          headers: {
            Origin: "https://staging.codexcryptica.com",
            "Access-Control-Request-Headers": "content-type,x-turnstile-token",
          },
        },
      ),
      emptyEnv,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Turnstile-Token",
    );
  });

  it("treats ALLOWED_ORIGINS as an exact allowlist", () => {
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com,http://localhost:4173",
      }),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://codex-cryptica.com", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
    expect(
      isOriginAllowed("http://localhost:4173", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
    expect(
      isOriginAllowed("https://feature-branch.codex-cryptica.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
      }),
    ).toBeFalsy();
  });

  it("can explicitly allow Cloudflare Pages previews with a strict allowlist", () => {
    expect(
      isOriginAllowed("https://feature-branch.codex-cryptica.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
        ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: "true",
      }),
    ).toBeTruthy();
    expect(
      isOriginAllowed("https://feature-branch.evil.pages.dev", {
        GEMINI_API_KEY: "test-key",
        ALLOWED_ORIGINS: "https://example.com",
        ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS: "true",
      }),
    ).toBeFalsy();
  });

  it("rejects non-loopback origins that are not allowlisted", () => {
    expect(isOriginAllowed("https://evil.com", emptyEnv)).toBeFalsy();
    expect(
      isOriginAllowed("https://feature-branch.evil.pages.dev", emptyEnv),
    ).toBeFalsy();
    expect(isOriginAllowed("http://192.168.0.15:4173", emptyEnv)).toBeFalsy();
    expect(isOriginAllowed("file://localhost", emptyEnv)).toBeFalsy();
  });
});

describe("Oracle Proxy Worker image generation", () => {
  beforeEach(() => {
    (globalThis as any).caches = {
      default: {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
      },
    };
  });

  const request = (body: Record<string, unknown>) =>
    new Request(
      "https://oracle-proxy.espen-erlandsen.workers.dev/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://codex-cryptica.com",
        },
        body: JSON.stringify(body),
      },
    );

  it("uses the shared Cloudflare image model when no model is provided", async () => {
    const ai = {
      run: vi.fn(async () => ({ image: "base64-image" })),
    };

    const response = await worker.fetch(
      request({ prompt: "castle at sunset" }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      result: { image: "base64-image" },
    });
    expect(ai.run).toHaveBeenCalledWith(
      DEFAULT_CF_IMAGE_MODEL,
      expect.objectContaining({
        multipart: expect.objectContaining({
          body: expect.any(Object),
          contentType: expect.stringContaining("multipart/form-data"),
        }),
      }),
    );
  });

  it("uses the requested Cloudflare image model when one is provided", async () => {
    const ai = {
      run: vi.fn(async () => ({ image: "base64-image" })),
    };
    const model = "@cf/example/custom-image-model";

    const response = await worker.fetch(
      request({ prompt: "castle at sunset", model }),
      { GEMINI_API_KEY: "test-key", AI: ai },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(ai.run).toHaveBeenCalledWith(
      model,
      expect.objectContaining({
        multipart: expect.objectContaining({
          body: expect.any(Object),
          contentType: expect.stringContaining("multipart/form-data"),
        }),
      }),
    );
  });
});

describe("Oracle Proxy Worker Interactions API", () => {
  const env = { GEMINI_API_KEY: "test-key" };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const request = (body: Record<string, unknown>) =>
    new Request("https://oracle-proxy.espen-erlandsen.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://codex-cryptica.com",
      },
      body: JSON.stringify(body),
    });

  it("forwards an interaction and returns id + extracted text", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "v1_abc",
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [{ type: "text", text: "The crone speaks." }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      request({
        input: "Tell me about the crone",
        model: "gemini-3-flash-preview",
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "v1_abc", text: "The crone speaks." }),
    );

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(calledUrl)).toContain("/v1beta/interactions");
    const sent = JSON.parse(init.body as string);
    expect(sent.input).toBe("Tell me about the crone");
    expect(sent.store).toBe(true);
  });

  it("threads previous_interaction_id through to the upstream", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "v1_two", steps: [] }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await worker.fetch(
      request({ input: "and then?", previous_interaction_id: "v1_abc" }),
      env,
      {} as ExecutionContext,
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const sent = JSON.parse(init.body as string);
    expect(sent.previous_interaction_id).toBe("v1_abc");
  });

  it("maps an expired previous_interaction_id to a 409 INTERACTION_NOT_FOUND", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: "previous_interaction_id not found" },
          }),
          { status: 404 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      request({ input: "continue", previous_interaction_id: "expired" }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERACTION_NOT_FOUND" }),
      }),
    );
  });
});
